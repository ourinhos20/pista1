<?php

namespace App\Http\Controllers;

use App\Enums\OsStatus;
use App\Models\ServiceOrder;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Página pública do orçamento (link secreto enviado no WhatsApp).
 * Mostra só o necessário: primeiro nome, carro, itens, fotos e total.
 * O cliente aprova ou recusa e a decisão fica registrada na OS.
 */
class BudgetController extends Controller
{
    private function find(string $token): ServiceOrder
    {
        abort_unless(strlen($token) === 40, 404);

        return ServiceOrder::with(['client', 'vehicle', 'items', 'attachments' => fn ($q) => $q->where('show_to_client', true)])
            ->where('public_token', $token)->firstOrFail();
    }

    public function show(string $token): View
    {
        $os = $this->find($token);

        return view('orcamento', [
            'os' => $os,
            'token' => $token,
            'shop' => config('oficina'),
            'canDecide' => $os->status === OsStatus::Aprovacao,
            'firstName' => $os->client?->firstName(),
        ]);
    }

    public function decide(Request $request, string $token): RedirectResponse
    {
        $os = $this->find($token);

        if ($os->status !== OsStatus::Aprovacao) {
            return to_route('orcamento.show', $token)->with('info', 'Este orçamento não está aguardando aprovação.');
        }

        $data = $request->validate([
            'decision' => ['required', 'in:aprovar,recusar'],
            'name' => ['required', 'string', 'max:120'],
            'note' => ['nullable', 'string', 'max:500'],
            'agree' => ['required_if:decision,aprovar', 'accepted_if:decision,aprovar'],
        ], [
            'name.required' => 'Digite seu nome para registrar a decisão.',
            'agree.required_if' => 'Marque que leu e concorda com o orçamento.',
            'agree.accepted_if' => 'Marque que leu e concorda com o orçamento.',
        ]);

        $common = ['approval_name' => $data['name'], 'approval_note' => $data['note'] ?? null, 'approval_ip' => $request->ip()];

        if ($data['decision'] === 'aprovar') {
            $os->update([...$common, 'status' => OsStatus::Execucao, 'approved_at' => now(), 'rejected_at' => null]);
            $os->logEvent(null, "Cliente APROVOU o orçamento pelo link ({$data['name']})".(! empty($data['note']) ? ": {$data['note']}" : ''));
        } else {
            // volta para o balcão ajustar e reenviar
            $os->update([...$common, 'status' => OsStatus::Orcamento, 'rejected_at' => now()]);
            $os->logEvent(null, "Cliente NÃO aprovou o orçamento ({$data['name']})".(! empty($data['note']) ? ": {$data['note']}" : ''));
        }

        return to_route('orcamento.show', $token);
    }
}
