import { Block, Field, Grid, Tool, selectCls, type Col } from '@/components/erp';
import { EntryForm, PayForm } from '@/components/finance-entry-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { dateBr, situation, type EntryOptions, type EntryType, type FinanceRow } from '@/lib/finance';
import { money } from '@/lib/os';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import { CircleCheck, Minus, Plus, Search, Undo2 } from 'lucide-react';
import { useState } from 'react';

interface Props extends EntryOptions {
    entries: FinanceRow[];
    totals: { in: number; out: number };
    filters: { mes: string; tipo: string; situacao: string; categoria: string; q: string };
}

export default function Lancamentos({ entries, totals, filters, ...options }: Props) {
    const { categories, methods } = options;
    const [f, setF] = useState(filters);
    const [dialog, setDialog] = useState<{ type: EntryType; entry?: FinanceRow } | null>(null);
    const [paying, setPaying] = useState<FinanceRow | null>(null);
    const apply = (patch: Partial<typeof filters>) => {
        const next = { ...f, ...patch };
        setF(next);
        router.get(route('financeiro.entries'), next, { preserveState: true, preserveScroll: true, replace: true });
    };
    const pay = (r: FinanceRow) => setPaying(r);
    const unpay = (r: FinanceRow) =>
        confirm('Estornar a baixa deste lançamento?') && router.patch(route('financeiro.entries.unpay', r.id), {}, { preserveScroll: true });

    const cols: Col<FinanceRow>[] = [
        {
            label: 'Vencimento',
            render: (r) => <span className={cn('tabular-nums', r.overdue && 'font-bold text-red-700')}>{dateBr(r.due_date)}</span>,
            className: 'w-24',
        },
        {
            label: 'Tipo',
            render: (r) => (
                <span
                    className={cn(
                        'inline-flex items-center gap-1 text-[11px] font-bold uppercase',
                        r.type === 'entrada' ? 'text-green-700' : 'text-[#b51f1f]',
                    )}
                >
                    {r.type === 'entrada' ? <Plus className="size-3" /> : <Minus className="size-3" />}
                    {r.type === 'entrada' ? 'Entrada' : 'Saída'}
                </span>
            ),
            className: 'w-20',
        },
        { label: 'Categoria', render: (r) => r.category_label, hide: 'lg', className: 'w-48' },
        {
            label: 'Descrição',
            render: (r) => (
                <span>
                    {r.description}
                    {r.os_number && (
                        <Link
                            href={route('os.show', r.service_order_id!)}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-1.5 text-[11px] font-semibold text-[#b51f1f] hover:underline"
                        >
                            ver OS
                        </Link>
                    )}
                    {r.purchase_id && (
                        <Link
                            href={route('compras.index')}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-1.5 text-[11px] font-semibold text-[#b51f1f] hover:underline"
                        >
                            ver compra
                        </Link>
                    )}
                    {r.paid_by && (
                        <span className="ml-1.5 rounded-[2px] bg-zinc-200 px-1 text-[10px] font-semibold dark:bg-zinc-700">sócio {r.paid_by}</span>
                    )}
                </span>
            ),
        },
        { label: 'Cliente / fornecedor', render: (r) => r.party ?? '—', hide: 'md' },
        { label: 'Forma', render: (r) => (r.payment_method ? methods[r.payment_method] : '—'), hide: 'lg', className: 'w-32' },
        {
            label: 'Valor',
            render: (r) => (
                <b className={r.type === 'entrada' ? 'text-green-800' : 'text-zinc-900 dark:text-zinc-100'}>
                    {(r.type === 'saida' ? '- ' : '') + money(r.amount)}
                </b>
            ),
            align: 'right',
            className: 'w-32',
        },
        {
            label: 'Situação',
            render: (r) => {
                const s = situation(r);
                return (
                    <span
                        className={cn('inline-flex h-5 items-center rounded-[3px] px-1.5 text-[11px] font-bold uppercase ring-1 ring-inset', s.cls)}
                    >
                        {s.label}
                        {r.paid_at && <span className="ml-1 font-normal normal-case">{dateBr(r.paid_at).slice(0, 5)}</span>}
                    </span>
                );
            },
            className: 'w-36',
        },
        {
            label: '',
            render: (r) =>
                r.paid_at ? (
                    <button
                        title="Estornar baixa"
                        onClick={(e) => {
                            e.stopPropagation();
                            unpay(r);
                        }}
                        className="grid size-9 place-items-center rounded-[3px] text-zinc-500 hover:bg-zinc-100 md:size-7"
                    >
                        <Undo2 className="size-4" />
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            pay(r);
                        }}
                        className="inline-flex h-9 items-center gap-1 rounded-[3px] border border-green-700 bg-green-700 px-2 text-[12px] font-semibold text-white hover:bg-green-800 md:h-7"
                    >
                        <CircleCheck className="size-3.5" /> Baixar
                    </button>
                ),
            className: 'w-24',
            align: 'center',
        },
    ];

    const situacoes = [
        ['todos', 'Todos do mês'],
        ['pago', 'Pagos / recebidos no mês'],
        ['aberto', 'Em aberto (todas as datas)'],
        ['vencido', 'Vencidos'],
    ];

    return (
        <AppLayout
            title="Lançamentos e Contas"
            code="FIN010"
            toolbar={
                <>
                    <Tool primary icon={<Minus />} label="Nova despesa" onClick={() => setDialog({ type: 'saida' })} />
                    <Tool icon={<Plus className="text-green-700" />} label="Nova entrada" onClick={() => setDialog({ type: 'entrada' })} />
                </>
            }
        >
            <Head title="Lançamentos" />
            <div className="grid gap-2 md:gap-3">
                <Block title="Filtros">
                    <form
                        className="grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-[150px_150px_220px_220px_1fr_auto]"
                        onSubmit={(e) => {
                            e.preventDefault();
                            apply({});
                        }}
                    >
                        <Field label="Mês">
                            <Input
                                type="month"
                                value={f.mes}
                                onChange={(e) => apply({ mes: e.target.value })}
                                disabled={f.situacao === 'aberto' || f.situacao === 'vencido'}
                            />
                        </Field>
                        <Field label="Tipo">
                            <select className={selectCls} value={f.tipo} onChange={(e) => apply({ tipo: e.target.value, categoria: '' })}>
                                <option value="">Entradas e saídas</option>
                                <option value="entrada">Só entradas</option>
                                <option value="saida">Só saídas</option>
                            </select>
                        </Field>
                        <Field label="Situação">
                            <select className={selectCls} value={f.situacao} onChange={(e) => apply({ situacao: e.target.value })}>
                                {situacoes.map(([v, l]) => (
                                    <option key={v} value={v}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Categoria">
                            <select className={selectCls} value={f.categoria} onChange={(e) => apply({ categoria: e.target.value })}>
                                <option value="">Todas</option>
                                {(['saida', 'entrada'] as EntryType[])
                                    .filter((t) => !f.tipo || f.tipo === t)
                                    .map((t) => (
                                        <optgroup key={t} label={t === 'entrada' ? 'Entradas' : 'Saídas'}>
                                            {Object.entries(categories[t]).map(([k, v]) => (
                                                <option key={k} value={k}>
                                                    {v}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                            </select>
                        </Field>
                        <Field label="Pesquisar">
                            <Input
                                value={f.q}
                                onChange={(e) => setF({ ...f, q: e.target.value })}
                                placeholder="Descrição, cliente, fornecedor ou nº da OS"
                            />
                        </Field>
                        <button
                            type="submit"
                            className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] bg-white px-3 text-[13px] font-semibold md:h-8 dark:bg-zinc-900"
                        >
                            <Search className="size-4" /> Pesquisar
                        </button>
                    </form>
                </Block>

                <Block title="Lançamentos" bodyClassName="p-0">
                    <Grid
                        cols={cols}
                        rows={entries}
                        rowKey={(r) => r.id}
                        onRowClick={(r) => setDialog({ type: r.type, entry: r })}
                        empty="Nenhum lançamento com esses filtros."
                        footer={
                            <>
                                <span>{entries.length} lançamento(s) · clique para alterar</span>
                                <span className="flex gap-4 tabular-nums">
                                    <span>
                                        Entradas: <b className="text-green-800">{money(totals.in)}</b>
                                    </span>
                                    <span>
                                        Saídas: <b className="text-[#b51f1f]">{money(totals.out)}</b>
                                    </span>
                                    <span>
                                        Saldo: <b>{money(totals.in - totals.out)}</b>
                                    </span>
                                </span>
                            </>
                        }
                    />
                </Block>
            </div>

            <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
                <DialogContent className="max-h-[92svh] overflow-y-auto rounded-[4px] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {dialog?.entry ? 'Alterar lançamento' : dialog?.type === 'entrada' ? 'Nova entrada' : 'Nova despesa'}
                        </DialogTitle>
                    </DialogHeader>
                    {dialog && (
                        <EntryForm
                            key={dialog.entry?.id ?? dialog.type}
                            type={dialog.type}
                            entry={dialog.entry}
                            options={options}
                            onDone={() => setDialog(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={paying !== null} onOpenChange={(o) => !o && setPaying(null)}>
                <DialogContent className="rounded-[4px] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{paying?.type === 'entrada' ? 'Registrar recebimento' : 'Registrar pagamento'}</DialogTitle>
                    </DialogHeader>
                    {paying && <PayForm key={paying.id} entry={paying} methods={methods} onDone={() => setPaying(null)} />}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
