import { Block, Field, Grid, Tool, selectCls, textareaCls, type Col } from '@/components/erp';
import { PartPicker } from '@/components/part-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { dateBr, todayIso } from '@/lib/finance';
import { money } from '@/lib/os';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Plus, Save, ShoppingCart, Trash2, X } from 'lucide-react';
import { useState } from 'react';

type Row = {
    id: number;
    date: string;
    invoice: string | null;
    supplier: string;
    service_order_id: number | null;
    os_number: string | null;
    total: number;
    notes: string | null;
    items: { description: string; quantity: number; unit_cost: number; part_id: number | null }[];
    entries: { amount: number; due_date: string; paid_at: string | null }[];
    paid: boolean;
};
type Sup = { id: number; name: string };
type Item = { part_id: number | null; description: string; quantity: string; unit_cost: string; sale_price: string; save_part: boolean; unit?: string };

const num = (v: string) => Number(String(v).replace(/\./g, '').replace(',', '.')) || 0;
const br = (v?: number) => (v || v === 0 ? String(v).replace('.', ',') : '');
const emptyItem = (): Item => ({ part_id: null, description: '', quantity: '1', unit_cost: '', sale_price: '', save_part: true });

function PurchaseForm({ suppliers, methods, os, onDone }: { suppliers: Sup[]; methods: Record<string, string>; os: number | null; onDone: () => void }) {
    const { data, setData, post, processing, errors, transform } = useForm({
        supplier_id: '',
        invoice: '',
        date: todayIso(),
        service_order_id: os ? String(os) : '',
        add_to_os: true as boolean,
        notes: '',
        items: [emptyItem()] as Item[],
        payment_method: 'boleto',
        installments: '1',
        first_due: todayIso(),
        paid: false as boolean,
    });
    const err = errors as Record<string, string>;
    const total = data.items.reduce((s, i) => s + num(i.quantity) * num(i.unit_cost), 0);
    const setItem = (idx: number, patch: Partial<Item>) => setData('items', data.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

    return (
        <form
            className="grid gap-3"
            onSubmit={(e) => {
                e.preventDefault();
                transform((d) => ({ ...d, service_order_id: d.service_order_id ? Number(d.service_order_id.replace(/\D/g, '')) : null }));
                post(route('compras.store'), { preserveScroll: true, onSuccess: onDone });
            }}
        >
            <div className="grid gap-3 sm:grid-cols-6">
                <Field label="Fornecedor *" className="sm:col-span-3" error={err.supplier_id}>
                    <select className={selectCls} value={data.supplier_id} onChange={(e) => setData('supplier_id', e.target.value)}>
                        <option value="">Escolha…</option>
                        {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                    {!suppliers.length && (
                        <Link href={route('fornecedores.index')} className="text-[12px] text-[#b51f1f] underline">
                            Cadastre um fornecedor primeiro
                        </Link>
                    )}
                </Field>
                <Field label="Nº da nota (NF)" className="sm:col-span-1">
                    <Input value={data.invoice} onChange={(e) => setData('invoice', e.target.value)} />
                </Field>
                <Field label="Data da compra *" className="sm:col-span-2" error={err.date}>
                    <Input type="date" value={data.date} onChange={(e) => setData('date', e.target.value)} />
                </Field>
                <Field label="Para a OS nº (opcional)" className="sm:col-span-2" error={err.service_order_id}>
                    <Input value={data.service_order_id} onChange={(e) => setData('service_order_id', e.target.value)} inputMode="numeric" placeholder="Compra para estoque" />
                </Field>
                {data.service_order_id && (
                    <label className="flex items-end gap-2 pb-2 text-[13px] font-medium sm:col-span-4">
                        <input type="checkbox" className="size-4 accent-[#d42a2a]" checked={data.add_to_os} onChange={(e) => setData('add_to_os', e.target.checked)} />
                        Incluir estas peças na OS {data.service_order_id} (com o preço de venda)
                    </label>
                )}
            </div>

            <div className="overflow-x-auto rounded-[4px] border border-[#c9cdd3]">
                <table className="w-full min-w-[720px] text-[13px]">
                    <thead>
                        <tr className="border-b border-[#c9cdd3] bg-[#eceef1] text-left text-[11px] font-bold text-zinc-600 uppercase dark:bg-zinc-800">
                            <th className="h-8 px-2">Peça (busque no catálogo ou digite)</th>
                            <th className="w-20 px-2 text-right">Qtd</th>
                            <th className="w-28 px-2 text-right">Custo un.</th>
                            <th className="w-28 px-2 text-right">Venda un.</th>
                            <th className="w-28 px-2 text-right">Total</th>
                            <th className="w-10" />
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((it, idx) => (
                            <tr key={idx} className="border-b border-[#e3e5e8] align-top">
                                <td className="p-1.5">
                                    <PartPicker
                                        value={it.description}
                                        onChange={(v) => setItem(idx, { description: v, part_id: null })}
                                        onPick={(p) => setItem(idx, { part_id: p.id, description: p.description, unit_cost: br(p.cost_price), sale_price: br(p.sale_price), unit: p.unit })}
                                        placeholder="Ex.: pastilha dianteira"
                                    />
                                    <p className="mt-1 text-[11px]">
                                        {it.part_id ? (
                                            <span className="font-semibold text-green-700">✓ do catálogo (entra no estoque)</span>
                                        ) : it.description ? (
                                            <label className="inline-flex items-center gap-1.5 text-zinc-600">
                                                <input type="checkbox" className="size-3.5 accent-[#d42a2a]" checked={it.save_part} onChange={(e) => setItem(idx, { save_part: e.target.checked })} />
                                                Salvar no catálogo de peças
                                            </label>
                                        ) : null}
                                    </p>
                                    {err[`items.${idx}.description`] && <p className="text-[12px] text-red-600">{err[`items.${idx}.description`]}</p>}
                                </td>
                                <td className="p-1.5">
                                    <Input value={it.quantity} onChange={(e) => setItem(idx, { quantity: e.target.value })} inputMode="decimal" className="text-right tabular-nums" />
                                </td>
                                <td className="p-1.5">
                                    <Input value={it.unit_cost} onChange={(e) => setItem(idx, { unit_cost: e.target.value })} inputMode="decimal" className="text-right tabular-nums" placeholder="0,00" />
                                </td>
                                <td className="p-1.5">
                                    <Input value={it.sale_price} onChange={(e) => setItem(idx, { sale_price: e.target.value })} inputMode="decimal" className="text-right tabular-nums" placeholder="opcional" />
                                </td>
                                <td className="p-1.5 pt-3 text-right font-semibold tabular-nums">{money(num(it.quantity) * num(it.unit_cost))}</td>
                                <td className="p-1.5 pt-2.5 text-center">
                                    {data.items.length > 1 && (
                                        <button type="button" aria-label="Remover" onClick={() => setData('items', data.items.filter((_, i) => i !== idx))} className="text-zinc-400 hover:text-red-700">
                                            <Trash2 className="size-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex items-center justify-between bg-[#f6f7f8] px-2.5 py-2 dark:bg-zinc-800">
                    <button type="button" onClick={() => setData('items', [...data.items, emptyItem()])} className="inline-flex h-9 items-center gap-1 rounded-[3px] border border-[#c9cdd3] bg-white px-2.5 text-[12px] font-semibold md:h-7 dark:bg-zinc-900">
                        <Plus className="size-3.5" /> Mais uma peça
                    </button>
                    <span className="text-[13px]">
                        Total da nota: <b className="text-[16px] tabular-nums">{money(total)}</b>
                    </span>
                </div>
                {err.items && <p className="px-2.5 pb-2 text-[12px] text-red-600">{err.items}</p>}
            </div>

            <div className="grid gap-3 rounded-[4px] border border-[#c9cdd3] bg-[#fafafa] p-3 sm:grid-cols-4 dark:bg-zinc-900">
                <p className="text-[11px] font-bold tracking-wide text-zinc-600 uppercase sm:col-span-4">Pagamento ao fornecedor (vira conta a pagar no financeiro)</p>
                <Field label="Forma">
                    <select className={selectCls} value={data.payment_method} onChange={(e) => setData('payment_method', e.target.value)}>
                        {Object.entries(methods).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Parcelas">
                    <select className={selectCls} value={data.installments} onChange={(e) => setData('installments', e.target.value)}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((i) => (
                            <option key={i} value={i}>
                                {i === 1 ? 'À vista' : `${i}x de ${money(total / i)}`}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label={Number(data.installments) > 1 ? '1º vencimento' : 'Vencimento'} error={err.first_due}>
                    <Input type="date" value={data.first_due} onChange={(e) => setData('first_due', e.target.value)} />
                </Field>
                <label className="flex items-end gap-2 pb-2 text-[13px] font-medium">
                    <input type="checkbox" className="size-4 accent-[#d42a2a]" checked={data.paid} onChange={(e) => setData('paid', e.target.checked)} />
                    {Number(data.installments) > 1 ? '1ª já paga' : 'Já paga'}
                </label>
            </div>

            <Field label="Observações">
                <textarea rows={2} className={textareaCls} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
            </Field>

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onDone} className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] bg-white px-4 text-[13px] font-semibold md:h-8 dark:bg-zinc-900">
                    <X className="size-4" /> Cancelar
                </button>
                <button type="submit" disabled={processing} className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white disabled:opacity-60 md:h-8">
                    <Save className="size-4" /> Gravar compra
                </button>
            </div>
        </form>
    );
}

export default function Compras({
    rows,
    total,
    filters,
    suppliers,
    methods,
    prefillOs,
}: {
    rows: Row[];
    total: number;
    filters: { mes: string; fornecedor: string | number };
    suppliers: Sup[];
    methods: Record<string, string>;
    prefillOs: number | null;
}) {
    const startOpen = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).has('nova') || !!prefillOs);
    const [creating, setCreating] = useState(startOpen);
    const [view, setView] = useState<Row | null>(null);
    const go = (p: Partial<typeof filters>) => router.get(route('compras.index'), { ...filters, ...p }, { preserveState: true, replace: true });

    const cols: Col<Row>[] = [
        { label: 'Data', render: (r) => dateBr(r.date), className: 'w-24' },
        { label: 'NF', render: (r) => r.invoice ?? '—', className: 'w-24', hide: 'sm' },
        { label: 'Fornecedor', render: (r) => <b>{r.supplier}</b> },
        { label: 'Peças', render: (r) => <span className="line-clamp-1">{r.items.map((i) => i.description).join(', ')}</span>, hide: 'md' },
        { label: 'OS', render: (r) => (r.os_number ? r.os_number : <span className="text-zinc-400">estoque</span>), className: 'w-20', hide: 'sm' },
        { label: 'Total', render: (r) => <b>{money(r.total)}</b>, align: 'right', className: 'w-28' },
        {
            label: 'Pagamento',
            render: (r) => (
                <span className={cn('rounded-[3px] px-1.5 py-0.5 text-[11px] font-bold uppercase ring-1 ring-inset', r.paid ? 'bg-green-50 text-green-800 ring-green-300' : 'bg-amber-50 text-amber-900 ring-amber-300')}>
                    {r.paid ? 'Pago' : 'A pagar'}
                </span>
            ),
            className: 'w-24',
        },
    ];

    return (
        <AppLayout title="Compras de Peças" code="PEC030" toolbar={<Tool primary icon={<ShoppingCart />} label="Nova compra" onClick={() => setCreating(true)} />}>
            <Head title="Compras" />
            <div className="grid gap-2 md:gap-3">
                <Block title="Filtros">
                    <div className="grid items-end gap-2 sm:grid-cols-[160px_280px]">
                        <Field label="Mês">
                            <Input type="month" value={filters.mes} onChange={(e) => go({ mes: e.target.value })} />
                        </Field>
                        <Field label="Fornecedor">
                            <select className={selectCls} value={filters.fornecedor} onChange={(e) => go({ fornecedor: e.target.value })}>
                                <option value="">Todos</option>
                                {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>
                </Block>
                <Block title="Compras" bodyClassName="p-0">
                    <Grid
                        cols={cols}
                        rows={rows}
                        rowKey={(r) => r.id}
                        onRowClick={setView}
                        empty="Nenhuma compra neste mês."
                        footer={
                            <>
                                <span>{rows.length} compra(s)</span>
                                <span>
                                    Total do mês: <b className="tabular-nums">{money(total)}</b>
                                </span>
                            </>
                        }
                    />
                </Block>
            </div>

            <Dialog open={creating} onOpenChange={setCreating}>
                <DialogContent className="max-h-[94svh] overflow-y-auto rounded-[4px] sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Nova compra de peças</DialogTitle>
                    </DialogHeader>
                    {creating && <PurchaseForm suppliers={suppliers} methods={methods} os={prefillOs} onDone={() => setCreating(false)} />}
                </DialogContent>
            </Dialog>

            <Dialog open={view !== null} onOpenChange={(o) => !o && setView(null)}>
                <DialogContent className="max-h-[92svh] overflow-y-auto rounded-[4px] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            Compra {view?.invoice ? `NF ${view.invoice}` : ''} · {view?.supplier}
                        </DialogTitle>
                    </DialogHeader>
                    {view && (
                        <div className="grid gap-3 text-[13px]">
                            <p>
                                {dateBr(view.date)}
                                {view.service_order_id && (
                                    <>
                                        {' · '}
                                        <Link href={route('os.show', view.service_order_id)} className="font-semibold text-[#b51f1f] hover:underline">
                                            OS {view.os_number}
                                        </Link>
                                    </>
                                )}
                            </p>
                            <table className="w-full">
                                <tbody>
                                    {view.items.map((i, k) => (
                                        <tr key={k} className="border-b border-[#e3e5e8]">
                                            <td className="py-1">{i.description}</td>
                                            <td className="py-1 text-right tabular-nums">
                                                {i.quantity} × {money(i.unit_cost)}
                                            </td>
                                            <td className="w-28 py-1 text-right font-semibold tabular-nums">{money(i.quantity * i.unit_cost)}</td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={2} className="py-1.5 font-bold">
                                            Total
                                        </td>
                                        <td className="py-1.5 text-right text-[15px] font-bold tabular-nums">{money(view.total)}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div>
                                <p className="text-[11px] font-bold text-zinc-600 uppercase">Contas a pagar</p>
                                {view.entries.map((e, k) => (
                                    <p key={k} className="flex justify-between border-b border-[#eceef1] py-1">
                                        <span>Vence {dateBr(e.due_date)}</span>
                                        <span className={e.paid_at ? 'text-green-700' : 'text-amber-700'}>{e.paid_at ? `Pago ${dateBr(e.paid_at)}` : 'Em aberto'}</span>
                                        <b className="tabular-nums">{money(e.amount)}</b>
                                    </p>
                                ))}
                            </div>
                            {view.notes && <p className="text-muted-foreground">{view.notes}</p>}
                            <div className="flex justify-end">
                                <Tool
                                    danger
                                    icon={<Trash2 />}
                                    label="Excluir compra"
                                    onClick={() => confirm('Excluir esta compra e as contas a pagar dela?') && router.delete(route('compras.destroy', view.id), { preserveScroll: true, onSuccess: () => setView(null) })}
                                />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
