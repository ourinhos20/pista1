<?php

namespace App\Http\Controllers;

use App\Models\FinanceEntry;
use App\Models\Partner;
use App\Models\ServiceOrder;
use App\Enums\OsStatus;
use App\Models\PartnerMovement;
use App\Support\Finance;
use App\Support\Installments;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Financeiro da oficina (somente master). */
class FinanceController extends Controller
{
    private function month(Request $request): Carbon
    {
        $m = $request->string('mes')->toString();

        return preg_match('/^\d{4}-\d{2}$/', $m) ? Carbon::createFromFormat('Y-m-d', "$m-01")->startOfDay() : now()->startOfMonth();
    }

    /** Dados do formulário de lançamento (listas e OS que podem ser vinculadas). */
    private function options(): array
    {
        return [
            'categories' => Finance::CATEGORIES,
            'methods' => Finance::METHODS,
            'parties' => Finance::parties(),
            'orders' => Finance::ordersToReceive(),
            'partnerList' => Partner::where('active', true)->orderBy('id')->get(['id', 'name']),
        ];
    }

    public function dashboard(Request $request): Response
    {
        $start = $this->month($request);
        $end = $start->copy()->endOfMonth();
        $paidIn = fn (string $type) => FinanceEntry::where('type', $type)->whereBetween('paid_at', [$start->toDateString(), $end->toDateString()]);

        $entradas = (float) $paidIn('entrada')->sum('amount');
        $saidas = (float) $paidIn('saida')->sum('amount');
        $aportes = (float) PartnerMovement::where('type', 'aporte')->whereBetween('date', [$start, $end])->sum('amount');
        $retiradas = (float) PartnerMovement::where('type', 'retirada')->whereBetween('date', [$start, $end])->sum('amount');

        $open = fn (string $type) => FinanceEntry::where('type', $type)->whereNull('paid_at');

        $byCategory = $paidIn('saida')->selectRaw('category, sum(amount) as total')->groupBy('category')->orderByDesc('total')->get()
            ->map(fn ($r) => ['category' => Finance::allCategories()[$r->category] ?? $r->category, 'total' => round((float) $r->total, 2)]);
        $byMethod = $paidIn('entrada')->selectRaw('payment_method, sum(amount) as total')->groupBy('payment_method')->orderByDesc('total')->get()
            ->map(fn ($r) => ['method' => Finance::METHODS[$r->payment_method] ?? 'Não informado', 'total' => round((float) $r->total, 2)]);

        // últimos 6 meses (regime de caixa)
        $history = collect(range(5, 0))->map(function ($back) use ($start) {
            $s = $start->copy()->subMonthsNoOverflow($back);
            $e = $s->copy()->endOfMonth();
            $in = (float) FinanceEntry::where('type', 'entrada')->whereBetween('paid_at', [$s->toDateString(), $e->toDateString()])->sum('amount');
            $out = (float) FinanceEntry::where('type', 'saida')->whereBetween('paid_at', [$s->toDateString(), $e->toDateString()])->sum('amount');

            return ['month' => $s->format('Y-m'), 'in' => round($in, 2), 'out' => round($out, 2), 'result' => round($in - $out, 2)];
        });

        $upcoming = FinanceEntry::with('partnerMovement.partner')->whereNull('paid_at')->whereDate('due_date', '<=', today()->addDays(15))
            ->orderBy('due_date')->limit(15)->get()->map->toRow();

        return Inertia::render('financeiro/index', [
            'month' => $start->format('Y-m'),
            'summary' => [
                'cash' => Finance::cashBalance(),
                'in' => round($entradas, 2),
                'out' => round($saidas, 2),
                'result' => round($entradas - $saidas, 2),
                'aportes' => round($aportes, 2),
                'retiradas' => round($retiradas, 2),
                'receivable' => round((float) $open('entrada')->sum('amount'), 2),
                'receivable_overdue' => round((float) $open('entrada')->whereDate('due_date', '<', today())->sum('amount'), 2),
                'payable' => round((float) $open('saida')->sum('amount'), 2),
                'payable_overdue' => round((float) $open('saida')->whereDate('due_date', '<', today())->sum('amount'), 2),
            ],
            'byCategory' => $byCategory,
            'byMethod' => $byMethod,
            'history' => $history,
            'upcoming' => $upcoming,
            'partners' => Finance::partnerBalance(),
            // carro pronto/entregue sem o pagamento lançado: dinheiro que fica fora do caixa
            'toBill' => Finance::ordersToReceive([OsStatus::Pronto, OsStatus::Entregue]),
            ...$this->options(),
        ]);
    }

