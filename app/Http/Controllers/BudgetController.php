<?php

namespace App\Http\Controllers;

use App\Enums\OsStatus;
use App\Models\ServiceOrder;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Página pública do orçamento (link secreto enviado no WhatsApp).
 * Mostra só o necessário: primeiro nome, carro, itens, fotos e total.
 * O cliente aprova ITEM POR ITEM. Também serve para o orçamento complementar
 * (item encontrado durante o serviço), sem parar o que já foi aprovado.
 */
class BudgetController extends Controller
{
    private function find(string $token): ServiceOrder
    {
        abort_unless(strlen($token) === 40, 404);

        return ServiceOrder::with(['client', 'vehicle', 'items', 'attachments' => fn ($q) => $q->where('show_to_client', true)])
            ->where('public_token', $token)->firstOrFail();
    }

    /** Itens que o cliente pode decidir agora (orçamento inteiro ou só os complementares). */
    private function decidable(ServiceOrder $os)
    {
        if ($os->status === OsStatus::Aprovacao) {
            return $os->items->filter(fn ($i) => $i->approval === null && $i->unit_price > 0);
        }
        if (in_array($os->status, [OsStatus::Pecas, OsStatus::Execucao], true)) {
            return $os->pendingExtras()->filter(fn ($i) => $i->unit_price > 0);
        }

        return collect();
    }

    public function show(string $token): View
    {
        $os = $this->find($token);
        $decidable = $this->decidable($os);

        return view('orcamento', [
            'os' => $os,
            'token' => $token,
            'shop' => config('oficina'),
            'decidable' => $decidable->pluck('id')->all(),
            'isComplement' => $decidable->isNotEmpty() && $os->status !== OsStatus::Aprovacao,
            'canDecide' => $decidable->isNotEmpty(),
            'firstName' => $os->client?->firstName(),
        ]);
    }

    public function decide(Request $request, string $token): RedirectResponse
    {
        $os = $this->find($token);
        $decidable = $this->decidable($os);

        if ($decidable->isEmpty()) {
            return to_route('orcamento.show', $token)->with('info', 'Não há nada aguardando sua aprovação agora.');
        }

        $data = $request->validate([
            'decision' => ['required', 'in:aprovar,recusar'],
            'items' => ['array'],
            'items.*' => ['integer'],
            'name' => ['required', 'string', 'max:120'],
            'note' => ['nullable', 'string', 'max:500'],
            'agree' => ['required_if:decision,aprovar', 'accepted_if:decision,aprovar'],
        ], [
            'name.required' => 'Digite seu nome para registrar a decisão.',
            'agree.required_if' => 'Marque que leu e concorda com os itens escolhidos.',
            'agree.accepted_if' => 'Marque que leu e concorda com os itens escolhidos.',
        ]);

        $chosen = $data['decision'] === 'aprovar' ? collect($data['items'] ?? [])->map(fn ($v) => (int) $v)->all() : [];
        $approved = $decidable->filter(fn ($i) => in_array($i->id, $chosen, true));
        $declined = $decidable->reject(fn ($i) => in_array($i->id, $chosen, true));
        $complement = $os->status !== OsStatus::Aprovacao;
        $who = $data['name'].(! empty($data['note']) ? ": {$data['note']}" : '');

        DB::transaction(function () use ($os, $approved, $declined, $complement, $data, $request, $who) {
            foreach ($approved as $i) {
                $i->update(['approval' => 'aprovado']);
            }
            foreach ($declined as $i) {
                $i->update(['approval' => 'recusado']);
            }

            $common = ['approval_name' => $data['name'], 'approval_note' => $data['note'] ?? null, 'approval_ip' => $request->ip()];
            $list = fn ($c) => $c->pluck('description')->implode(', ');

            if ($complement) {
                // orçamento complementar: a OS continua onde está
                $os->update($common);
                $os->logEvent(null, 'Cliente respondeu o complemento pelo link ('.$who.')'
                    .($approved->isNotEmpty() ? ' · APROVOU: '.$list($approved) : '')
                    .($declined->isNotEmpty() ? ' · RECUSOU: '.$list($declined) : ''));
            } elseif ($approved->isNotEmpty()) {
                $os->update([...$common, 'status' => OsStatus::Execucao, 'approved_at' => now(), 'rejected_at' => null]);
                $os->logEvent(null, 'Cliente APROVOU pelo link ('.$who.'): '.$list($approved)
                    .($declined->isNotEmpty() ? ' · recusou: '.$list($declined) : ''));
            } else {
                // não aprovou nada: volta para o balcão (ajustar e reenviar, ou entregar com/sem taxa de diagnóstico)
                $os->update([...$common, 'status' => OsStatus::Orcamento, 'rejected_at' => now()]);
                $os->logEvent(null, 'Cliente NÃO aprovou nenhum item ('.$who.')');
            }
        });

        return to_route('orcamento.show', $token);
    }
}
