import { Block, Grid, Placa, Since, Situacao, Tool, type Col } from '@/components/erp';
import AppLayout from '@/layouts/app-layout';
import { SERVICE_TYPE, WAITING_FOR, date, km, nextStep, time } from '@/lib/os';
import type { OsCard, SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, ClipboardCheck, FileText, Printer, RefreshCw } from 'lucide-react';
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

    return (
        <article className={`bg-card overflow-hidden rounded-[4px] border ${info ? 'border-dashed border-zinc-300 opacity-80' : 'border-[#c9cdd3]'}`}>
            <Link href={route('os.show', os.id)} className="block p-3">
                <div className="flex items-start justify-between gap-2">
                    {os.vehicle?.plate ? <Placa value={os.vehicle.plate} big /> : <span className="text-[13px] text-zinc-500">sem placa</span>}
                    <div className="min-w-0 text-right">
                        <p className="text-[15px] font-bold whitespace-nowrap">{os.status === 'aguardando' ? when(os.scheduled_at) : `OS ${os.number}`}</p>
                        <Situacao status={os.status} short />
                        <div>
                            <Since iso={os.status_since} status={os.status} />
                        </div>
                    </div>
                </div>
                <p className="mt-2 text-[17px] font-bold">{os.vehicle?.title || 'Veículo'}</p>
                <p className="text-[14px] text-zinc-600 dark:text-zinc-400">
                    {os.client?.name}
                    {os.km_in ? ` · ${km(os.km_in)}` : ''}
                    {os.service_type ? ` · ${SERVICE_TYPE[os.service_type]}` : ''}
                    {os.mechanic ? ` · ${os.mechanic.name}` : ''}
                </p>
                {os.complaint && <p className="mt-2 line-clamp-3 border-l-4 border-[#d42a2a] bg-[#f6f7f8] px-2.5 py-1.5 text-[15px] dark:bg-zinc-800">{os.complaint}</p>}
                {!next && !info && WAITING_FOR[os.status] && <p className="mt-2 text-[13px] text-amber-800">{WAITING_FOR[os.status]}</p>}
            </Link>
            {!info && (
                <div className="grid grid-cols-[1fr_auto] gap-1.5 border-t border-[#e3e5e8] bg-[#f6f7f8] p-2 dark:bg-zinc-800">
                    {needsInspection ? (
                        <Link href={route('os.show', os.id)} className="flex h-12 items-center justify-center gap-2 rounded-[3px] bg-[#d42a2a] text-[15px] font-semibold text-white">
                            <ClipboardCheck className="size-5" /> Fazer a vistoria de entrada
                        </Link>
                    ) : next ? (
                        <button
                            disabled={busy}
                            onClick={() => {
                                setBusy(true);
                                if (next.to === 'diagnostico') {
                                    // começa e já abre a ficha na vistoria
                                    router.patch(route('os.status', os.id), { status: next.to }, { onSuccess: () => router.visit(route('os.show', os.id)), onFinish: () => setBusy(false) });
                                } else {
                                    router.patch(route('os.status', os.id), { status: next.to }, { preserveScroll: true, onFinish: () => setBusy(false) });
                                }
                            }}
                            className="flex h-12 items-center justify-center gap-2 rounded-[3px] bg-[#d42a2a] text-[15px] font-semibold text-white disabled:opacity-60"
                        >
                            <ArrowRight className="size-5" /> {next.label}
                        </button>
                    ) : (
                        <Link href={route('os.show', os.id)} className="flex h-12 items-center justify-center gap-2 rounded-[3px] border border-[#c9cdd3] bg-white text-[15px] font-semibold dark:bg-zinc-900">
                            <FileText className="size-5" /> Abrir ficha
                        </Link>
                    )}
                    <a
                        href={route('os.print', [os.id, 'diagnostico'])}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Imprimir ficha"
                        className="grid h-12 w-14 place-items-center rounded-[3px] border border-[#c9cdd3] bg-white dark:bg-zinc-900"
                    >
                        <Printer className="size-5" />
                    </a>
                </div>
            )}
        </article>
    );
}

export default function AgendaOficina({ fila, andamento, agenda }: { fila: OsCard[]; andamento: OsCard[]; agenda: OsCard[] }) {
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
                <Block title={`Fila: carros que chegaram e esperam mecânico · ${fila.length}`} className="border-l-4 border-l-cyan-600" bodyClassName="p-0">
                    <Grid cols={filaCols} rows={fila} rowKey={(r) => r.id} onRowClick={open} empty="Nenhum carro esperando. 👍" />
                </Block>
                <Block title={`Em andamento · ${andamento.length}`} bodyClassName="p-0">
                    <Grid cols={workCols} rows={andamento} rowKey={(r) => r.id} onRowClick={open} empty="Nenhum carro em atendimento." />
                </Block>
                <Block title={`Agendados (ainda não chegaram) · ${agenda.length}`} bodyClassName="p-0">
                    <Grid cols={agendaCols} rows={agenda} rowKey={(r) => r.id} onRowClick={open} empty="Nenhum agendamento." />
                </Block>
            </div>

            {/* Celular */}
            <div className="grid gap-2 md:hidden">
                <h2 className="px-1 pt-1 text-[13px] font-bold tracking-wide text-cyan-800 uppercase">Fila: chegaram · {fila.length}</h2>
                {fila.length ? fila.map((os) => <MobileCard key={os.id} os={os} />) : <p className="text-muted-foreground px-1 text-[15px]">Nenhum carro esperando.</p>}
                <h2 className="px-1 pt-3 text-[13px] font-bold tracking-wide text-zinc-600 uppercase">Em andamento · {andamento.length}</h2>
                {andamento.length ? andamento.map((os) => <MobileCard key={os.id} os={os} />) : <p className="text-muted-foreground px-1 text-[15px]">Nenhum carro em atendimento.</p>}
                <h2 className="px-1 pt-3 text-[13px] font-bold tracking-wide text-zinc-500 uppercase">Agendados (ainda não chegaram) · {agenda.length}</h2>
                {agenda.map((os) => (
                    <MobileCard key={os.id} os={os} info />
                ))}
            </div>
        </AppLayout>
    );
}
