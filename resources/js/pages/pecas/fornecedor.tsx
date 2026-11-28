import { Block, Field, Grid, ReadOnly, Tool, selectCls, type Col } from '@/components/erp';
import { PaidTag, PurchaseDetailDialog, type PurchaseRow } from '@/components/purchase-detail';
import { SupplierForm } from '@/components/supplier-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { dateBr, monthLabel } from '@/lib/finance';
import { documentFmt, money, phone, whatsapp } from '@/lib/os';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle, Pencil, ShoppingCart } from 'lucide-react';
import { useState } from 'react';

type Supplier = {
    id: number;
    name: string;
    document: string | null;
    phone: string | null;
    contact: string | null;
    email: string | null;
    notes: string | null;
    active: boolean;
};
interface Props {
    supplier: Supplier;
    purchases: PurchaseRow[];
    filters: { mes: string };
    months: string[];
    summary: { period_total: number; period_count: number; all_total: number; open_total: number; overdue_total: number };
}

function shift(ym: string, delta: number) {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Ficha do fornecedor com o histórico de compras por mês. */
export default function FornecedorShow({ supplier, purchases, filters, months, summary }: Props) {
    const [view, setView] = useState<PurchaseRow | null>(null);
    const [editing, setEditing] = useState(false);
    const all = filters.mes === 'todos';
    const current = all ? new Date().toISOString().slice(0, 7) : filters.mes;
    const go = (mes: string) =>
        router.get(route('fornecedores.show', supplier.id), { mes }, { preserveState: true, preserveScroll: true, replace: true });
    const wa = whatsapp(supplier.phone, 'Olá! Aqui é da Pista 1 Mecânica Automotiva.');

    const cols: Col<PurchaseRow>[] = [
        { label: 'Data', render: (r) => dateBr(r.date), className: 'w-24' },
        { label: 'NF', render: (r) => r.invoice ?? '—', className: 'w-24' },
        {
            label: 'Peças',
            render: (r) => (
                <span className="line-clamp-1">
                    {r.items.map((i) => (i.quantity !== 1 ? `${i.quantity.toLocaleString('pt-BR')}× ` : '') + i.description).join(', ')}
                </span>
            ),
        },
        { label: 'OS', render: (r) => r.os_number ?? '—', className: 'w-20', hide: 'sm' },
        { label: 'Total', render: (r) => <b>{money(r.total)}</b>, align: 'right', className: 'w-28' },
        { label: 'Em aberto', render: (r) => (r.open_amount ? money(r.open_amount) : '—'), align: 'right', className: 'w-28', hide: 'md' },
        { label: 'Pagamento', render: (r) => <PaidTag r={r} />, className: 'w-24' },
    ];

    return (
        <AppLayout
            title={`Fornecedor · ${supplier.name}`}
            code="PEC021"
            toolbar={
                <>
                    <Tool icon={<ArrowLeft />} label="Fornecedores" href={route('fornecedores.index')} />
                    <Tool primary icon={<ShoppingCart />} label="Nova compra" href={route('compras.index', { nova: 1, fornecedor: supplier.id })} />
                    {wa && <Tool icon={<MessageCircle className="text-green-600" />} label="WhatsApp" href={wa} external />}
                    <Tool icon={<Pencil />} label="Alterar" onClick={() => setEditing(true)} />
                </>
            }
        >
            <Head title={supplier.name} />
            <div className="grid gap-2 md:gap-3">
                <Block title="Dados do fornecedor">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Field label="Nome" className="col-span-2">
                            <ReadOnly className={cn('font-semibold', !supplier.active && 'text-zinc-400 line-through')}>{supplier.name}</ReadOnly>
                        </Field>
                        <Field label="CPF / CNPJ">
                            <ReadOnly>{documentFmt(supplier.document)}</ReadOnly>
                        </Field>
                        <Field label="Telefone">
                            <ReadOnly>{phone(supplier.phone)}</ReadOnly>
                        </Field>
                        <Field label="Vendedor">
                            <ReadOnly>{supplier.contact}</ReadOnly>
                        </Field>
                        <Field label="E-mail">
                            <ReadOnly>{supplier.email}</ReadOnly>
                        </Field>
                        <Field label="Observações" className="col-span-2">
                            <ReadOnly>{supplier.notes}</ReadOnly>
                        </Field>
                    </div>
                </Block>

                {/* totais */}
                <section className="bg-card grid grid-cols-2 overflow-hidden rounded-[4px] border border-[#c9cdd3] md:grid-cols-4">
                    {[
                        [
                            all ? 'Comprado no total' : `Comprado em ${monthLabel(filters.mes)}`,
                            money(summary.period_total),
                            `${summary.period_count} compra(s)`,
                        ],
                        ['Comprado desde o início', money(summary.all_total), ''],
                        ['Em aberto com o fornecedor', money(summary.open_total), 'todas as datas'],
                        ['Vencido', money(summary.overdue_total), summary.overdue_total ? 'pagar o quanto antes' : 'nada vencido'],
                    ].map(([label, value, sub], i) => (
                        <div key={i} className="border-r border-b border-[#d7dade] px-3 py-2 last:border-r-0 md:border-b-0">
                            <p className="truncate text-[11px] font-semibold tracking-wide text-zinc-600 uppercase">{label}</p>
                            <p className={cn('text-[19px] font-bold tabular-nums', i === 3 && summary.overdue_total > 0 && 'text-[#b51f1f]')}>
                                {value}
                            </p>
                            {sub && <p className="text-[11px] text-zinc-500">{sub}</p>}
                        </div>
                    ))}
                </section>

                <Block
                    title="Histórico de compras"
                    bodyClassName="p-0"
                    actions={
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                aria-label="Mês anterior"
                                onClick={() => go(shift(current, -1))}
                                className="grid size-9 place-items-center rounded-[3px] border border-[#c9cdd3] bg-white md:size-7 dark:bg-zinc-900"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                            <Input
                                type="month"
                                value={all ? '' : filters.mes}
                                onChange={(e) => e.target.value && go(e.target.value)}
                                className="w-40 md:h-7"
                                aria-label="Mês"
                            />
                            <button
                                type="button"
                                aria-label="Próximo mês"
                                onClick={() => go(shift(current, 1))}
                                className="grid size-9 place-items-center rounded-[3px] border border-[#c9cdd3] bg-white md:size-7 dark:bg-zinc-900"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                            <select
                                className={cn(selectCls, 'w-44 md:h-7')}
                                value={all ? 'todos' : months.includes(filters.mes) ? filters.mes : ''}
                                onChange={(e) => e.target.value && go(e.target.value)}
                                aria-label="Meses com compra"
                            >
                                <option value="">Meses com compra…</option>
                                <option value="todos">Todos os meses</option>
                                {months.map((m) => (
                                    <option key={m} value={m}>
                                        {monthLabel(m)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    }
                >
                    <Grid
                        cols={cols}
                        rows={purchases}
                        rowKey={(r) => r.id}
                        onRowClick={setView}
                        empty={
                            all ? 'Nenhuma compra com este fornecedor.' : 'Nenhuma compra neste mês. Use as setas ou escolha um dos meses com compra.'
                        }
                        footer={
                            <>
                                <span>{purchases.length} compra(s) · clique para ver os itens</span>
                                <span>
                                    Total: <b className="tabular-nums">{money(summary.period_total)}</b>
                                </span>
                            </>
                        }
                    />
                </Block>
            </div>

            <PurchaseDetailDialog row={view} onClose={() => setView(null)} />

            <Dialog open={editing} onOpenChange={setEditing}>
                <DialogContent className="max-h-[92svh] overflow-y-auto rounded-[4px] sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Alterar fornecedor</DialogTitle>
                    </DialogHeader>
                    {editing && (
                        <SupplierForm s={{ ...supplier, purchases_count: 0, purchases_total: 0, open_total: 0 }} onDone={() => setEditing(false)} />
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
