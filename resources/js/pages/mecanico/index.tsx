import { Empty, Page, PageHeader, PlateBadge, StatusBadge } from '@/components/oficina';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { NEXT_STEP, km, time } from '@/lib/os';
import type { OsCard, OsStatus, SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, CalendarClock, ClipboardPen, UserCheck } from 'lucide-react';
import { useState } from 'react';

const MECHANIC_ALLOWED: OsStatus[] = ['diagnostico', 'aprovacao', 'execucao', 'pronto'];

function OsCardBig({ os, unassigned = false }: { os: OsCard; unassigned?: boolean }) {
    const { auth } = usePage<SharedData>().props;
    const isMechanic = auth.user.role === 'mecanico';
    const [busy, setBusy] = useState(false);
    const next = NEXT_STEP[os.status];
    const canNext = next && (!isMechanic || MECHANIC_ALLOWED.includes(next.to));

    return (
        <article className="bg-card rounded-3xl p-5 ring-1 ring-black/5 dark:ring-white/10">
            <Link href={route('os.show', os.id)} className="block">
                <div className="flex items-start justify-between gap-3">
                    <PlateBadge value={os.vehicle?.plate} size="lg" />
                    <StatusBadge status={os.status} />
                </div>
                <h2 className="mt-3 text-xl font-bold tracking-tight">{os.vehicle?.title || 'Veículo'}</h2>
                <p className="text-muted-foreground mt-0.5 text-[15px]">
                    {os.client?.name} · <span className="tabular">{km(os.km_in ?? os.vehicle?.km)}</span>
                    {os.vehicle?.color ? ` · ${os.vehicle.color}` : ''}
                </p>
                {os.scheduled_at && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium">
                        <CalendarClock className="size-4" /> Agendado {time(os.scheduled_at)}
                    </p>
                )}
                {os.complaint && <p className="bg-muted mt-3 line-clamp-3 rounded-2xl px-4 py-3 text-base leading-snug">{os.complaint}</p>}
            </Link>

            <div className="mt-4 grid gap-2">
                {unassigned && isMechanic ? (
                    <Button size="lg" onClick={() => router.post(route('os.assume', os.id), {}, { preserveScroll: true })}>
                        <UserCheck className="size-5" /> Pegar este carro
                    </Button>
                ) : (
                    canNext && (
                        <Button
                            size="lg"
                            disabled={busy}
                            onClick={() => {
                                setBusy(true);
                                router.patch(route('os.status', os.id), { status: next.to }, { preserveScroll: true, onFinish: () => setBusy(false) });
                            }}
                        >
                            <ArrowRight className="size-5" /> {next.label}
                        </Button>
                    )
                )}
                <Button size="lg" variant="outline" asChild>
                    <Link href={route('os.show', os.id)}>
                        <ClipboardPen className="size-5" /> Anotar diagnóstico / pedir peça
                    </Link>
                </Button>
            </div>
        </article>
    );
}

export default function MinhasOs({ mine, unassigned }: { mine: OsCard[]; unassigned: OsCard[] }) {
    const { auth } = usePage<SharedData>().props;
    const isMechanic = auth.user.role === 'mecanico';

    return (
        <AppLayout breadcrumbs={[{ title: isMechanic ? 'Minhas OS' : 'Oficina', href: '/mecanico' }]}>
            <Head title={isMechanic ? 'Minhas OS' : 'Oficina'} />
            <Page className="max-w-3xl">
                <PageHeader
                    title={isMechanic ? 'Meus carros' : 'Carros com mecânico'}
                    subtitle={`${mine.length} ${mine.length === 1 ? 'carro' : 'carros'} em andamento`}
                />

                {mine.length ? (
                    <div className="grid gap-4">
                        {mine.map((os) => (
                            <OsCardBig key={os.id} os={os} />
                        ))}
                    </div>
                ) : (
                    <Empty title="Nenhum carro com você agora" text="Pegue um carro da fila abaixo ou aguarde o balcão atribuir." />
                )}

                {unassigned.length > 0 && (
                    <>
                        <h2 className="mt-4 text-xl font-bold tracking-tight">Fila sem mecânico</h2>
                        <div className="grid gap-4">
                            {unassigned.map((os) => (
                                <OsCardBig key={os.id} os={os} unassigned />
                            ))}
                        </div>
                    </>
                )}
            </Page>
        </AppLayout>
    );
}
