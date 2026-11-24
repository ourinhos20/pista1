<?php

namespace App\Http\Controllers;

use App\Models\Part;
use App\Models\Purchase;
use App\Models\ServiceOrder;
use App\Models\Supplier;
use App\Support\Finance;
use App\Support\Installments;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Compras de peças (NF do fornecedor).
 * Gera automaticamente a conta a pagar no financeiro e, se vinculada a uma OS,
 * pode lançar as peças direto na OS.
 */
class PurchaseController extends Controller
{
    public function index(Request $request): Response
    {
        $m = $request->string('mes')->toString();
        $start = preg_match('/^\d{4}-\d{2}$/', $m) ? Carbon::createFromFormat('Y-m-d', "$m-01")->startOfDay() : now()->startOfMonth();
        $supplier = $request->integer('fornecedor');

        $rows = Purchase::with(['supplier:id,name', 'serviceOrder:id', 'items', 'entries'])
            ->whereBetween('date', [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()])
            ->when($supplier, fn ($q) => $q->where('supplier_id', $supplier))
            ->latest('date')->latest('id')->get()
            ->map(fn (Purchase $p) => [
                'id' => $p->id,
                'date' => $p->date->toDateString(),
                'invoice' => $p->invoice,
                'supplier' => $p->supplier?->name,
                'service_order_id' => $p->service_order_id,
                'os_number' => $p->service_order_id ? str_pad((string) $p->service_order_id, 5, '0', STR_PAD_LEFT) : null,
                'total' => $p->total,
                'notes' => $p->notes,
                'items' => $p->items->map(fn ($i) => $i->only(['description', 'quantity', 'unit_cost', 'part_id'])),
                'entries' => $p->entries->map(fn ($e) => ['amount' => $e->amount, 'due_date' => $e->due_date->toDateString(), 'paid_at' => $e->paid_at?->toDateString()]),
                'paid' => $p->entries->isNotEmpty() && $p->entries->every(fn ($e) => $e->paid_at !== null),
            ]);

        return Inertia::render('pecas/compras', [
            'rows' => $rows,
            'total' => round($rows->sum('total'), 2),
            'filters' => ['mes' => $start->format('Y-m'), 'fornecedor' => $supplier ?: ''],
            'suppliers' => Supplier::where('active', true)->orderBy('name')->get(['id', 'name']),
            'methods' => Finance::METHODS,
            'prefillOs' => $request->integer('os') ?: null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        // valores no formato brasileiro ("1.234,56")
        $items = collect($request->input('items', []))->map(fn ($i) => [
            ...$i,
            'quantity' => Finance::parseMoney($i['quantity'] ?? 0),
            'unit_cost' => Finance::parseMoney($i['unit_cost'] ?? 0),
            'sale_price' => isset($i['sale_price']) && $i['sale_price'] !== '' ? Finance::parseMoney($i['sale_price']) : null,
        ])->all();
        $request->merge(['items' => $items]);

        $d = $request->validate([
            'supplier_id' => ['required', Rule::exists('suppliers', 'id')],
            'invoice' => ['nullable', 'string', 'max:40'],
            'date' => ['required', 'date'],
            'service_order_id' => ['nullable', 'integer', Rule::exists('service_orders', 'id')],
            'add_to_os' => ['boolean'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1', 'max:60'],
            'items.*.part_id' => ['nullable', Rule::exists('parts', 'id')],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:9999'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0', 'max:999999'],
            'items.*.sale_price' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'items.*.save_part' => ['boolean'],
            'payment_method' => ['nullable', Rule::in(array_keys(Finance::METHODS))],
            'installments' => ['nullable', 'integer', 'between:1,24'],
            'first_due' => ['required', 'date'],
            'paid' => ['boolean'],
        ], [
            'items.required' => 'Inclua pelo menos uma peça.',
            'items.*.description.required' => 'Descreva a peça.',
            'items.*.quantity.gt' => 'Quantidade precisa ser maior que zero.',
        ], ['supplier_id' => 'fornecedor', 'first_due' => 'vencimento', 'date' => 'data']);

        $user = $request->user();

        $purchase = DB::transaction(function () use ($d, $user) {
            $supplier = Supplier::findOrFail($d['supplier_id']);
            $total = round(collect($d['items'])->sum(fn ($i) => $i['quantity'] * $i['unit_cost']), 2);

            $purchase = Purchase::create([
                'supplier_id' => $supplier->id,
                'service_order_id' => $d['service_order_id'] ?? null,
                'invoice' => $d['invoice'] ?? null,
                'date' => $d['date'],
                'total' => $total,
                'notes' => $d['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            $os = ! empty($d['service_order_id']) ? ServiceOrder::find($d['service_order_id']) : null;

            foreach ($d['items'] as $i) {
                $partId = $i['part_id'] ?? null;

                // peça nova pode ir para o catálogo; peça existente atualiza o último custo
                if (! $partId && ! empty($i['save_part'])) {
                    $partId = Part::create([
                        'description' => $i['description'],
                        'cost_price' => $i['unit_cost'],
                        'sale_price' => $i['sale_price'] ?? 0,
                        'supplier_id' => $supplier->id,
                    ])->id;
                } elseif ($partId) {
                    Part::whereKey($partId)->update(array_filter([
                        'cost_price' => $i['unit_cost'],
                        'sale_price' => $i['sale_price'] ?? null,
                    ], fn ($v) => $v !== null));
                }

                $purchase->items()->create([
                    'part_id' => $partId,
                    'description' => $i['description'],
                    'quantity' => $i['quantity'],
                    'unit_cost' => $i['unit_cost'],
                ]);

                // lança a peça na OS com o preço de venda (o balcão ajusta se quiser)
                if ($os && ! empty($d['add_to_os'])) {
                    $sale = $i['sale_price'] ?? ($partId ? (float) Part::find($partId)?->sale_price : 0);
                    $os->items()->create([
                        'part_id' => $partId,
                        'type' => 'peca',
                        'description' => $i['description'],
                        'quantity' => $i['quantity'],
                        'unit_price' => $sale ?: 0,
                    ]);
                }
            }

            if ($os) {
                $os->logEvent($user, "Compra de peças lançada: {$supplier->name}".($purchase->invoice ? " NF {$purchase->invoice}" : '').' · R$ '.number_format($total, 2, ',', '.'));
            }

            // conta a pagar ao fornecedor (à vista ou parcelada)
            if ($total > 0) {
                Installments::create(
                    [
                        'type' => 'saida',
                        'category' => 'autopecas',
                        'description' => 'Compra de peças'.($purchase->invoice ? " NF {$purchase->invoice}" : '').($os ? " · OS {$os->number()}" : ''),
                        'party' => $supplier->name,
                        'payment_method' => $d['payment_method'] ?? null,
                        'service_order_id' => null,
                        'purchase_id' => $purchase->id,
                        'created_by' => $user->id,
                    ],
                    $total,
                    Carbon::parse($d['first_due']),
                    (int) ($d['installments'] ?? 1),
                    (bool) ($d['paid'] ?? false),
                    Carbon::parse($d['first_due']),
                );
            }

            return $purchase;
        });

        $msg = 'Compra lançada'.($purchase->total > 0 ? ' e conta a pagar criada no financeiro' : '').'.';

        return ! empty($d['service_order_id']) && ! empty($d['add_to_os'])
            ? to_route('os.show', $d['service_order_id'])->with('success', $msg.' Peças incluídas na OS.')
            : to_route('compras.index', ['mes' => Carbon::parse($d['date'])->format('Y-m')])->with('success', $msg);
    }

    public function destroy(Purchase $purchase): RedirectResponse
    {
        if ($purchase->entries()->whereNotNull('paid_at')->exists()) {
            return back()->with('error', 'Esta compra já tem pagamento baixado no financeiro. Estorne a baixa antes de excluir.');
        }

        DB::transaction(function () use ($purchase) {
            $purchase->entries()->delete();
            $purchase->delete();
        });

        return back()->with('success', 'Compra excluída (e as contas a pagar dela).');
    }
}
