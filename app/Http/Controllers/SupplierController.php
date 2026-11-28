<?php

namespace App\Http\Controllers;

use App\Models\FinanceEntry;
use App\Models\Supplier;
use Illuminate\Support\Carbon;
use App\Support\Plate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim($request->string('q')->toString());

        // quanto ainda se deve a cada fornecedor (contas das compras em aberto)
        $open = FinanceEntry::whereNull('finance_entries.paid_at')->join('purchases', 'purchases.id', '=', 'finance_entries.purchase_id')
            ->selectRaw('purchases.supplier_id, sum(finance_entries.amount) as total')->groupBy('purchases.supplier_id')->pluck('total', 'supplier_id');

        $rows = Supplier::withCount('purchases')->withSum('purchases', 'total')
            ->when($q !== '', fn ($w) => $w->where(fn ($x) => $x->where('name', 'like', "%{$q}%")->orWhere('contact', 'like', "%{$q}%")->orWhere('document', 'like', '%'.Plate::digits($q).'%')))
            ->orderByDesc('active')->orderBy('name')->limit(200)->get()
            ->map(fn (Supplier $s) => [
                ...$s->only(['id', 'name', 'document', 'phone', 'contact', 'email', 'notes', 'active']),
                'purchases_count' => $s->purchases_count,
                'purchases_total' => round((float) $s->purchases_sum_total, 2),
                'open_total' => round((float) ($open[$s->id] ?? 0), 2),
            ]);

        return Inertia::render('pecas/fornecedores', ['rows' => $rows, 'filters' => ['q' => $q]]);
    }

    /** Ficha do fornecedor: dados + histórico de compras filtrado por mês. */
    public function show(Request $request, Supplier $supplier): Response
    {
        $mes = $request->string('mes')->toString() ?: now()->format('Y-m');
        $all = $mes === 'todos';
        $start = $all ? null : (preg_match('/^\d{4}-\d{2}$/', $mes) ? Carbon::createFromFormat('Y-m-d', "$mes-01")->startOfDay() : now()->startOfMonth());

        $purchases = $supplier->purchases()->with(['supplier:id,name', 'items', 'entries'])
            ->when($start, fn ($q) => $q->whereBetween('date', [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()]))
            ->latest('date')->latest('id')->get()
            ->map->toRow();

        // em aberto com o fornecedor (todas as datas)
        $open = FinanceEntry::whereNull('paid_at')->whereIn('purchase_id', $supplier->purchases()->select('id'));

        // meses com compra, para facilitar a escolha
        $months = $supplier->purchases()->pluck('date')->map(fn ($d) => $d->format('Y-m'))->unique()->sortDesc()->values();

        return Inertia::render('pecas/fornecedor', [
            'supplier' => $supplier->only(['id', 'name', 'document', 'phone', 'contact', 'email', 'notes', 'active']),
            'purchases' => $purchases,
            'filters' => ['mes' => $all ? 'todos' : $start->format('Y-m')],
            'months' => $months,
            'summary' => [
                'period_total' => round($purchases->sum('total'), 2),
                'period_count' => $purchases->count(),
                'all_total' => round((float) $supplier->purchases()->sum('total'), 2),
                'open_total' => round((float) $open->sum('amount'), 2),
                'overdue_total' => round((float) (clone $open)->whereDate('due_date', '<', today())->sum('amount'), 2),
            ],
        ]);
    }

    private function validated(Request $request): array
    {
        $d = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'document' => ['nullable', 'string', 'max:20'],
            'phone' => ['nullable', 'string', 'max:20'],
            'contact' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'active' => ['boolean'],
        ], [], ['name' => 'nome', 'document' => 'CNPJ']);
        $d['document'] = Plate::digits($d['document'] ?? null);
        $d['phone'] = Plate::digits($d['phone'] ?? null);

        return $d;
    }

    public function store(Request $request): RedirectResponse
    {
        $s = Supplier::create($this->validated($request));

        return back()->with('success', "Fornecedor {$s->name} cadastrado.");
    }

    /** Exclui fornecedores marcados. Quem já tem compra fica (dá para desativar no cadastro). */
    public function destroyMany(Request $request): RedirectResponse
    {
        $ids = $request->validate(['ids' => ['required', 'array', 'min:1', 'max:200'], 'ids.*' => ['integer']])['ids'];
        $rows = Supplier::withCount('purchases')->whereIn('id', $ids)->get();
        $kept = $rows->where('purchases_count', '>', 0);
        $gone = $rows->where('purchases_count', 0);
        $gone->each->delete();

        $msg = $gone->count() === 1 ? '1 fornecedor excluído.' : "{$gone->count()} fornecedores excluídos.";
        if ($kept->isNotEmpty()) {
            $msg .= ' Não excluí '.$kept->pluck('name')->implode(', ').': tem compras registradas (desative no cadastro).';
        }

        return back()->with($kept->isNotEmpty() && $gone->isEmpty() ? 'error' : 'success', $msg);
    }

    public function update(Request $request, Supplier $supplier): RedirectResponse
    {
        $supplier->update($this->validated($request));

        return back()->with('success', 'Fornecedor alterado.');
    }
}
