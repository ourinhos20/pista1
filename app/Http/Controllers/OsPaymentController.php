<?php

namespace App\Http\Controllers;

use App\Models\FinanceEntry;
use App\Models\ServiceOrder;
use App\Support\Finance;
use App\Support\Installments;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/**
 * Pagamentos de uma OS registrados pelo balcão. Cada pagamento vira uma entrada
 * no financeiro (categoria Serviços), recebida ou a receber (parcelas).
 */
class OsPaymentController extends Controller
{
    public function store(Request $request, ServiceOrder $os): RedirectResponse
    {
        $request->merge(['amount' => Finance::parseMoney($request->input('amount'))]);
        $d = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999'],
            'payment_method' => ['required', Rule::in(array_keys(Finance::METHODS))],
            'installments' => ['nullable', 'integer', 'between:1,24'],
            'date' => ['nullable', 'date'],
            'received' => ['boolean'],
        ], ['amount.gt' => 'Informe um valor maior que zero.'], ['amount' => 'valor', 'payment_method' => 'forma de pagamento']);

        $os->loadMissing(['client', 'vehicle']);
        $date = ! empty($d['date']) ? Carbon::parse($d['date']) : today();
        $count = (int) ($d['installments'] ?? 1);

        Installments::create(
            [
                'type' => 'entrada',
                'category' => 'servicos',
                'description' => "OS {$os->number()} · {$os->vehicle?->title()} {$os->vehicle?->plate}",
                'party' => $os->client?->name,
                'payment_method' => $d['payment_method'],
                'service_order_id' => $os->id,
                'created_by' => $request->user()->id,
            ],
            (float) $d['amount'],
            $date,
            $count,
            (bool) ($d['received'] ?? true),
            $date,
        );

        $os->logEvent($request->user(), 'Pagamento registrado: R$ '.number_format($d['amount'], 2, ',', '.').' ('.Finance::METHODS[$d['payment_method']].($count > 1 ? " em {$count}x" : '').')');

        return back()->with('success', 'Pagamento registrado.');
    }

    public function destroy(Request $request, ServiceOrder $os, FinanceEntry $entry): RedirectResponse
    {
        abort_unless($entry->service_order_id === $os->id, 404);
        $entry->delete();
        $os->logEvent($request->user(), 'Pagamento excluído: '.$entry->description);

        return back()->with('success', 'Pagamento excluído.');
    }
}
