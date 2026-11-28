import { Block, Grid, Placa, Since, Situacao, Tool, type Col } from '@/components/erp';
import AppLayout from '@/layouts/app-layout';
import { SERVICE_TYPE, WAITING_FOR, date, km, nextStep, time, workFor } from '@/lib/os';
import { cn } from '@/lib/utils';
import type { OsCard, SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, ClipboardCheck, Clock, FileText, Printer, RefreshCw } from 'lucide-react';
import { useState } from 'react';

const open = (os: OsCard) => router.visit(route('os.show', os.id));

function when(iso: string | null) {
    if (!iso) return 'Sem horário';
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const day = d.toDateString() === today.toDateString() ? 'Hoje' : d.toDateString() === tomorrow.toDateString() ? 'Amanhã' : date(iso);
    return `${day} ${time(iso)}`;
}

/** Cartão para o celular do mecânico. */
function MobileCard({ os, info = false }: { os: OsCard; info?: boolean }) {
    const { auth } = usePage<SharedData>().props;
    const next = info ? null : nextStep(os.status, auth.user.role);
    const [busy, setBusy] = useState(false);
    // em diagnóstico sem vistoria: o primeiro passo é a vistoria
    const needsInspection = os.status === 'diagnostico' && !os.inspected;
    // vistoria feita, mas o diagnóstico/checklist ainda não foi concluído
    const needsWork = os.status === 'diagnostico' && os.inspected && !os.work_done;
    const big = 'flex h-[52px] items-center justify-center gap-2 rounded-xl text-[15px] font-bold disabled:opacity-60 [&_svg]:size-5';

    return (
        <article className="bg-card overflow-hidden rounded-2xl border border-[#e4e6ea] shadow-[0_1px_2px_rgba(15,16,18,0.04)] dark:border-zinc-800">
            <Link href={route('os.show', os.id)} className="grid gap-2.5 px-4 pt-4 pb-3">
                <div className="flex items-center justify-between gap-2">
                    {os.vehicle?.plate ? (
                        <Placa value={os.vehicle.plate} />
                    ) : (
                        <span className="text-[13px] font-semibold text-zinc-500">sem placa</span>
                    )}
                    <Situacao status={os.status} short />
                </div>
                <div>
                    <p className="text-[17px] leading-snug font-bold tracking-tight">{os.vehicle?.title || 'Veículo'}</p>
                    <p className="text-[13px] text-zinc-600 dark:text-zinc-400">
                        {os.client?.name}
                        {os.km_in ? ` · ${km(os.km_in)}` : ''}
                        {os.service_type ? ` · ${SERVICE_TYPE[os.service_type]}` : ''}
                    </p>
                </div>
                {os.complaint && (
                    <p className="line-clamp-3 rounded-xl bg-[#f4f5f7] px-3 py-2.5 text-[14px] leading-snug text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        {os.complaint}
                    </p>
                )}
                <div className="flex items-center justify-between gap-2 text-[12px] text-zinc-500">
                    <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        {os.status === 'aguardando' ? (
                            when(os.scheduled_at)
                        ) : (
                            <Since iso={os.status_since} status={os.status} className="text-[12px]" />
                        )}
                    </span>
                    <span className="font-medium">
                        {os.status === 'aguardando' ? '' : `OS ${os.number}`}
                        {os.mechanic ? ` · ${os.mechanic.name}` : os.status === 'recebido' ? 'qualquer mecânico' : ''}
                    </span>
                </div>
                {!next && !info && WAITING_FOR[os.status] && <p className="text-[13px] font-medium text-amber-800">{WAITING_FOR[os.status]}</p>}
                {os.status === 'diagnostico' && !os.inspected && <p className="text-[13px] font-bold text-[#b51f1f]">Falta a vistoria de entrada</p>}
            </Link>
            {!info && (
                <div className="grid grid-cols-[1fr_52px] gap-2 px-3 pb-3">
                    {needsInspection ? (
                        <Link href={route('os.show', os.id)} className={cn(big, 'bg-[#d42a2a] text-white')}>
                            <ClipboardCheck /> Fazer a vistoria de entrada
                        </Link>
                    ) : needsWork ? (
                        <Link
                            href={route('os.show', os.id)}
                            className="flex h-12 items-center justify-center gap-2 rounded-[3px] bg-[#d42a2a] text-[15px] font-semibold text-white"
                        >
                            <ArrowRight className="size-5" /> Continuar atendimento
                        </Link>
                    ) : next ? (
                        <button
                            disabled={busy}
                            onClick={() => {
                                setBusy(true);
                                if (next.to === 'diagnostico') {
                                    // começa e já abre a ficha na vistoria
                                    router.patch(
                                        route('os.status', os.id),
                                        { status: next.to },
                                        { onSuccess: () => router.visit(route('os.show', os.id)), onFinish: () => setBusy(false) },
                                    );
                                } else {
                                    router.patch(
                                        route('os.status', os.id),
                                        { status: next.to },
                                        { preserveScroll: true, onFinish: () => setBusy(false) },
                                    );
                                }
                            }}
                            className={cn(big, 'bg-[#d42a2a] text-white')}
                        >
                            <ArrowRight /> {next.label}
                        </button>
                    ) : (
                        <Link
                            href={route('os.show', os.id)}
                            className={cn(
                                big,
                                'border border-[#dfe2e6] bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white',
                            )}
                        >
                            <FileText /> Abrir ficha
                        </Link>
                    )}
                    <a
                        href={route('os.print', [os.id, workFor(os.service_type).print])}
                        aria-label="Imprimir ficha"
                        className="grid h-[52px] place-items-center rounded-xl border border-[#dfe2e6] bg-white dark:border-zinc-700 dark:bg-zinc-900"
                    >
                        <Printer className="size-5" />
                    </a>
                </div>
            )}
        </article>
    );
}

