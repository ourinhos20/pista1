<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Support\ImageStore;
use App\Support\OsIntake;
use App\Support\Plate;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Agendamento pelo site: o cliente informa só o básico e a OS já nasce "Agendada".
 * (Antes ia para uma fila separada que o balcão precisava converter — gargalo removido.)
 */
class AgendarController extends Controller
{
    public function form(): View
    {
        return view('agendar', [
            'shop' => config('oficina'),
            'types' => ServiceOrder::SERVICE_TYPES,
            // marcas do catálogo FIPE (comuns primeiro) para o cliente escolher
            'brands' => \Illuminate\Support\Facades\DB::table('vehicle_catalog_brands')->orderBy('rank')->orderBy('name')->get(['name', 'rank']),
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
            'brand' => ['nullable', 'string', 'max:60'],
            'vehicle' => ['nullable', 'string', 'max:120'],
            'color' => ['nullable', 'string', 'max:30'],
            'year' => ['nullable', 'string', 'max:9'],
            'service_type' => ['nullable', Rule::in(array_keys(ServiceOrder::SERVICE_TYPES))],
            'complaint' => ['required', 'string', 'min:5', 'max:3000'],
            'preferred_at' => ['nullable', 'date', 'after:now'],
            'photos' => ['nullable', 'array', 'max:4'],
            'photos.*' => ['file', 'image', 'max:15360'],
            'consent' => ['accepted'],
        ], [
            'complaint.required' => 'Conte o que está acontecendo ou qual serviço deseja.',
            'phone.min' => 'Informe o WhatsApp com DDD.',
            'preferred_at.after' => 'Escolha uma data futura.',
            'photos.max' => 'Envie no máximo 4 fotos.',
            'photos.*.image' => 'Envie apenas fotos (JPG ou PNG).',
            'consent.accepted' => 'Precisamos da sua autorização para entrar em contato.',
        ], ['name' => 'nome', 'phone' => 'WhatsApp', 'complaint' => 'descrição']);

        $digits = Plate::digits($data['phone']);
        if (! $digits || strlen($digits) < 10) {
            throw ValidationException::withMessages(['phone' => 'Informe o WhatsApp com DDD.']);
        }

        $os = OsIntake::create([
            'name' => $data['name'],
            'phone' => $digits,
            'plate' => $data['plate'] ?? null,
            'vehicle_model' => $data['vehicle'] ?? null,
            'vehicle_year' => $data['year'] ?? null,
            'vehicle_brand' => $data['brand'] ?? null,
            'vehicle_color' => $data['color'] ?? null,
            'service_type' => $data['service_type'] ?? null,
            'complaint' => $data['complaint'],
            'scheduled_at' => $data['preferred_at'] ?? null,
        ], 'site');

        foreach ($request->file('photos', []) as $file) {
            $os->attachments()->create([...ImageStore::store($file), 'caption' => 'Foto enviada pelo cliente', 'show_to_client' => false]);
        }

        return to_route('agendar.ok');
    }

    public function thanks(): View
    {
        return view('agendar', ['shop' => config('oficina'), 'done' => true, 'stamp' => '', 'types' => [], 'brands' => collect()]);
    }
}
