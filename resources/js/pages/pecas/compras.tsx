import { Block, Field, Grid, Tool, selectCls, textareaCls, type Col } from '@/components/erp';
import { PaidTag, PurchaseDetailDialog, type PurchaseRow } from '@/components/purchase-detail';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { dateBr, todayIso } from '@/lib/finance';
import { money } from '@/lib/os';
import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Save, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SupplierForm } from './fornecedores';

type Row = PurchaseRow;
type Sup = { id: number; name: string };
type Item = { description: string; quantity: string; unit_cost: string; sale_price: string };
/** OS com carro na oficina, com as peças pedidas (para puxar na compra). */
type OsOpt = {
    id: number;
    number: string;
    status: string;
    status_label: string;
    client: string | null;
    vehicle: string;
    parts: { description: string; quantity: number }[];
};

const num = (v: string) => Number(String(v).replace(/\./g, '').replace(',', '.')) || 0;
const emptyItem = (): Item => ({ description: '', quantity: '1', unit_cost: '', sale_price: '' });

const partsOf = (o?: OsOpt): Item[] =>
    o && o.parts.length
        ? o.parts.map((p) => ({ description: p.description, quantity: p.quantity.toLocaleString('pt-BR'), unit_cost: '', sale_price: '' }))
        : [emptyItem()];