type Seg = 'fila' | 'andamento' | 'agenda';

export default function AgendaOficina({ fila, andamento, agenda }: { fila: OsCard[]; andamento: OsCard[]; agenda: OsCard[] }) {
    // abre na fila quando tem carro esperando; senão, no que está em andamento
    const [seg, setSeg] = useState<Seg>(fila.length ? 'fila' : 'andamento');
    const segs: { value: Seg; label: string; rows: OsCard[]; empty: string }[] = [
        { value: 'fila', label: 'Fila', rows: fila, empty: 'Nenhum carro esperando.' },
        { value: 'andamento', label: 'Andamento', rows: andamento, empty: 'Nenhum carro em atendimento.' },
        { value: 'agenda', label: 'Agendados', rows: agenda, empty: 'Nenhum agendamento.' },
    ];
    const current = segs.find((s) => s.value === seg)!;
    const filaCols: Col<OsCard>[] = [
        { label: 'Chegou', render: (r) => <Since iso={r.status_since} status={r.status} />, className: 'w-24' },
        { label: 'Placa', render: (r) => <Placa value={r.vehicle?.plate} />, className: 'w-24' },
        { label: 'Veículo', render: (r) => r.vehicle?.title },
        { label: 'Tipo', render: (r) => (r.service_type ? SERVICE_TYPE[r.service_type] : '—'), className: 'w-36', hide: 'lg' },
        { label: 'O que o cliente relatou', render: (r) => <span className="line-clamp-1">{r.complaint}</span> },
        { label: 'Mecânico', render: (r) => r.mechanic?.name ?? <span className="text-zinc-400">qualquer um</span>, className: 'w-32', hide: 'lg' },
    ];
    const workCols: Col<OsCard>[] = [
        { label: 'OS', render: (r) => <b>{r.number}</b>, className: 'w-16' },
        { label: 'Placa', render: (r) => <Placa value={r.vehicle?.plate} />, className: 'w-24' },
        { label: 'Veículo', render: (r) => r.vehicle?.title },
        { label: 'Mecânico', render: (r) => r.mechanic?.name ?? '—', className: 'w-32' },
        {
            label: 'Etapa',
            render: (r) => (
                <span className="flex flex-wrap items-center gap-x-2">
                    <Situacao status={r.status} />
                    <Since iso={r.status_since} status={r.status} />
                    {r.status === 'diagnostico' && !r.inspected && <b className="text-[11px] text-[#b51f1f]">falta vistoria</b>}
                </span>
            ),
        },
    ];
    const agendaCols: Col<OsCard>[] = [
        { label: 'Quando', render: (r) => when(r.scheduled_at), className: 'w-32' },
        { label: 'Veículo', render: (r) => r.vehicle?.title || '—' },
        { label: 'Cliente', render: (r) => r.client?.name, className: 'w-28' },
        { label: 'Solicitação', render: (r) => <span className="line-clamp-1">{r.complaint}</span>, hide: 'lg' },
    ];

    return (
        <AppLayout title="Agenda da Oficina" code="OFI010" toolbar={<Tool icon={<RefreshCw />} label="Atualizar" onClick={() => router.reload()} />}>
            <Head title="Agenda da oficina" />

            {/* Computador */}
            <div className="hidden gap-3 md:grid">
                <Block title={`Fila · ${fila.length}`} bodyClassName="p-0">
                    <Grid cols={filaCols} rows={fila} rowKey={(r) => r.id} onRowClick={open} empty="Nenhum carro esperando." />
                </Block>
                <Block title={`Em andamento · ${andamento.length}`} bodyClassName="p-0">
                    <Grid cols={workCols} rows={andamento} rowKey={(r) => r.id} onRowClick={open} empty="Nenhum carro em atendimento." />
                </Block>
                <Block title={`Agendados · ${agenda.length}`} bodyClassName="p-0">
                    <Grid cols={agendaCols} rows={agenda} rowKey={(r) => r.id} onRowClick={open} empty="Nenhum agendamento." />
                </Block>
            </div>

            {/* Celular: abas Fila / Andamento / Agendados */}
            <div className="grid gap-3 md:hidden">
                <div role="tablist" aria-label="Agenda" className="grid grid-cols-3 gap-1 rounded-xl bg-[#e6e8eb] p-1 dark:bg-zinc-800">
                    {segs.map((s) => (
                        <button
                            key={s.value}
                            type="button"
                            role="tab"
                            aria-selected={seg === s.value}
                            onClick={() => setSeg(s.value)}
                            className={cn(
                                'flex h-10 items-center justify-center gap-1.5 rounded-[9px] text-[14px] font-semibold',
                                seg === s.value ? 'bg-white font-bold text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white' : 'text-zinc-600',
                            )}
                        >
                            {s.label}
                            <span
                                className={cn(
                                    'grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold',
                                    seg === s.value
                                        ? s.value === 'fila' && s.rows.length
                                            ? 'bg-[#d42a2a] text-white'
                                            : 'bg-zinc-900 text-white'
                                        : 'bg-zinc-300 text-zinc-800',
                                )}
                            >
                                {s.rows.length}
                            </span>
                        </button>
                    ))}
                </div>
                {current.rows.length ? (
                    current.rows.map((os) => <MobileCard key={os.id} os={os} info={seg === 'agenda'} />)
                ) : (
                    <p className="text-muted-foreground rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center text-[15px]">
                        {current.empty}
                    </p>
                )}
            </div>
        </AppLayout>
    );
}
