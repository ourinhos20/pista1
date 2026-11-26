import { Block, Grid, Tool, type Col } from '@/components/erp';
import { EntryForm, PayForm } from '@/components/finance-entry-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { dateBr, monthLabel, type EntryOptions, type EntryType, type FinanceRow, type OsToReceive } from '@/lib/finance';
import { money } from '@/lib/os';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import { CircleCheck, ListOrdered, Minus, Plus, Users } from 'lucide-react';
import { useState } from 'react';

type PartnerRow = { id: number; name: string; share: number; net: number; target: number; diff: number };
interface Props extends EntryOptions {
    month: string;
    summary: {
        cash: number;
        in: number;
        out: number;
        result: number;
        aportes: number;
        retiradas: number;
        receivable: number;
        receivable_overdue: number;
        payable: number;
        payable_overdue: number;
    };
    byCategory: { category: string; total: number }[];
    byMethod: { method: string; total: number }[];
    history: { month: string; in: number; out: number; result: number }[];
    upcoming: FinanceRow[];
    partners: { partners: PartnerRow[]; total: number };
    toBill: OsToReceive[];
}

function Indicator({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone?: 'pos' | 'neg' | 'warn' }) {
    return (
        <div className="min-w-0 border-r border-b border-[#d7dade] px-3 py-2 last:border-r-0 dark:border-zinc-700">
            <p className="truncate text-[11px] font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-400">{label}</p>
            <p className={cn('text-[19px] font-bold tabular-nums', tone === 'pos' && 'text-green-800', tone === 'neg' && 'text-[#b51f1f]')}>
                {money(value)}
            </p>
            {sub && <p className={cn('truncate text-[11px]', tone === 'warn' ? 'font-semibold text-[#b51f1f]' : 'text-zinc-500')}>{sub}</p>}
        </div>
    );
}

function Bar({ value, max, cls }: { value: number; max: number; cls: string }) {
    return (
        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800">
            <div className={cn('h-2', cls)} style={{ width: `${max ? Math.max(2, (Math.abs(value) / max) * 100) : 0}%` }} />
        </div>
    );
}

