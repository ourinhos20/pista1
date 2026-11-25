<?php

namespace App\Http\Controllers;

use App\Enums\OsStatus;
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
            ...($withPrice ? ['unit_price' => ['nullable', 'numeric', 'min:0', 'max:999999']] : []),
        ];
    }

    /**
     * Mecânico pode pedir peça/serviço (sem preço); balcão define valores.
     * Item incluído depois da aprovação (no meio do serviço) vira "complementar":
     * o cliente aprova só ele pelo link e o que já foi aprovado continua sem parar.
     */
    public function store(Request $request, ServiceOrder $os): RedirectResponse
    {
        $user = $request->user();
        ServiceOrderController::guard($os, $user);

        $data = $request->validate($this->rules($user->canSeeSensitive()), [
            'description.required' => 'Descreva a peça ou o serviço.',
        ]);
        $extra = in_array($os->status, [OsStatus::Pecas, OsStatus::Execucao, OsStatus::Pronto], true);
        $os->items()->create([...$data, 'extra' => $extra]);

        if ($user->isMechanic() || $extra) {
            $os->logEvent($user, ($extra ? 'Item complementar (precisa de aprovação do cliente): ' : 'Pediu: ').$data['description']);
        }

        return back()->with('success', $extra ? 'Item complementar incluído. O cliente precisa aprovar.' : 'Item adicionado.');
    }

    public function update(Request $request, ServiceOrder $os, ServiceOrderItem $item): RedirectResponse
    {
        abort_unless($item->service_order_id === $os->id, 404);
        $item->update($request->validate($this->rules(true)));

        return back()->with('success', 'Item atualizado.');
    }

    /** Balcão marca a decisão do cliente item por item (ex.: aprovou por telefone ou no balcão). */
    public function approval(Request $request, ServiceOrder $os, ServiceOrderItem $item): RedirectResponse
    {
        abort_unless($item->service_order_id === $os->id, 404);
        $data = $request->validate(['approval' => ['nullable', Rule::in(['aprovado', 'recusado'])]]);
        $item->update($data);

        $label = ['aprovado' => 'aprovado', 'recusado' => 'recusado'][$data['approval'] ?? ''] ?? 'pendente';
        $os->logEvent($request->user(), "Item \"{$item->description}\" marcado como {$label}");

        return back();
    }

    public function destroy(ServiceOrder $os, ServiceOrderItem $item): RedirectResponse
    {
        abort_unless($item->service_order_id === $os->id, 404);
        $item->delete();

        return back()->with('success', 'Item removido.');
    }
}
