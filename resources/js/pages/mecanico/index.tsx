import { Block, Grid, Placa, Situacao, Tool, type Col } from '@/components/erp';
import AppLayout from '@/layouts/app-layout';
import { date, km, nextStep, time } from '@/lib/os';
import type { OsCard, SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, FileText, Printer, RefreshCw } from 'lucide-react';
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
function MobileCard({ os }: { os: OsCard }) {
    const { auth } = usePage<SharedData>().props;
    const next = nextStep(os.status, auth.user.role);
    const [busy, setBusy] = useState(false);
    return (
        <article className="bg-card overflow-hidden rounded-[4px] border border-[#c9cdd3]">
            <Link href={route('os.show', os.id)} className="block p-3">
                <div className="flex items-center justify-between gap-2">
                    <Placa value={os.vehicle?.plate} big />
                    <div className="text-right">
                        <p className="text-[15px] font-bold">{os.status === 'aguardando' ? when(os.scheduled_at) : `OS ${os.number}`}</p>
                        <Situacao status={os.status} />
                    </div>
                </div>
                <p className="mt-2 text-[17px] font-bold">{os.vehicle?.title}</p>
                <p className="text-[14px] text-zinc-600 dark:text-zinc-400">
                    {os.client?.name} · {km(os.km_in ?? os.vehicle?.km)}
                    {os.mechanic ? ` · ${os.mechanic.name}` : ''}
                </p>
                {os.complaint && <p className="mt-2 line-clamp-3 border-l-4 border-[#d42a2a] bg-[#f6f7f8] px-2.5 py-1.5 text-[15px] dark:bg-zinc-800">{os.complaint}</p>}
            </Link>
            <div className="grid grid-cols-[1fr_auto] gap-1.5 border-t border-[#e3e5e8] bg-[#f6f7f8] p-2 dark:bg-zinc-800">
                {next ? (
                    <button
                        disabled={busy}
                        onClick={() => {
                            setBusy(true);
                            router.patch(route('os.status', os.id), { status: next.to }, { preserveScroll: true, onFinish: () => setBusy(false) });
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
        </article>
    );
}

export default function AgendaOficina({ agenda, working }: { agenda: OsCard[]; working: OsCard[] }) {
    const agendaCols: Col<OsCard>[] = [
        { label: 'Quando', render: (r) => <b>{when(r.scheduled_at)}</b>, className: 'w-32' },
        { label: 'Placa', render: (r) => <Placa value={r.vehicle?.plate} />, className: 'w-24' },
        { label: 'Veículo', render: (r) => r.vehicle?.title },
        { label: 'Cliente', render: (r) => r.client?.name, className: 'w-28' },
        { label: 'Solicitação', render: (r) => <span className="line-clamp-1">{r.complaint}</span> },
        { label: 'Mecânico', render: (r) => r.mechanic?.name ?? '—', hide: 'lg', className: 'w-36' },
    ];
    const workCols: Col<OsCard>[] = [
        { label: 'OS', render: (r) => <b>{r.number}</b>, className: 'w-16' },
        { label: 'Placa', render: (r) => <Placa value={r.vehicle?.plate} />, className: 'w-24' },
        { label: 'Veículo', render: (r) => r.vehicle?.title },
        { label: 'Km', render: (r) => km(r.km_in), align: 'right', hide: 'lg', className: 'w-28' },
        { label: 'Mecânico', render: (r) => r.mechanic?.name ?? '—', className: 'w-36' },
        { label: 'Situação', render: (r) => <Situacao status={r.status} />, className: 'w-48' },
    ];

    return (
        <AppLayout title="Agenda da Oficina" code="OFI010" toolbar={<Tool icon={<RefreshCw />} label="Atualizar" onClick={() => router.reload()} />}>
            <Head title="Agenda da oficina" />

            {/* Computador */}
            <div className="hidden gap-3 md:grid">
                <Block title={`Agendados · ${agenda.length}`} bodyClassName="p-0">
                    <Grid cols={agendaCols} rows={agenda} rowKey={(r) => r.id} onRowClick={open} empty="Nenhum carro agendado." />
                </Block>
                <Block title={`Na oficina · ${working.length}`} bodyClassName="p-0">
                    <Grid cols={workCols} rows={working} rowKey={(r) => r.id} onRowClick={open} empty="Nenhum carro em atendimento." />
                </Block>
            </div>

            {/* Celular */}
            <div className="grid gap-2 md:hidden">
                <h2 className="px-1 pt-1 text-[13px] font-bold tracking-wide text-zinc-600 uppercase">Agendados · {agenda.length}</h2>
                {agenda.length ? agenda.map((os) => <MobileCard key={os.id} os={os} />) : <p className="text-muted-foreground px-1 text-[15px]">Nenhum carro agendado.</p>}
                <h2 className="px-1 pt-3 text-[13px] font-bold tracking-wide text-zinc-600 uppercase">Na oficina · {working.length}</h2>
                {working.length ? working.map((os) => <MobileCard key={os.id} os={os} />) : <p className="text-muted-foreground px-1 text-[15px]">Nenhum carro em atendimento.</p>}
            </div>
        </AppLayout>
    );
}
