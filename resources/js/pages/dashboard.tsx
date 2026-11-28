import { Block, Grid, OriginTag, OsMobileRow, Placa, Since, Situacao, Tool, type Col } from '@/components/erp';
import AppLayout from '@/layouts/app-layout';
import { OPEN_STATUSES, SERVICE_TYPE, STATUS, date, money, since, time } from '@/lib/os';
import { cn } from '@/lib/utils';
import type { OsCard, OsStatus, SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CalendarDays, ClipboardList, FilePlus2, RefreshCw } from 'lucide-react';

interface Props {
    counts: Partial<Record<OsStatus, number>>;
    oldest: Partial<Record<OsStatus, string | null>>;
    today: OsCard[];
    online: OsCard[];
    open: OsCard[];
    month: { revenue: number; delivered: number; ticket: number } | null;
}

const go = (os: OsCard) => router.visit(route('os.show', os.id));

/** O que o balcão precisa fazer agora, por etapa. */
const BALCAO_TODO: { status: OsStatus; text: string }[] = [
    { status: 'orcamento', text: 'orçamento(s) para lançar valores e enviar' },
    { status: 'aprovacao', text: 'aguardando o cliente aprovar (cobrar se demorar)' },
    { status: 'pecas', text: 'carro(s) esperando peças (lance a compra quando chegar)' },
    { status: 'pronto', text: 'carro(s) pronto(s): avisar o cliente e entregar' },
    { status: 'recebido', text: 'carro(s) na fila esperando mecânico' },
];

