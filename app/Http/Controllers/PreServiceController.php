<?php

namespace App\Http\Controllers;

use App\Models\PreService;
use App\Support\ImageStore;
use App\Support\Plate;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Pré-atendimento: o cliente descreve o problema no site (com fotos) e o
 * balcão confirma e transforma em OS.
 */
class PreServiceController extends Controller
{
    /* ---------------------------------------------------------- público */

    public function form(): View
    {
        return view('agendar', [
            'shop' => config('oficina'),
            // marca de tempo cifrada: formulário enviado rápido demais = robô
            'stamp' => Crypt::encryptString((string) now()->timestamp),
        ]);
    }

    public function submit(Request $request): RedirectResponse
    {
        // armadilhas contra robôs: campo invisível preenchido ou envio em menos de 3 s
        $sent = (int) rescue(fn () => Crypt::decryptString((string) $request->input('_t')), 0, false);
        if ($request->filled('website') || $sent === 0 || now()->timestamp - $sent < 3) {
            return to_route('agendar.ok');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'min:10', 'max:20'],
            'plate' => ['nullable', 'string', 'max:10'],
            'vehicle' => ['nullable', 'string', 'max:120'],
            'complaint' => ['required', 'string', 'min:5', 'max:3000'],
            'preferred_at' => ['nullable', 'date', 'after:now'],
            'photos' => ['nullable', 'array', 'max:4'],
            'photos.*' => ['file', 'image', 'max:15360'],
            'consent' => ['accepted'],
        ], [
            'complaint.required' => 'Conte o que está acontecendo com o carro.',
            'phone.min' => 'Informe o WhatsApp com DDD.',
            'preferred_at.after' => 'Escolha uma data futura.',
            'photos.max' => 'Envie no máximo 4 fotos.',
            'photos.*.image' => 'Envie apenas fotos (JPG ou PNG).',
            'consent.accepted' => 'Precisamos da sua autorização para entrar em contato.',
        ], [
            'name' => 'nome', 'phone' => 'WhatsApp', 'complaint' => 'descrição',
        ]);

        $digits = Plate::digits($data['phone']);
        if (! $digits || strlen($digits) < 10) {
            throw ValidationException::withMessages(['phone' => 'Informe o WhatsApp com DDD.']);
        }

        $pre = PreService::create([
            'name' => $data['name'],
            'phone' => $digits,
            'plate' => $data['plate'] ? Plate::normalize($data['plate']) : null,
            'vehicle' => $data['vehicle'] ?? null,
            'complaint' => $data['complaint'],
            'preferred_at' => $data['preferred_at'] ?? null,
            'ip' => $request->ip(),
        ]);

        foreach ($request->file('photos', []) as $file) {
            $pre->attachments()->create(ImageStore::store($file, 'pre'));
        }

        return to_route('agendar.ok');
    }

    public function thanks(): View
    {
        return view('agendar', ['shop' => config('oficina'), 'done' => true, 'stamp' => '']);
    }

    /* ----------------------------------------------------------- painel */

    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString() ?: 'novo';

        $rows = PreService::with(['attachments', 'serviceOrder:id', 'handler:id,name'])
            ->when($status !== 'todos', fn ($q) => $q->where('status', $status))
            ->latest('id')->limit(100)->get()
            ->map(fn (PreService $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'phone' => $p->phone,
                'plate' => $p->plate,
                'vehicle' => $p->vehicle,
                'complaint' => $p->complaint,
                'preferred_at' => $p->preferred_at?->toIso8601String(),
                'status' => $p->status,
                'service_order_id' => $p->service_order_id,
                'handled_by' => $p->handler?->name,
                'created_at' => $p->created_at->toIso8601String(),
                'photos' => $p->attachments->map->toRow()->values(),
            ]);

        return Inertia::render('pre-atendimentos/index', [
            'rows' => $rows,
            'filters' => ['status' => $status],
            'counts' => PreService::selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function discard(Request $request, PreService $pre): RedirectResponse
    {
        abort_unless($pre->status === 'novo', 422, 'Este pedido já foi tratado.');
        $pre->update(['status' => 'descartado', 'handled_by' => $request->user()->id]);

        return back()->with('success', 'Pedido descartado.');
    }

    public function restore(PreService $pre): RedirectResponse
    {
        abort_unless($pre->status === 'descartado', 422);
        $pre->update(['status' => 'novo', 'handled_by' => null]);

        return back()->with('success', 'Pedido voltou para a lista de novos.');
    }
}
