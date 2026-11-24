<?php

namespace App\Http\Controllers;

use App\Models\Part;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ServiceOrderItemController extends Controller
{
    private function rules(bool $withPrice): array
    {
        return [
            'type' => ['required', Rule::in(['servico', 'peca'])],
            'description' => ['required', 'string', 'max:255'],
            'quantity' => ['required', 'numeric', 'min:0.01', 'max:9999'],
            'part_id' => ['nullable', Rule::exists('parts', 'id')],
            ...($withPrice ? ['unit_price' => ['nullable', 'numeric', 'min:0', 'max:999999']] : []),
        ];
    }

    /** Peça escolhida do catálogo sem preço digitado: usa o preço de venda do catálogo. */
    private function withCatalogPrice(array $data): array
    {
        if (! empty($data['part_id']) && (! isset($data['unit_price']) || $data['unit_price'] === null || (float) $data['unit_price'] === 0.0)) {
            $data['unit_price'] = (float) Part::whereKey($data['part_id'])->value('sale_price');
        }

        return $data;
    }

    /** Mecânico pode pedir peça/serviço (sem preço); balcão define valores. */
    public function store(Request $request, ServiceOrder $os): RedirectResponse
    {
        $user = $request->user();
        ServiceOrderController::guard($os, $user);

        $data = $request->validate($this->rules($user->canSeeSensitive()), [
            'description.required' => 'Descreva a peça ou o serviço.',
        ]);
        $os->items()->create($this->withCatalogPrice($data));

        if ($user->isMechanic()) {
            $os->logEvent($user, 'Pediu: '.$data['description']);
        }

        return back()->with('success', 'Item adicionado.');
    }

    public function update(Request $request, ServiceOrder $os, ServiceOrderItem $item): RedirectResponse
    {
        abort_unless($item->service_order_id === $os->id, 404);
        $item->update($request->validate($this->rules(true)));

        return back()->with('success', 'Item atualizado.');
    }

    public function destroy(ServiceOrder $os, ServiceOrderItem $item): RedirectResponse
    {
        abort_unless($item->service_order_id === $os->id, 404);
        $item->delete();

        return back()->with('success', 'Item removido.');
    }
}