export default function Dashboard({ counts, oldest, today, online, open, month }: Props) {
    const { auth } = usePage<SharedData>().props;
    const total = OPEN_STATUSES.filter((s) => s !== 'aguardando').reduce((s, k) => s + (counts[k] ?? 0), 0);

    const agendaCols: Col<OsCard>[] = [
        { label: 'Hora', render: (r) => <b className="tabular-nums">{time(r.scheduled_at) || '—'}</b>, className: 'w-16' },
        {
            label: 'Placa',
            render: (r) => (r.vehicle?.plate ? <Placa value={r.vehicle.plate} /> : <span className="text-zinc-400">sem placa</span>),
            className: 'w-24',
        },
        { label: 'Veículo', render: (r) => r.vehicle?.title || '—' },
        {
            label: 'Cliente',
            render: (r) => (
                <span className="flex items-center gap-1.5">
                    {r.client?.name} <OriginTag origin={r.origin} />
                </span>
            ),
            hide: 'md',
        },
        { label: 'Solicitação', render: (r) => <span className="line-clamp-1">{r.complaint}</span>, hide: 'lg' },
    ];

    const openCols: Col<OsCard>[] = [
        { label: 'Nº OS', render: (r) => <b className="tabular-nums">{r.number}</b>, className: 'w-20' },
        { label: 'Placa', render: (r) => <Placa value={r.vehicle?.plate} />, className: 'w-24' },
        { label: 'Veículo', render: (r) => r.vehicle?.title },
        { label: 'Cliente', render: (r) => r.client?.name, hide: 'lg' },
        { label: 'Mecânico', render: (r) => r.mechanic?.name ?? <span className="text-zinc-400">—</span>, hide: 'lg' },
        {
            label: 'Etapa',
            render: (r) => (
                <span className="flex flex-wrap items-center gap-x-2">
                    <Situacao status={r.status} />
                    <Since iso={r.status_since} status={r.status} />
                </span>
            ),
        },
        { label: 'Valor', render: (r) => (r.total ? money(r.total) : <span className="text-zinc-400">—</span>), align: 'right', hide: 'sm' },
    ];

    const todo = BALCAO_TODO.filter((p) => counts[p.status]);

    return (
        <AppLayout
            title="Painel de Atendimento"
            code="ATD001"
            toolbar={
                <>
                    <Tool primary icon={<FilePlus2 />} label="Nova OS" fkey="F2" href={route('os.create')} />
                    <Tool icon={<ClipboardList />} label="Ordens" fkey="F4" href={route('os.index')} className="hidden md:inline-flex" />
                    <Tool icon={<CalendarDays />} label="Agenda" fkey="F9" href={route('mecanico.index')} className="hidden md:inline-flex" />
                    <Tool icon={<RefreshCw />} label="Atualizar" onClick={() => router.reload()} className="hidden md:inline-flex" />
                </>
            }
        >
            <Head title="Painel de Atendimento" />
            <div className="grid gap-5 md:gap-3 xl:grid-cols-[1fr_320px]">
                {/* celular e tablet: pendências e fluxo primeiro; a coluna lateral se desfaz (contents) e cada bloco ganha sua ordem */}
                <div className="order-3 grid min-w-0 content-start gap-5 md:gap-3 xl:order-none">
                    {online.length > 0 && (
                        <Block
                            title={`Agendamentos online · ${online.length}`}
                            className="md:border-l-4 md:border-l-emerald-600"
                            bodyClassName="p-0"
                            actions={<span className="text-[11px] text-zinc-500">abra para confirmar com o cliente</span>}
                        >
                            <Grid
                                cols={[
                                    {
                                        label: 'Quando',
                                        render: (r: OsCard) => (r.scheduled_at ? `${date(r.scheduled_at)} ${time(r.scheduled_at)}` : 'a combinar'),
                                        className: 'w-36',
                                    },
                                    {
                                        label: 'Cliente',
                                        render: (r: OsCard) => (
                                            <span className="flex items-center gap-1.5">
                                                <b>{r.client?.name}</b> <OriginTag origin={r.origin} />
                                            </span>
                                        ),
                                    },
                                    { label: 'Veículo', render: (r: OsCard) => r.vehicle?.title || '—', hide: 'md' },
                                    { label: 'Tipo', render: (r: OsCard) => (r.service_type ? SERVICE_TYPE[r.service_type] : '—'), hide: 'lg' },
                                    { label: 'Relato', render: (r: OsCard) => <span className="line-clamp-1">{r.complaint}</span>, hide: 'lg' },
                                ]}
                                rows={online}
                                rowKey={(r) => r.id}
                                onRowClick={go}
                                mobile={(r) => (
                                    <OsMobileRow
                                        os={r}
                                        when={
                                            <span className="text-[12px] font-semibold text-zinc-600">
                                                {r.scheduled_at ? `${date(r.scheduled_at)} ${time(r.scheduled_at)}` : 'a combinar'}
                                            </span>
                                        }
                                    />
                                )}
                            />
                        </Block>
                    )}

                    <Block title="Agendados para hoje" bodyClassName="p-0">
                        <Grid
                            cols={agendaCols}
                            rows={today}
                            rowKey={(r) => r.id}
                            onRowClick={go}
                            empty="Nenhum agendamento pendente para hoje."
                            mobile={(r) => <OsMobileRow os={r} when={<b className="text-[14px] tabular-nums">{time(r.scheduled_at) || '—'}</b>} />}
                        />
                    </Block>

                    <Block
                        title={`Na oficina · ${open.length}`}
                        bodyClassName="p-0"
                        actions={
                            <Link href={route('os.index')} className="text-[12px] font-semibold text-[#b51f1f] hover:underline">
                                Ver todas
                            </Link>
                        }
                    >
                        <Grid
                            cols={openCols}
                            rows={open}
                            rowKey={(r) => r.id}
                            onRowClick={go}
                            mobile={(r) => <OsMobileRow os={r} />}
                            empty="Nenhum carro na oficina."
                            footer={<span>Ordenado pelo que está parado há mais tempo</span>}
                        />
                    </Block>
                </div>

                <div className="contents xl:grid xl:content-start xl:gap-3">
                    {todo.length > 0 && (
                        <Block title="Pendências agora" className="order-1 md:border-l-4 md:border-l-[#d42a2a] xl:order-none" bodyClassName="p-0">
                            <ul>
                                {todo.map((p) => {
                                    const s = since(oldest[p.status], p.status);
                                    return (
                                        <li key={p.status} className="border-b border-[#e3e5e8] last:border-b-0">
                                            <Link
                                                href={route('os.index', { status: p.status })}
                                                className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-[#fdecec] md:min-h-0 md:px-3"
                                            >
                                                <span className="grid h-8 min-w-8 place-items-center rounded-lg bg-[#d42a2a] px-1.5 text-[14px] font-extrabold text-white tabular-nums md:h-7 md:min-w-7 md:rounded-md md:text-[13px]">
                                                    {counts[p.status]}
                                                </span>
                                                <span className="min-w-0 flex-1 text-[14px] leading-tight font-semibold md:text-[13px] md:font-normal">
                                                    {p.text}
                                                    {s.text && (
                                                        <span
                                                            className={cn(
                                                                'block text-[11px]',
                                                                s.stale ? 'font-bold text-[#b51f1f]' : 'text-zinc-500',
                                                            )}
                                                        >
                                                            {s.stale ? '⚠ ' : ''}mais antigo {s.text}
                                                        </span>
                                                    )}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Block>
                    )}

                    <section className="order-2 grid gap-2 xl:hidden">
                        <h2 className="flex items-center justify-between px-1 text-[12px] font-bold tracking-wider text-zinc-700 uppercase">
                            Fluxo da oficina <span className="font-semibold tracking-normal normal-case">{total} carro(s) na oficina</span>
                        </h2>
                        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
                            {OPEN_STATUSES.map((s) => {
                                const old = since(oldest[s], s);
                                const n = counts[s] ?? 0;
                                return (
                                    <Link
                                        key={s}
                                        href={route('os.index', { status: s })}
                                        className={cn(
                                            'flex min-w-[6.5rem] shrink-0 flex-col gap-1.5 rounded-xl border bg-white px-3 py-2.5 dark:bg-zinc-900',
                                            n && old.stale
                                                ? 'border-red-200 bg-red-50/70 dark:border-red-900'
                                                : 'border-[#e4e6ea] dark:border-zinc-800',
                                        )}
                                    >
                                        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300">
                                            <span className={cn('size-2 rounded-full', STATUS[s].dot)} />
                                            {STATUS[s].short}
                                        </span>
                                        <span className="flex items-baseline gap-1.5">
                                            <span className={cn('text-[22px] leading-none font-extrabold tabular-nums', !n && 'text-zinc-400')}>
                                                {n}
                                            </span>
                                            {n > 0 && old.text && (
                                                <span className={cn('text-[11px]', old.stale ? 'font-bold text-[#b51f1f]' : 'text-zinc-500')}>
                                                    {old.text}
                                                </span>
                                            )}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>

                    <Block title="Fluxo da oficina" className="hidden xl:block" bodyClassName="p-0">
                        <table className="w-full text-[13px]">
                            <tbody>
                                {OPEN_STATUSES.map((s) => {
                                    const old = since(oldest[s], s);
                                    return (
                                        <tr key={s} className="border-b border-[#e3e5e8] hover:bg-[#f8f9fa]">
                                            <td className="px-3 py-1.5">
                                                <Link href={route('os.index', { status: s })} className="flex items-center gap-2">
                                                    <span className={cn('size-2.5 shrink-0 rounded-[2px]', STATUS[s].dot)} />
                                                    {STATUS[s].short}
                                                </Link>
                                            </td>
                                            <td
                                                className={cn(
                                                    'px-1 py-1.5 text-right text-[11px] tabular-nums',
                                                    old.stale ? 'font-bold text-[#b51f1f]' : 'text-zinc-500',
                                                )}
                                            >
                                                {counts[s] ? old.text : ''}
                                            </td>
                                            <td className="w-10 px-3 py-1.5 text-right font-bold tabular-nums">{counts[s] ?? 0}</td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-[#f3f4f6] font-bold">
                                    <td className="px-3 py-1.5" colSpan={2}>
                                        Carros na oficina
                                    </td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{total}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Block>

                    {month && auth.can.master && (
                        <Block title="Resumo do mês" className="order-4 xl:order-none" bodyClassName="p-0">
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
