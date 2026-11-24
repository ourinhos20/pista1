<?php

namespace App\Http\Controllers;

use App\Enums\OsStatus;
use App\Models\Client;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Models\Vehicle;
use App\Support\OsPresenter;
use App\Support\Plate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ServiceOrderController extends Controller
{
    /** Mecânico só acessa OS dele ou ainda sem mecânico (para poder assumir). */
    public static function guard(ServiceOrder $os, User $user): void
    {
        if ($user->isMechanic() && $os->mechanic_id && $os->mechanic_id !== $user->id) {
            abort(403, 'Esta OS está com outro mecânico.');
        }
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $status = $request->string('status')->toString();
        $q = trim($request->string('q')->toString());

        $query = ServiceOrder::with(['client', 'vehicle', 'mechanic', 'items'])->latest('id');

        if ($status === 'abertas' || $status === '') {
            $query->whereIn('status', OsStatus::open());
        } elseif ($status !== 'todas') {
            $query->where('status', $status);
        }

        if ($q !== '') {
            $plate = Plate::normalize($q);
            $query->where(function ($w) use ($q, $plate) {
                $w->whereHas('client', fn ($c) => $c->where('name', 'like', "%{$q}%"))
                    ->orWhereHas('vehicle', fn ($v) => $v->where('plate', 'like', "%{$plate}%")->orWhere('model', 'like', "%{$q}%"));
                if (ctype_digit($q)) {
                    $w->orWhere('id', (int) $q);
                }
            });
        }

        return Inertia::render('os/index', [
            'orders' => $query->limit(100)->get()->map(fn ($os) => OsPresenter::card($os, $user)),
            'filters' => ['status' => $status ?: 'abertas', 'q' => $q],
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('os/create', [
            'mechanics' => User::where('role', 'mecanico')->where('active', true)->orderBy('name')->get(['id', 'name']),
            'prefill' => $request->only(['placa', 'client_id']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'plate' => ['required', 'string', 'max:10'],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'client.name' => ['required_without:client_id', 'nullable', 'string', 'max:255'],
            'client.phone' => ['nullable', 'string', 'max:20'],
            'client.document' => ['nullable', 'string', 'max:20'],
            'vehicle.brand' => ['nullable', 'string', 'max:60'],
            'vehicle.model' => ['nullable', 'string', 'max:60'],
            'vehicle.year' => ['nullable', 'string', 'max:9'],
            'vehicle.color' => ['nullable', 'string', 'max:30'],
            'vehicle.engine' => ['nullable', 'string', 'max:30'],
            'km_in' => ['nullable', 'integer', 'min:0'],
            'fuel_level' => ['nullable', 'integer', 'between:0,4'],
            'scheduled_at' => ['nullable', 'date'],
            'complaint' => ['nullable', 'string', 'max:5000'],
            'mechanic_id' => ['nullable', Rule::exists('users', 'id')->where('role', 'mecanico')],
            'damages' => ['nullable', 'array', 'max:60'],
            'damages.*.x' => ['required', 'numeric', 'between:0,100'],
            'damages.*.y' => ['required', 'numeric', 'between:0,100'],
            'damages.*.type' => ['required', Rule::in(['risco', 'amassado', 'quebrado', 'falta'])],
            'damages.*.note' => ['nullable', 'string', 'max:120'],
            'checklist' => ['nullable', 'array'],
            'checklist.*' => ['boolean'],
        ], [
            'plate.required' => 'Informe a placa.',
            'client.name.required_without' => 'Informe o nome do cliente.',
        ]);

        $user = $request->user();

        $os = DB::transaction(function () use ($data, $user) {
            $plate = Plate::normalize($data['plate']);
            $vehicle = Vehicle::where('plate', $plate)->first();

            if (! $vehicle) {
                $clientId = $data['client_id'] ?? Client::create([
                    'name' => $data['client']['name'],
                    'phone' => Plate::digits($data['client']['phone'] ?? null),
                    'document' => Plate::digits($data['client']['document'] ?? null),
                ])->id;

                $vehicle = Vehicle::create([
                    'client_id' => $clientId,
                    'plate' => $plate,
                    ...array_filter($data['vehicle'] ?? [], fn ($v) => $v !== null && $v !== ''),
                ]);
            }

            if (! empty($data['km_in']) && $data['km_in'] > (int) $vehicle->km) {
                $vehicle->update(['km' => $data['km_in']]);
            }

            $os = ServiceOrder::create([
                'client_id' => $vehicle->client_id,
                'vehicle_id' => $vehicle->id,
                'mechanic_id' => $data['mechanic_id'] ?? null,
                'created_by' => $user->id,
                'status' => OsStatus::Aguardando,
                'scheduled_at' => $data['scheduled_at'] ?? null,
                'km_in' => $data['km_in'] ?? null,
                'fuel_level' => $data['fuel_level'] ?? null,
                'complaint' => $data['complaint'] ?? null,
                'damages' => $data['damages'] ?? [],
                'checklist' => $data['checklist'] ?? [],
            ]);
            $os->logEvent($user, 'OS aberta');

            return $os;
        });

        return to_route('os.show', $os)->with('success', "OS {$os->number()} aberta.");
    }

    public function show(Request $request, ServiceOrder $os): Response
    {
        $user = $request->user();
        self::guard($os, $user);

        $history = ServiceOrder::with('items')
            ->where('vehicle_id', $os->vehicle_id)->where('id', '!=', $os->id)
            ->latest('id')->limit(5)->get()
            ->map(fn ($h) => [
                'id' => $h->id,
                'number' => $h->number(),
                'status' => $h->status->value,
                'date' => ($h->delivered_at ?? $h->created_at)?->toIso8601String(),
                'km_in' => $h->km_in,
                'summary' => $h->items->pluck('description')->take(4)->implode(', ') ?: $h->complaint,
            ]);

        return Inertia::render('os/show', [
            'os' => OsPresenter::full($os, $user),
            'history' => $history,
            'mechanics' => $user->canSeeSensitive()
                ? User::where('role', 'mecanico')->where('active', true)->orderBy('name')->get(['id', 'name'])
                : [],
            'statuses' => OsStatus::options(),
        ]);
    }

    /** Edição geral (balcão/master). */
    public function update(Request $request, ServiceOrder $os): RedirectResponse
    {
        $data = $request->validate([
            'mechanic_id' => ['nullable', Rule::exists('users', 'id')->where('role', 'mecanico')],
            'scheduled_at' => ['nullable', 'date'],
            'km_in' => ['nullable', 'integer', 'min:0'],
            'fuel_level' => ['nullable', 'integer', 'between:0,4'],
            'complaint' => ['nullable', 'string', 'max:5000'],
            'diagnosis' => ['nullable', 'string', 'max:10000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'down_payment' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', Rule::in(['dinheiro', 'pix', 'debito', 'credito', 'parcelado'])],
        ]);

        $os->update($data);

        return back()->with('success', 'OS atualizada.');
    }

    /** Diagnóstico: mecânico e balcão. */
    public function diagnosis(Request $request, ServiceOrder $os): RedirectResponse
    {
        self::guard($os, $request->user());
        $data = $request->validate(['diagnosis' => ['nullable', 'string', 'max:10000']]);
        $os->update($data);

        return back()->with('success', 'Diagnóstico salvo.');
    }

    public function status(Request $request, ServiceOrder $os): RedirectResponse
    {
        $user = $request->user();
        self::guard($os, $user);

        $allowed = $user->isMechanic() ? OsStatus::mechanicAllowed() : OsStatus::cases();
        $data = $request->validate([
            'status' => ['required', Rule::in(array_map(fn ($s) => $s->value, $allowed))],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $new = OsStatus::from($data['status']);
        $os->status = $new;
        if ($new === OsStatus::Execucao && ! $os->approved_at) {
            $os->approved_at = now();
        }
        if ($new === OsStatus::Entregue) {
            $os->delivered_at = now();
        }
        // mecânico que mexe numa OS sem dono passa a ser o responsável
        if ($user->isMechanic() && ! $os->mechanic_id) {
            $os->mechanic_id = $user->id;
        }
        $os->save();
        $os->logEvent($user, $data['note'] ?? null);

        return back()->with('success', 'Status: '.$new->label());
    }

    public function assume(Request $request, ServiceOrder $os): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isMechanic(), 403);
        abort_if($os->mechanic_id && $os->mechanic_id !== $user->id, 403, 'Esta OS já tem mecânico.');

        $os->update(['mechanic_id' => $user->id]);
        $os->logEvent($user, 'Mecânico assumiu a OS');

        return back()->with('success', 'OS assumida.');
    }

    public function destroy(ServiceOrder $os): RedirectResponse
    {
        $os->delete();

        return to_route('os.index')->with('success', 'OS excluída.');
    }

    public function print(Request $request, ServiceOrder $os, string $tipo): Response
    {
        $user = $request->user();
        self::guard($os, $user);

        $mechanicTypes = ['diagnostico', 'revisao'];
        abort_unless(in_array($tipo, ['cliente', 'entrada', 'diagnostico', 'revisao'], true), 404);
        abort_if(! $user->canSeeSensitive() && ! in_array($tipo, $mechanicTypes, true), 403);

        return Inertia::render('print/'.$tipo, [
            'os' => OsPresenter::full($os, $user),
            'shop' => config('oficina'),
        ]);
    }
}