export default function PainelFinanceiro(p: Props) {
    const [dialog, setDialog] = useState<{ type: EntryType; osId?: number } | null>(null);
    const [paying, setPaying] = useState<FinanceRow | null>(null);
    const options: EntryOptions = { categories: p.categories, methods: p.methods, parties: p.parties, orders: p.orders, partnerList: p.partnerList };
    const toBillTotal = p.toBill.reduce((s, o) => s + o.remaining, 0);
    const s = p.summary;
    const catMax = Math.max(1, ...p.byCategory.map((c) => c.total));
    const histMax = Math.max(1, ...p.history.flatMap((h) => [h.in, h.out]));

    const upCols: Col<FinanceRow>[] = [
        {
            label: 'Vencimento',
            render: (r) => <span className={cn('tabular-nums', r.overdue && 'font-bold text-red-700')}>{dateBr(r.due_date)}</span>,
            className: 'w-24',
        },
        {
            label: 'Tipo',
            render: (r) => (
                <span className={cn('text-[11px] font-bold uppercase', r.type === 'entrada' ? 'text-green-700' : 'text-[#b51f1f]')}>
                    {r.type === 'entrada' ? 'Receber' : 'Pagar'}
                </span>
            ),
            className: 'w-16',
        },
        { label: 'Descrição', render: (r) => r.description },
        { label: 'Favorecido', render: (r) => r.party ?? '—', hide: 'lg' },
        { label: 'Valor', render: (r) => <b>{money(r.amount)}</b>, align: 'right', className: 'w-28' },
        {
            label: '',
            render: (r) => (
                <button
                    onClick={() => setPaying(r)}
                    className="inline-flex h-9 items-center gap-1 rounded-[3px] border border-green-700 bg-green-700 px-2 text-[12px] font-semibold text-white hover:bg-green-800 md:h-7"
                >
                    <CircleCheck className="size-3.5" /> Baixar
                </button>
            ),
            className: 'w-24',
            align: 'center',
        },
    ];

    return (
        <AppLayout
            title="Painel Financeiro"
            code="FIN001"
            toolbar={
                <>
                    <Input
                        type="month"
                        value={p.month}
                        onChange={(e) => router.get(route('financeiro.index'), { mes: e.target.value }, { preserveState: true })}
                        className="w-40"
                        aria-label="Mês"
                    />
                    <Tool primary icon={<Minus />} label="Nova despesa" onClick={() => setDialog({ type: 'saida' })} />
                    <Tool icon={<Plus className="text-green-700" />} label="Nova entrada" onClick={() => setDialog({ type: 'entrada' })} />
                    <Tool icon={<ListOrdered />} label="Lançamentos" href={route('financeiro.entries', { mes: p.month })} />
                    <Tool icon={<Users />} label="Sócios" href={route('financeiro.partners')} />
                </>
            }
        >
            <Head title="Financeiro" />
            <div className="grid gap-2 md:gap-3">
                <section className="bg-card overflow-hidden rounded-[4px] border border-[#c9cdd3]">
                    <header className="flex h-9 items-center border-b border-[#d7dade] bg-[#f3f4f6] px-3 text-[12px] font-bold tracking-wide text-zinc-700 uppercase dark:bg-zinc-800 dark:text-zinc-200">
                        Indicadores · {monthLabel(p.month)}
                    </header>
                    <div className="-mb-px grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                        <Indicator
                            label="Saldo em caixa"
                            value={s.cash}
                            tone={s.cash >= 0 ? undefined : 'neg'}
                            sub="Entradas − saídas + aportes − retiradas"
                        />
                        <Indicator label="Recebido no mês" value={s.in} tone="pos" />
                        <Indicator label="Pago no mês" value={s.out} tone="neg" />
                        <Indicator
                            label="Resultado do mês"
                            value={s.result}
                            tone={s.result >= 0 ? 'pos' : 'neg'}
                            sub={`Aportes ${money(s.aportes)} · Retiradas ${money(s.retiradas)}`}
                        />
                        <Indicator
                            label="A receber"
                            value={s.receivable}
                            sub={s.receivable_overdue ? `${money(s.receivable_overdue)} vencido` : 'Nada vencido'}
                            tone={s.receivable_overdue ? 'warn' : undefined}
                        />
                        <Indicator
                            label="A pagar"
                            value={s.payable}
                            sub={s.payable_overdue ? `${money(s.payable_overdue)} vencido` : 'Nada vencido'}
                            tone={s.payable_overdue ? 'warn' : undefined}
                        />
                    </div>
                </section>

                {p.toBill.length > 0 && (
                    <Block
                        title={`Pagamento não lançado · ${p.toBill.length} · ${money(toBillTotal)}`}
                        bodyClassName="p-0"
                        className="border-l-4 border-l-[#d42a2a]"
                    >
                        <p className="border-b border-[#e3e5e8] px-3 py-1.5 text-[12px] text-zinc-600">
                            Esse dinheiro ainda não está no caixa nem em "a receber". Lance o que o cliente pagou (ou vai pagar) para o financeiro
                            fechar.
                        </p>
                        <Grid
                            cols={[
                                { label: 'OS', render: (o: OsToReceive) => <b>{o.number}</b>, className: 'w-16' },
                                { label: 'Cliente', render: (o: OsToReceive) => o.client ?? '—' },
                                { label: 'Veículo', render: (o: OsToReceive) => o.vehicle, hide: 'md' },
                                { label: 'Etapa', render: (o: OsToReceive) => o.status_label, className: 'w-28', hide: 'sm' },
                                { label: 'Total', render: (o: OsToReceive) => money(o.total), align: 'right', className: 'w-28', hide: 'md' },
                                {
                                    label: 'Falta lançar',
                                    render: (o: OsToReceive) => <b className="text-[#b51f1f]">{money(o.remaining)}</b>,
                                    align: 'right',
                                    className: 'w-28',
                                },
                                {
                                    label: '',
                                    render: (o: OsToReceive) => (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDialog({ type: 'entrada', osId: o.id });
                                            }}
                                            className="inline-flex h-9 items-center gap-1 rounded-[3px] border border-green-700 bg-green-700 px-2 text-[12px] font-semibold text-white hover:bg-green-800 md:h-7"
                                        >
                                            <Plus className="size-3.5" /> Lançar
                                        </button>
                                    ),
                                    className: 'w-24',
                                    align: 'center',
                                },
                            ]}
                            rows={p.toBill}
                            rowKey={(o) => o.id}
                            onRowClick={(o) => router.visit(route('os.show', o.id))}
                        />
                    </Block>
                )}

                <div className="grid gap-2 md:gap-3 xl:grid-cols-[1fr_380px]">
                    <div className="grid min-w-0 content-start gap-2 md:gap-3">
                        <Block
                            title="Contas a vencer"
                            bodyClassName="p-0"
                            actions={
                                <Link
                                    href={route('financeiro.entries', { situacao: 'aberto' })}
                                    className="text-[12px] font-semibold text-[#b51f1f] hover:underline"
                                >
                                    Todas em aberto
                                </Link>
                            }
                        >
                            <Grid cols={upCols} rows={p.upcoming} rowKey={(r) => r.id} empty="Nenhuma conta para os próximos 15 dias." />
                        </Block>

                        <Block title="Últimos 6 meses" bodyClassName="p-0">
                            <table className="w-full text-[13px]">
                                <thead>
                                    <tr className="border-b border-[#c9cdd3] bg-[#eceef1] text-[11px] font-bold text-zinc-600 uppercase dark:bg-zinc-800">
                                        <th className="h-8 px-3 text-left">Mês</th>
                                        <th className="px-3 text-right">Entradas</th>
                                        <th className="px-3 text-right">Saídas</th>
                                        <th className="px-3 text-right">Resultado</th>
                                        <th className="hidden w-[30%] px-3 md:table-cell" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {p.history.map((h) => (
                                        <tr
                                            key={h.month}
                                            className={cn(
                                                'border-b border-[#e3e5e8] even:bg-[#f8f9fa] dark:even:bg-zinc-900/60',
                                                h.month === p.month && 'font-semibold',
                                            )}
                                        >
                                            <td className="px-3 py-1.5">{monthLabel(h.month)}</td>
                                            <td className="px-3 py-1.5 text-right text-green-800 tabular-nums">{money(h.in)}</td>
                                            <td className="px-3 py-1.5 text-right text-[#b51f1f] tabular-nums">{money(h.out)}</td>
                                            <td className={cn('px-3 py-1.5 text-right font-bold tabular-nums', h.result < 0 && 'text-[#b51f1f]')}>
                                                {money(h.result)}
                                            </td>
                                            <td className="hidden px-3 py-1.5 md:table-cell">
                                                <div className="grid gap-0.5">
                                                    <Bar value={h.in} max={histMax} cls="bg-green-600" />
                                                    <Bar value={h.out} max={histMax} cls="bg-[#d42a2a]" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Block>
                    </div>

                    <div className="grid content-start gap-2 md:gap-3">
                        <Block
                            title="Equilíbrio dos sócios"
                            bodyClassName="p-0"
                            actions={
                                <Link href={route('financeiro.partners')} className="text-[12px] font-semibold text-[#b51f1f] hover:underline">
                                    Detalhes
                                </Link>
                            }
                        >
                            <table className="w-full text-[13px]">
                                <tbody>
                                    {p.partners.partners.map((r) => (
                                        <tr key={r.id} className="border-b border-[#e3e5e8] last:border-b-0">
                                            <td className="px-3 py-2 font-semibold">{r.name}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{money(r.net)}</td>
                                            <td
                                                className={cn(
                                                    'w-32 px-3 py-2 text-right text-[12px] font-bold tabular-nums',
                                                    Math.abs(r.diff) < 1 ? 'text-zinc-500' : r.diff > 0 ? 'text-green-800' : 'text-[#b51f1f]',
                                                )}
                                            >
                                                {Math.abs(r.diff) < 1 ? 'em dia' : r.diff > 0 ? `+${money(r.diff)}` : `deve ${money(-r.diff)}`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Block>

                        <Block title="Despesas por categoria" bodyClassName="p-0">
                            {p.byCategory.length ? (
                                <table className="w-full text-[13px]">
                                    <tbody>
                                        {p.byCategory.map((c) => (
                                            <tr key={c.category} className="border-b border-[#e3e5e8] last:border-b-0">
                                                <td className="px-3 pt-1.5 pb-1">
                                                    <div className="flex justify-between gap-2">
                                                        <span className="truncate">{c.category}</span>
                                                        <b className="tabular-nums">{money(c.total)}</b>
                                                    </div>
                                                    <Bar value={c.total} max={catMax} cls="bg-zinc-700" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-muted-foreground px-3 py-4 text-[13px]">Nenhuma despesa paga no mês.</p>
                            )}
                        </Block>

                        <Block title="Recebimentos por forma" bodyClassName="p-0">
                            {p.byMethod.length ? (
                                <table className="w-full text-[13px]">
                                    <tbody>
                                        {p.byMethod.map((m) => (
                                            <tr key={m.method} className="border-b border-[#e3e5e8] last:border-b-0">
                                                <td className="px-3 py-1.5">{m.method}</td>
                                                <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{money(m.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-muted-foreground px-3 py-4 text-[13px]">Nenhum recebimento no mês.</p>
                            )}
                        </Block>
                    </div>
                </div>
            </div>

            <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
                <DialogContent className="max-h-[92svh] overflow-y-auto rounded-[4px] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{dialog?.type === 'entrada' ? 'Nova entrada' : 'Nova despesa'}</DialogTitle>
                    </DialogHeader>
                    {dialog && (
                        <EntryForm
                            key={`${dialog.type}-${dialog.osId ?? ''}`}
                            type={dialog.type}
                            osId={dialog.osId}
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
                    {paying && <PayForm key={paying.id} entry={paying} methods={p.methods} onDone={() => setPaying(null)} />}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