    public function entries(Request $request): Response
    {
        $start = $this->month($request);
        $end = $start->copy()->endOfMonth();
        $tipo = $request->string('tipo')->toString();
        $situacao = $request->string('situacao')->toString() ?: 'todos';
        $categoria = $request->string('categoria')->toString();
        $q = trim($request->string('q')->toString());

        $query = FinanceEntry::with('partnerMovement.partner')->orderBy('due_date')->orderBy('id');

        // contas em aberto/vencidas aparecem independentemente do mês
        if ($situacao === 'aberto') {
            $query->whereNull('paid_at');
        } elseif ($situacao === 'vencido') {
            $query->whereNull('paid_at')->whereDate('due_date', '<', today());
        } else {
            $query->where(function ($w) use ($start, $end) {
                $w->whereBetween('due_date', [$start->toDateString(), $end->toDateString()])
                    ->orWhereBetween('paid_at', [$start->toDateString(), $end->toDateString()]);
            });
            if ($situacao === 'pago') {
                $query->whereNotNull('paid_at');
            }
        }
        if (in_array($tipo, ['entrada', 'saida'], true)) {
            $query->where('type', $tipo);
        }
        if ($categoria !== '') {
            $query->where('category', $categoria);
        }
        if ($q !== '') {
            $query->where(fn ($w) => $w->where('description', 'like', "%{$q}%")->orWhere('party', 'like', "%{$q}%")
                ->when(ctype_digit($q), fn ($x) => $x->orWhere('service_order_id', (int) $q)));
        }

        $rows = $query->limit(500)->get();

        return Inertia::render('financeiro/lancamentos', [
            'entries' => $rows->map->toRow(),
            'totals' => [
                'in' => round((float) $rows->where('type', 'entrada')->sum('amount'), 2),
                'out' => round((float) $rows->where('type', 'saida')->sum('amount'), 2),
            ],
            'filters' => ['mes' => $start->format('Y-m'), 'tipo' => $tipo, 'situacao' => $situacao, 'categoria' => $categoria, 'q' => $q],
            ...$this->options(),
        ]);
    }

    private function validated(Request $request, bool $creating): array
    {
        $request->merge(['amount' => Finance::parseMoney($request->input('amount'))]);
        $type = $request->input('type');

        return $request->validate([
            'type' => ['required', Rule::in(['entrada', 'saida'])],
            'category' => ['required', Rule::in(Finance::categoryKeys((string) $type))],
            'description' => ['required', 'string', 'max:255'],
            'party' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999'],
            'due_date' => ['required', 'date'],
            'paid' => ['boolean'],
            'paid_at' => ['nullable', 'date'],
            'payment_method' => ['nullable', Rule::in(array_keys(Finance::METHODS))],
            'notes' => ['nullable', 'string', 'max:2000'],
            // receita de uma OS: o pagamento passa a aparecer na própria OS
            'service_order_id' => ['nullable', 'integer', Rule::exists('service_orders', 'id'), Rule::prohibitedIf($type !== 'entrada')],
            ...($creating ? [
                'installments' => ['nullable', 'integer', 'between:1,48'],
                // sócio que pagou/recebeu do próprio bolso (vira aporte/retirada dele)
                'partner_id' => ['nullable', Rule::exists('partners', 'id')->where('active', true)],
            ] : []),
        ], [
            'amount.gt' => 'Informe um valor maior que zero.',
            'category.in' => 'Escolha uma categoria válida.',
        ], ['description' => 'descrição', 'amount' => 'valor', 'due_date' => 'vencimento', 'category' => 'categoria']);
    }