function PurchaseForm({
    suppliers,
    methods,
    orders,
    os,
    supplierId,
    onDone,
}: {
    suppliers: Sup[];
    methods: Record<string, string>;
    orders: OsOpt[];
    os: number | null;
    supplierId?: string;
    onDone: () => void;
}) {
    const [newSupplier, setNewSupplier] = useState(false);
    const known = useRef(suppliers.map((s) => s.id));
    const preset = os ? orders.find((o) => o.id === os) : undefined;
    const { data, setData, post, processing, errors, transform } = useForm({
        supplier_id: supplierId ?? '',
        invoice: '',
        date: todayIso(),
        service_order_id: preset ? String(preset.id) : '',
        // as peças da OS normalmente já estão no orçamento: lançar de novo duplicaria
        add_to_os: false as boolean,
        notes: '',
        // comprando para uma OS, já vem a lista de peças que o mecânico pediu
        items: partsOf(preset),
        payment_method: 'boleto',
        installments: '1',
        first_due: todayIso(),
        paid: false as boolean,
    });
    const err = errors as Record<string, string>;
    const total = data.items.reduce((s, i) => s + num(i.quantity) * num(i.unit_cost), 0);
    const setItem = (idx: number, patch: Partial<Item>) =>
        setData(
            'items',
            data.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
        );
    const pickedOs = orders.find((o) => String(o.id) === data.service_order_id);
    const pickOs = (id: string) => {
        const o = orders.find((x) => String(x.id) === id);
        const blank = data.items.every((i) => !i.description.trim());
        setData((d) => ({ ...d, service_order_id: id, items: blank ? partsOf(o) : d.items }));
    };

    // fornecedor recém-cadastrado aqui mesmo já fica selecionado
    useEffect(() => {
        const added = suppliers.find((s) => !known.current.includes(s.id));
        known.current = suppliers.map((s) => s.id);
        if (added) setData('supplier_id', String(added.id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [suppliers]);

    return (
        <>
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
                        <div className="flex gap-1.5">
                            <select className={selectCls} value={data.supplier_id} onChange={(e) => setData('supplier_id', e.target.value)}>
                                <option value="">{suppliers.length ? 'Escolha…' : 'Nenhum fornecedor cadastrado'}</option>
                                {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setNewSupplier(true)}
                                className="inline-flex h-11 shrink-0 items-center gap-1 rounded-[3px] border border-zinc-800 bg-zinc-900 px-2.5 text-[12px] font-semibold text-white md:h-8"
                            >
                                <Plus className="size-3.5" /> Novo
                            </button>
                        </div>
                    </Field>
                    <Field label="Nota fiscal" className="sm:col-span-1">
                        <Input value={data.invoice} onChange={(e) => setData('invoice', e.target.value)} />
                    </Field>
                    <Field label="Data *" className="sm:col-span-2" error={err.date}>
                        <Input type="date" value={data.date} onChange={(e) => setData('date', e.target.value)} />
                    </Field>
                    <Field label="OS" className="sm:col-span-6" error={err.service_order_id}>
                        <select className={selectCls} value={data.service_order_id} onChange={(e) => pickOs(e.target.value)}>
                            <option value="">— Não é para uma OS (uso da oficina) —</option>
                            {orders.map((o) => (
                                <option key={o.id} value={o.id}>
                                    OS {o.number} · {o.vehicle} · {o.client ?? '—'} · {o.status_label}
                                    {o.parts.length ? ` · ${o.parts.length} peça(s) pedida(s)` : ''}
                                </option>
                            ))}
                        </select>
                    </Field>
                    {pickedOs && (
                        <div className="grid gap-1 rounded-[3px] border border-[#d7dade] bg-[#f6f7f8] px-3 py-2 text-[12px] sm:col-span-6 dark:bg-zinc-800">
                            <span>
                                O custo desta compra entra na margem da OS {pickedOs.number}
                                {pickedOs.status === 'pecas' ? ' e, ao gravar, o carro volta para a fila do mecânico.' : '.'}
                            </span>
                            <label className="flex items-center gap-2 text-[13px] font-medium">
                                <input
                                    type="checkbox"
                                    className="size-4 accent-[#d42a2a]"
                                    checked={data.add_to_os}
                                    onChange={(e) => setData('add_to_os', e.target.checked)}
                                />
                                <span>
                                    Lançar estas peças também na OS (só se ainda <b>não estão</b> no orçamento do cliente)
                                </span>
                            </label>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto rounded-[4px] border border-[#c9cdd3]">
                    <table className="w-full min-w-[720px] text-[13px]">
                        <thead>
                            <tr className="border-b border-[#c9cdd3] bg-[#eceef1] text-left text-[11px] font-bold text-zinc-600 uppercase dark:bg-zinc-800">
                                <th className="h-8 px-2">Peça</th>
                                <th className="w-20 px-2 text-right">Qtd</th>
                                <th className="w-28 px-2 text-right">Custo un.</th>
                                <th className="w-28 px-2 text-right" title="Preço que vai para a OS do cliente">
                                    Venda un. {data.add_to_os ? '(na OS)' : ''}
                                </th>
                                <th className="w-28 px-2 text-right">Total</th>
                                <th className="w-10" />
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((it, idx) => (
                                <tr key={idx} className="border-b border-[#e3e5e8] align-top">
                                    <td className="p-1.5">
                                        <Input value={it.description} onChange={(e) => setItem(idx, { description: e.target.value })} />
                                        {err[`items.${idx}.description`] && (
                                            <p className="text-[12px] text-red-600">{err[`items.${idx}.description`]}</p>
                                        )}
                                    </td>
                                    <td className="p-1.5">
                                        <Input
                                            value={it.quantity}
                                            onChange={(e) => setItem(idx, { quantity: e.target.value })}
                                            inputMode="decimal"
                                            className="text-right tabular-nums"
                                        />
                                    </td>
                                    <td className="p-1.5">
                                        <Input
                                            value={it.unit_cost}
                                            onChange={(e) => setItem(idx, { unit_cost: e.target.value })}
                                            inputMode="decimal"
                                            className="text-right tabular-nums"
                                            placeholder="0,00"
                                        />
                                    </td>
                                    <td className="p-1.5">
                                        <Input
                                            value={it.sale_price}
                                            onChange={(e) => setItem(idx, { sale_price: e.target.value })}
                                            inputMode="decimal"
                                            className="text-right tabular-nums"
                                            placeholder={data.add_to_os ? 'opcional' : '—'}
                                            disabled={!data.add_to_os}
                                        />
                                    </td>
                                    <td className="p-1.5 pt-3 text-right font-semibold tabular-nums">
                                        {money(num(it.quantity) * num(it.unit_cost))}
                                    </td>
                                    <td className="p-1.5 pt-2.5 text-center">
                                        {data.items.length > 1 && (
                                            <button
                                                type="button"
                                                aria-label="Remover"
                                                onClick={() =>
                                                    setData(
                                                        'items',
                                                        data.items.filter((_, i) => i !== idx),
                                                    )
                                                }
                                                className="text-zinc-400 hover:text-red-700"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="flex items-center justify-between bg-[#f6f7f8] px-2.5 py-2 dark:bg-zinc-800">
                        <button
                            type="button"
                            onClick={() => setData('items', [...data.items, emptyItem()])}
                            className="inline-flex h-9 items-center gap-1 rounded-[3px] border border-[#c9cdd3] bg-white px-2.5 text-[12px] font-semibold md:h-7 dark:bg-zinc-900"
                        >
                            <Plus className="size-3.5" /> Mais uma peça
                        </button>
                        <span className="text-[13px]">
                            Total da nota: <b className="text-[16px] tabular-nums">{money(total)}</b>
                        </span>
                    </div>
                    {err.items && <p className="px-2.5 pb-2 text-[12px] text-red-600">{err.items}</p>}
                </div>

                <div className="grid gap-3 rounded-[4px] border border-[#c9cdd3] bg-[#fafafa] p-3 sm:grid-cols-4 dark:bg-zinc-900">
                    <p className="text-[11px] font-bold tracking-wide text-zinc-600 uppercase sm:col-span-4">
                        Pagamento ao fornecedor (vira conta a pagar no financeiro)
                    </p>
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
                        <input
                            type="checkbox"
                            className="size-4 accent-[#d42a2a]"
                            checked={data.paid}
                            onChange={(e) => setData('paid', e.target.checked)}
                        />
                        {Number(data.installments) > 1 ? '1ª já paga' : 'Já paga'}
                    </label>
                </div>

                <Field label="Observações">
                    <textarea rows={2} className={textareaCls} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                </Field>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onDone}
                        className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] bg-white px-4 text-[13px] font-semibold md:h-8 dark:bg-zinc-900"
                    >
                        <X className="size-4" /> Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white disabled:opacity-60 md:h-8"
                    >
                        <Save className="size-4" /> Gravar compra
                    </button>
                </div>
            </form>

            {/* cadastro rápido de fornecedor sem sair da compra */}
            <Dialog open={newSupplier} onOpenChange={setNewSupplier}>
                <DialogContent className="max-h-[92svh] overflow-y-auto rounded-[4px] sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Novo fornecedor</DialogTitle>
                    </DialogHeader>
                    {newSupplier && <SupplierForm onDone={() => setNewSupplier(false)} />}
                </DialogContent>
            </Dialog>
        </>
    );
}

export default function Compras({
    rows,
    total,
    filters,
    suppliers,
    methods,
    prefillOs,
    orders,
}: {
    rows: Row[];
    total: number;
    filters: { mes: string; fornecedor: string | number; q: string };
    suppliers: Sup[];
    methods: Record<string, string>;
    prefillOs: number | null;
    orders: OsOpt[];
}) {
    const startOpen = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).has('nova') || !!prefillOs);
    // aberto pela ficha do fornecedor ou pelo botão "Comprar" de uma OS
    const [creating, setCreating] = useState<{ os: number | null } | null>(startOpen ? { os: prefillOs } : null);
    const [view, setView] = useState<Row | null>(null);
    const [q, setQ] = useState(filters.q ?? '');
    const go = (p: Partial<typeof filters>) => router.get(route('compras.index'), { ...filters, ...p }, { preserveState: true, replace: true });
    const waiting = orders.filter((o) => o.status === 'pecas');

    const cols: Col<Row>[] = [
        { label: 'Data', render: (r) => dateBr(r.date), className: 'w-24' },
        { label: 'NF', render: (r) => r.invoice ?? '—', className: 'w-24', hide: 'sm' },
        { label: 'Fornecedor', render: (r) => <b>{r.supplier}</b> },
        { label: 'Peças', render: (r) => <span className="line-clamp-1">{r.items.map((i) => i.description).join(', ')}</span>, hide: 'md' },
        { label: 'OS', render: (r) => (r.os_number ? r.os_number : <span className="text-zinc-400">oficina</span>), className: 'w-20', hide: 'sm' },
        { label: 'Total', render: (r) => <b>{money(r.total)}</b>, align: 'right', className: 'w-28' },
        {
            label: 'Pagamento',
            render: (r) => <PaidTag r={r} />,
            className: 'w-24',
        },
    ];

    return (
        <AppLayout
            title="Compras de Peças"
            code="PEC030"
            toolbar={<Tool primary icon={<ShoppingCart />} label="Nova compra" onClick={() => setCreating({ os: null })} />}
        >
            <Head title="Compras" />
            <div className="grid gap-2 md:gap-3">
                {waiting.length > 0 && (
                    <Block title={`Aguardando peças · ${waiting.length}`} bodyClassName="p-0" className="border-l-4 border-l-fuchsia-600">
                        <Grid
                            cols={[
                                { label: 'OS', render: (o: OsOpt) => <b>{o.number}</b>, className: 'w-16' },
                                { label: 'Veículo', render: (o: OsOpt) => o.vehicle },
                                {
                                    label: 'Peças pedidas',
                                    render: (o: OsOpt) => <span className="line-clamp-1">{o.parts.map((p) => p.description).join(', ') || '—'}</span>,
                                    hide: 'md',
                                },
                                {
                                    label: '',
                                    render: (o: OsOpt) => (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCreating({ os: o.id });
                                            }}
                                            className="inline-flex h-9 items-center gap-1 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-2 text-[12px] font-semibold text-white md:h-7"
                                        >
                                            <ShoppingCart className="size-3.5" /> Comprar
                                        </button>
                                    ),
                                    className: 'w-28',
                                    align: 'center',
                                },
                            ]}
                            rows={waiting}
                            rowKey={(o) => o.id}
                            onRowClick={(o) => router.visit(route('os.show', o.id))}
                        />
                    </Block>
                )}
                <Block title="Filtros">
                    <form
                        className="grid items-end gap-2 sm:grid-cols-[160px_280px_1fr_auto]"
                        onSubmit={(e) => {
                            e.preventDefault();
                            go({ q });
                        }}
                    >
                        <Field label="Mês">
                            <Input type="month" value={filters.mes} onChange={(e) => go({ mes: e.target.value, q: '' })} disabled={!!filters.q} />
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
                        <Field label="Pesquisar">
                            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nº da nota, peça ou nº da OS" />
                        </Field>
                        <button
                            type="submit"
                            className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] bg-white px-3 text-[13px] font-semibold md:h-8 dark:bg-zinc-900"
                        >
                            <Search className="size-4" /> Pesquisar
                        </button>
                    </form>
                </Block>
                <Block title="Compras" bodyClassName="p-0">
                    <Grid
                        cols={cols}
                        rows={rows}
                        rowKey={(r) => r.id}
                        onRowClick={setView}
                        empty={filters.q ? 'Nenhuma compra encontrada.' : 'Nenhuma compra neste mês.'}
                        footer={
                            <>
                                <span>{rows.length} compra(s)</span>
                                <span>
                                    {filters.q ? 'Total encontrado' : 'Total do mês'}: <b className="tabular-nums">{money(total)}</b>
                                </span>
                            </>
                        }
                    />
                </Block>
            </div>

            <Dialog open={creating !== null} onOpenChange={(o) => !o && setCreating(null)}>
                <DialogContent className="max-h-[94svh] overflow-y-auto rounded-[4px] sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Nova compra de peças</DialogTitle>
                    </DialogHeader>
                    {creating && (
                        <PurchaseForm
                            key={creating.os ?? 'nova'}
                            suppliers={suppliers}
                            methods={methods}
                            orders={orders}
                            os={creating.os}
                            supplierId={filters.fornecedor ? String(filters.fornecedor) : undefined}
                            onDone={() => setCreating(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <PurchaseDetailDialog row={view} onClose={() => setView(null)} />
        </AppLayout>
    );
}
