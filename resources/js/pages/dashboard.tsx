import { Empty, OsRow, Page, PageHeader, Panel } from '@/components/oficina';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { OPEN_STATUSES, STATUS, money } from '@/lib/os';
import { cn } from '@/lib/utils';
import type { OsCard, OsStatus, SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { CalendarClock, Plus } from 'lucide-react';

interface Props {
    counts: Partial<Record<OsStatus, number>>;
    today: OsCard[];
    open: OsCard[];
    month: { revenue: number; delivered: number; ticket: number } | null;
}

function greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Dashboard({ counts, today, open, month }: Props) {
    const { auth } = usePage<SharedData>().props;
    const totalOpen = OPEN_STATUSES.reduce((s, k) => s + (counts[k] ?? 0), 0);
    const firstName = auth.user.name.split(' ')[0];

    return (
        <AppLayout breadcrumbs={[{ title: 'Painel', href: '/dashboard' }]}>
            <Head title="Painel" />
            <Page>
                <PageHeader
                    title={`${greeting()}, ${firstName}`}
                    subtitle={
                        <>
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} · <b className="text-foreground">{totalOpen}</b> carros na
                            oficina
                        </>
                    }
                    actions={
                        <Button asChild size="lg" className="w-full md:w-auto">
                            <Link href={route('os.create')}>
                                <Plus className="size-5" /> Nova OS
                            </Link>
                        </Button>
                    }
                />

                {/* OS por status */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {OPEN_STATUSES.map((s) => (
                        <Link
                            key={s}
                            href={route('os.index', { status: s })}
                            className="bg-card group rounded-2xl p-4 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md dark:ring-white/10"
                        >
                            <div className="flex items-start gap-2">
                                <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', STATUS[s].dot)} />
                                <span className="text-muted-foreground text-sm leading-snug font-medium">{STATUS[s].label}</span>
                            </div>
                            <div className="tabular mt-2 text-4xl font-bold tracking-tight">{counts[s] ?? 0}</div>
                        </Link>
                    ))}
                </div>

                {month && (
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-zinc-950 p-5 text-white ring-1 ring-white/10">
                            <p className="text-sm font-medium text-zinc-400">Faturamento do mês</p>
                            <p className="tabular mt-1 text-3xl font-bold tracking-tight md:text-4xl">{money(month.revenue)}</p>
                            <p className="mt-1 text-sm text-zinc-400">OS entregues neste mês</p>
                        </div>
                        <div className="bg-card rounded-2xl p-5 ring-1 ring-black/5 dark:ring-white/10">
                            <p className="text-muted-foreground text-sm font-medium">Carros entregues</p>
                            <p className="tabular mt-1 text-3xl font-bold tracking-tight">{month.delivered}</p>
                        </div>
                        <div className="bg-card rounded-2xl p-5 ring-1 ring-black/5 dark:ring-white/10">
                            <p className="text-muted-foreground text-sm font-medium">Ticket médio</p>
                            <p className="tabular mt-1 text-3xl font-bold tracking-tight">{money(month.ticket)}</p>
                        </div>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-5">
                    <Panel
                        title="Em andamento"
                        className="lg:col-span-3"
                        action={
                            <Link href={route('os.index')} className="text-primary text-sm font-semibold">
                                Ver todas
                            </Link>
                        }
                    >
                        {open.length ? (
                            <div className="divide-y">
                                {open.map((os) => (
                                    <OsRow key={os.id} os={os} showMoney={auth.can.sensitive} />
                                ))}
                            </div>
                        ) : (
                            <Empty title="Nenhum carro na oficina" text="Abra uma OS quando o cliente chegar ou agendar." />
                        )}
                    </Panel>

                    <Panel title="Agenda de hoje" className="lg:col-span-2">
                        {today.length ? (
                            <div className="divide-y">
                                {today.map((os) => (
                                    <OsRow key={os.id} os={os} />
                                ))}
                            </div>
                        ) : (
                            <Empty icon={<CalendarClock className="size-8 opacity-40" />} title="Nada agendado para hoje" text="Agendamentos feitos pelo WhatsApp aparecem aqui." />
                        )}
                    </Panel>
                </div>
            </Page>
        </AppLayout>
    );
}
