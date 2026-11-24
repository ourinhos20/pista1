import { Block, Grid, Placa, Situacao, Tool, type Col } from '@/components/erp';
import AppLayout from '@/layouts/app-layout';
import { OPEN_STATUSES, STATUS, date, money, time } from '@/lib/os';
import { cn } from '@/lib/utils';
import type { OsCard, OsStatus, SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CalendarDays, ClipboardList, FilePlus2, RefreshCw } from 'lucide-react';

interface Props {
    counts: Partial<Record<OsStatus, number>>;
    today: OsCard[];
    open: OsCard[];
    month: { revenue: number; delivered: number; ticket: number } | null;
}

const go = (os: OsCard) => router.visit(route('os.show', os.id));

export default function Dashboard({ counts, today, open, month }: Props) {
    const { auth } = usePage<SharedData>().props;
    const total = OPEN_STATUSES.reduce((s, k) => s + (counts[k] ?? 0), 0);

    const agendaCols: Col<OsCard>[] = [
        { label: 'Hora', render: (r) => <b className="tabular-nums">{time(r.scheduled_at)}</b>, className: 'w-16' },
        { label: 'Placa', render: (r) => <Placa value={r.vehicle?.plate} />, className: 'w-24' },
        { label: 'Veículo', render: (r) => r.vehicle?.title },
        { label: 'Cliente', render: (r) => r.client?.name, hide: 'md' },
        { label: 'Solicitação', render: (r) => <span className="line-clamp-1">{r.complaint}</span>, hide: 'lg' },
        { label: 'Situação', render: (r) => <Situacao status={r.status} /> },
    ];

    const openCols: Col<OsCard>[] = [
        { label: 'Nº OS', render: (r) => <b className="tabular-nums">{r.number}</b>, className: 'w-20' },
        { label: 'Placa', render: (r) => <Placa value={r.vehicle?.plate} />, className: 'w-24' },
        { label: 'Veículo', render: (r) => r.vehicle?.title },
        { label: 'Cliente', render: (r) => r.client?.name, hide: 'md' },
        { label: 'Mecânico', render: (r) => r.mechanic?.name ?? <span className="text-zinc-400">—</span>, hide: 'lg' },
        { label: 'Situação', render: (r) => <Situacao status={r.status} /> },
        { label: 'Valor', render: (r) => (r.total ? money(r.total) : <span className="text-zinc-400">—</span>), align: 'right', hide: 'sm' },
    ];

    const pend = [
        { status: 'orcamento' as OsStatus, text: 'orçamentos para lançar valores' },
        { status: 'aprovacao' as OsStatus, text: 'aguardando o cliente autorizar' },
        { status: 'pronto' as OsStatus, text: 'carros prontos para avisar o cliente' },
    ].filter((p) => counts[p.status]);

    return (
        <AppLayout
            title="Painel de Atendimento"
            code="ATD001"
            toolbar={
                <>
                    <Tool primary icon={<FilePlus2 />} label="Nova OS" fkey="F2" href={route('os.create')} />
                    <Tool icon={<ClipboardList />} label="Ordens" fkey="F4" href={route('os.index')} />
                    <Tool icon={<CalendarDays />} label="Agenda" fkey="F9" href={route('mecanico.index')} />
                    <Tool icon={<RefreshCw />} label="Atualizar" onClick={() => router.reload()} className="hidden md:inline-flex" />
                </>
            }
        >
            <Head title="Painel de Atendimento" />
            <div className="grid gap-2 md:gap-3 xl:grid-cols-[1fr_300px]">
                <div className="grid min-w-0 content-start gap-2 md:gap-3">
                    <Block title={`Agenda de hoje · ${date(new Date().toISOString())}`} bodyClassName="p-0">
                        <Grid cols={agendaCols} rows={today} rowKey={(r) => r.id} onRowClick={go} empty="Nenhum agendamento para hoje." />
                    </Block>

                    <Block title="OS em andamento" bodyClassName="p-0" actions={<Link href={route('os.index')} className="text-[12px] font-semibold text-[#b51f1f] hover:underline">Ver todas</Link>}>
                        <Grid cols={openCols} rows={open} rowKey={(r) => r.id} onRowClick={go} empty="Nenhum carro em atendimento." footer={<span>{open.length} registro(s)</span>} />
                    </Block>
                </div>

                <div className="grid content-start gap-2 md:gap-3">
                    {pend.length > 0 && (
                        <Block title="Pendências do balcão" className="border-l-4 border-l-[#d42a2a]" bodyClassName="p-0">
                            <ul>
                                {pend.map((p) => (
                                    <li key={p.status} className="border-b border-[#e3e5e8] last:border-b-0">
                                        <Link href={route('os.index', { status: p.status })} className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#fdecec]">
                                            <span className="grid h-7 min-w-7 place-items-center rounded-[3px] bg-[#d42a2a] px-1.5 text-[13px] font-bold text-white tabular-nums">{counts[p.status]}</span>
                                            <span className="text-[13px] leading-tight">{p.text}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </Block>
                    )}

                    <Block title="Situação das OS" bodyClassName="p-0">
                        <table className="w-full text-[13px]">
                            <tbody>
                                {OPEN_STATUSES.map((s) => (
                                    <tr key={s} className="border-b border-[#e3e5e8] hover:bg-[#f8f9fa]">
                                        <td className="px-3 py-1.5">
                                            <Link href={route('os.index', { status: s })} className="flex items-center gap-2">
                                                <span className={cn('size-2.5 rounded-[2px]', STATUS[s].dot)} />
                                                {STATUS[s].label}
                                            </Link>
                                        </td>
                                        <td className="w-12 px-3 py-1.5 text-right font-bold tabular-nums">{counts[s] ?? 0}</td>
                                    </tr>
                                ))}
                                <tr className="bg-[#f3f4f6] font-bold">
                                    <td className="px-3 py-1.5">Total na oficina</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{total}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Block>

                    {month && auth.can.master && (
                        <Block title="Resumo do mês" bodyClassName="p-0">
                            <table className="w-full text-[13px]">
                                <tbody>
                                    <tr className="border-b border-[#e3e5e8]">
                                        <td className="px-3 py-2">Faturamento (OS entregues)</td>
                                        <td className="px-3 py-2 text-right text-[15px] font-bold tabular-nums">{money(month.revenue)}</td>
                                    </tr>
                                    <tr className="border-b border-[#e3e5e8]">
                                        <td className="px-3 py-2">Carros entregues</td>
                                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{month.delivered}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2">Ticket médio</td>
                                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(month.ticket)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </Block>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
