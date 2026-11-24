<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Models\Vehicle;
use App\Support\OsPresenter;
use App\Support\Plate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class VehicleController extends Controller
{
    private function validated(Request $request, ?Vehicle $vehicle = null): array
    {
        $data = $request->validate([
            'plate' => ['required', 'string', 'max:10'],
            'brand' => ['nullable', 'string', 'max:60'],
            'model' => ['nullable', 'string', 'max:60'],
            'year' => ['nullable', 'string', 'max:9'],
            'engine' => ['nullable', 'string', 'max:30'],
            'color' => ['nullable', 'string', 'max:30'],
            'km' => ['nullable', 'integer', 'min:0'],
        ], ['plate.required' => 'Informe a placa.']);

        $exists = Vehicle::where('plate', Plate::normalize($data['plate']))
            ->when($vehicle, fn ($q) => $q->where('id', '!=', $vehicle->id))->exists();
        if ($exists) {
            throw ValidationException::withMessages(['plate' => 'Já existe um veículo com esta placa.']);
        }

        return $data;
    }

    public function store(Request $request): RedirectResponse
    {
        $clientId = $request->validate(['client_id' => ['required', 'exists:clients,id']])['client_id'];
        Vehicle::create([...$this->validated($request), 'client_id' => $clientId]);

        return back()->with('success', 'Veículo cadastrado.');
    }

    public function update(Request $request, Vehicle $vehicle): RedirectResponse
    {
        $vehicle->update($this->validated($request, $vehicle));

        return back()->with('success', 'Veículo atualizado.');
    }

    /** Ficha do veículo com linha do tempo. Mecânico vê sem dados do dono. */
    public function show(Request $request, Vehicle $vehicle): Response
    {
        $user = $request->user();
        $orders = ServiceOrder::with(['items', 'mechanic', 'client', 'vehicle'])
            ->where('vehicle_id', $vehicle->id)->latest('id')->get();

        return Inertia::render('veiculos/show', [
            'vehicle' => OsPresenter::vehicle($vehicle),
            'client' => OsPresenter::client($vehicle->client, $user),
            'timeline' => $orders->map(fn ($os) => [
                ...OsPresenter::card($os, $user),
                'date' => ($os->delivered_at ?? $os->created_at)?->toIso8601String(),
                'diagnosis' => $os->diagnosis,
                'items' => $os->items->map(fn ($i) => [
                    'type' => $i->type,
                    'description' => $i->description,
                    'quantity' => $i->quantity,
                ]),
            ]),
        ]);
    }

    /** Busca rápida por placa: usada no topo e na Nova OS. */
    public function lookup(Request $request): JsonResponse
    {
        $user = $request->user();
        $plate = Plate::normalize($request->string('placa')->toString());
        if (strlen($plate) < 3) {
            return response()->json(['exact' => null, 'matches' => []]);
        }

        $vehicles = Vehicle::with('client')->where('plate', 'like', "%{$plate}%")->orderBy('plate')->limit(8)->get();

        return response()->json([
            'exact' => $vehicles->firstWhere('plate', $plate)?->id,
            'matches' => $vehicles->map(fn ($v) => [
                ...OsPresenter::vehicle($v),
                'client' => OsPresenter::client($v->client, $user),
            ]),
        ]);
    }
}