    public function store(Request $request): RedirectResponse
    {
        $d = $this->validated($request, true);
        $paid = (bool) ($d['paid'] ?? false);

        $created = Installments::create(
            [
                'type' => $d['type'], 'category' => $d['category'], 'description' => $d['description'], 'party' => $d['party'] ?? null,
                'payment_method' => $d['payment_method'] ?? null, 'notes' => $d['notes'] ?? null, 'created_by' => $request->user()->id,
                'service_order_id' => $d['service_order_id'] ?? null,
            ],
            (float) $d['amount'],
            Carbon::parse($d['due_date']),
            (int) ($d['installments'] ?? 1),
            $paid,
            ! empty($d['paid_at']) ? Carbon::parse($d['paid_at']) : null,
        );

        // sócio pagou a despesa (ou recebeu do cliente) com o próprio dinheiro
        $first = $created[0];
        if (! empty($d['partner_id']) && $first->paid_at) {
            PartnerMovement::create([
                'partner_id' => $d['partner_id'],
                'finance_entry_id' => $first->id,
                'type' => $d['type'] === 'saida' ? 'aporte' : 'retirada',
                'amount' => $first->amount,
                'date' => $first->paid_at,
                'description' => ($d['type'] === 'saida' ? 'Pagou: ' : 'Recebeu: ').$first->description,
                'created_by' => $request->user()->id,
            ]);
        }

        if (! empty($d['service_order_id'])) {
            ServiceOrder::find($d['service_order_id'])?->logEvent($request->user(), 'Pagamento lançado pelo financeiro: R$ '.number_format((float) $d['amount'], 2, ',', '.'));
        }

        $what = $d['type'] === 'entrada' ? 'Entrada' : 'Despesa';

        return back()->with('success', count($created) > 1 ? "{$what} lançada em ".count($created).' parcelas.' : "{$what} lançada.");
    }

    public function update(Request $request, FinanceEntry $entry): RedirectResponse
    {
        $d = $this->validated($request, false);
        $paid = (bool) ($d['paid'] ?? false);

        $entry->update([
            ...collect($d)->except(['paid', 'paid_at'])->all(),
            'service_order_id' => $d['service_order_id'] ?? null,
            'paid_at' => $paid ? ($d['paid_at'] ?? $entry->paid_at?->toDateString() ?? today()->toDateString()) : null,
        ]);
        if (! $paid) {
            $entry->partnerMovement()->delete();
        } else {
            $entry->partnerMovement()->update(['amount' => $entry->amount, 'date' => $entry->paid_at]);
        }

        return back()->with('success', 'Lançamento alterado.');
    }

    /** Baixa: marca como pago/recebido. */
    public function pay(Request $request, FinanceEntry $entry): RedirectResponse
    {
        $d = $request->validate([
            'paid_at' => ['nullable', 'date'],
            'payment_method' => ['nullable', Rule::in(array_keys(Finance::METHODS))],
        ]);
        $entry->update([
            'paid_at' => $d['paid_at'] ?? today()->toDateString(),
            'payment_method' => $d['payment_method'] ?? $entry->payment_method,
        ]);

        return back()->with('success', $entry->type === 'entrada' ? 'Recebimento registrado.' : 'Pagamento registrado.');
    }

    public function unpay(FinanceEntry $entry): RedirectResponse
    {
        $entry->update(['paid_at' => null]);
        $entry->partnerMovement()->delete();

        return back()->with('success', 'Baixa estornada.');
    }

    public function destroy(FinanceEntry $entry): RedirectResponse
    {
        $entry->partnerMovement()->delete();
        $entry->delete();

        return back()->with('success', 'Lançamento excluído.');
    }
}
