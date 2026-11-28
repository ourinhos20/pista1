<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Support\OsPresenter;
use App\Support\Plate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim($request->string('q')->toString());
        $query = Client::with('vehicles:id,client_id,plate,brand,model,year')->withCount('serviceOrders')->orderBy('name');

        if ($q !== '') {
            $plate = Plate::normalize($q);
            $digits = Plate::digits($q);
            $query->where(function ($w) use ($q, $plate, $digits) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhereHas('vehicles', fn ($v) => $v->where('plate', 'like', "%{$plate}%"));
                if ($digits) {
                    $w->orWhere('document', 'like', "%{$digits}%")->orWhere('phone', 'like', "%{$digits}%");
                }
            });
        }

        return Inertia::render('clientes/index', [
            'clients' => $query->limit(100)->get(),
            'filters' => ['q' => $q],
        ]);
    }

    /** Nova OS: acha o cliente já cadastrado por nome, CPF/CNPJ, telefone ou placa. */
    public function lookup(Request $request): \Illuminate\Http\JsonResponse
    {
        $q = trim($request->string('q')->toString());
        if (mb_strlen($q) < 3) {
            return response()->json([]);
        }
        $digits = Plate::digits($q);
        $plate = Plate::normalize($q);

        $clients = Client::with('vehicles')
            ->where(function ($w) use ($q, $digits, $plate) {
                $w->where('name', 'like', "%{$q}%")
                    ->orWhereHas('vehicles', fn ($v) => $v->where('plate', 'like', "%{$plate}%"));
                if ($digits && strlen($digits) >= 4) {
                    $w->orWhere('document', 'like', "%{$digits}%")->orWhere('phone', 'like', "%{$digits}%");
                }
            })
            ->orderBy('name')->limit(8)->get();

        return response()->json($clients->map(fn (Client $c) => [
            'id' => $c->id,
            'name' => $c->name,
            'phone' => $c->phone,
            'document' => $c->document,
            'vehicles' => $c->vehicles->map(fn ($v) => ['id' => $v->id, 'plate' => $v->plate, 'title' => $v->title() ?: 'Veículo']),
        ]));
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'document' => ['nullable', 'string', 'max:20'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ], ['name.required' => 'Informe o nome.']);

        $data['document'] = Plate::digits($data['document'] ?? null);
        $data['phone'] = Plate::digits($data['phone'] ?? null);

        return $data;
    }

    public function store(Request $request): RedirectResponse
    {
        $client = Client::create($this->validated($request));

        return to_route('clientes.show', $client)->with('success', 'Cliente cadastrado.');
    }

    public function show(Request $request, Client $client): Response
    {
        $user = $request->user();
        $client->load(['vehicles', 'serviceOrders' => fn ($q) => $q->with(['vehicle', 'items', 'mechanic', 'client'])->latest('id')]);

        return Inertia::render('clientes/show', [
            'client' => OsPresenter::client($client, $user),
            'vehicles' => $client->vehicles->map(fn ($v) => OsPresenter::vehicle($v)),
            'orders' => $client->serviceOrders->map(fn ($os) => OsPresenter::card($os, $user)),
        ]);
    }

    /** Exclui clientes marcados (e os carros deles). Quem já tem OS fica: o histórico não pode sumir. */
    public function destroyMany(Request $request): RedirectResponse
    {
        $ids = $request->validate(['ids' => ['required', 'array', 'min:1', 'max:200'], 'ids.*' => ['integer']])['ids'];
        $clients = Client::withCount('serviceOrders')->whereIn('id', $ids)->get();
        $kept = $clients->where('service_orders_count', '>', 0);
        $gone = $clients->where('service_orders_count', 0);
        $gone->each->delete();

        $msg = $gone->count() === 1 ? '1 cliente excluído.' : "{$gone->count()} clientes excluídos.";
        if ($kept->isNotEmpty()) {
            $msg .= ' Não excluí '.$kept->pluck('name')->implode(', ').': tem ordem de serviço (exclua as OS antes).';
        }

        return back()->with($kept->isNotEmpty() && $gone->isEmpty() ? 'error' : 'success', $msg);
    }

    public function update(Request $request, Client $client): RedirectResponse
    {
        $client->update($this->validated($request));

        return back()->with('success', 'Cliente atualizado.');
    }
}
