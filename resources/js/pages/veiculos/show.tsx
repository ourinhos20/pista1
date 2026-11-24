import { Empty, Info, Page, Panel, PlateBadge, StatusBadge } from '@/components/oficina';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { date, km, money } from '@/lib/os';
import type { ClientData, OsCard, SharedData, VehicleData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { VehicleForm } from '../clientes/show';

type Entry = OsCard & { date: string; diagnosis: string | null; items: { type: string; description: string; quantity: number }[] };

export default function VeiculoShow({ vehicle, client, timeline }: { vehicle: VehicleData; client: ClientData | null; timeline: Entry[] }) {
    const { auth } = usePage<SharedData>().props;
    const sensitive = auth.can.sensitive;
    const [editing, setEditing] = useState(false);

    return (
        <AppLayout breadcrumbs={[{ title: `Veículo ${vehicle.plate}`, href: `/veiculos/${vehicle.id}` }]}>
            <Head title={vehicle.plate} />
            <Page className="max-w-4xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                        <PlateBadge value={vehicle.plate} size="lg" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{vehicle.title || 'Veículo'}</h1>
                            <p className="text-muted-foreground text-[15px]">
                                {client && sensitive ? (
                                    <Link href={route('clientes.show', client.id)} className="hover:underline">
                                        {client.name}
                                    </Link>
                                ) : (
                                    client?.name
                                )}
                            </p>
                        </div>
                    </div>
                    {sensitive && (
                        <div className="flex gap-2">
                            <Dialog open={editing} onOpenChange={setEditing}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="lg">
                                        <Pencil className="size-4" /> Editar
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-h-[90svh] overflow-y-auto rounded-2xl sm:max-w-xl">
                                    <DialogHeader>
                                        <DialogTitle>Editar veículo</DialogTitle>
                                    </DialogHeader>
                                    <VehicleForm vehicle={vehicle} onDone={() => setEditing(false)} />
                                </DialogContent>
                            </Dialog>
                            <Button size="lg" asChild>
                                <Link href={route('os.create', { placa: vehicle.plate })}>
                                    <Plus className="size-5" /> Nova OS
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>

                <Panel>
                    <dl className="grid grid-cols-2 gap-4 md:grid-cols-5">
                        <Info label="Km atual">
                            <span className="tabular text-lg font-bold">{km(vehicle.km)}</span>
                        </Info>
                        <Info label="Marca">{vehicle.brand}</Info>
                        <Info label="Ano">{vehicle.year}</Info>
                        <Info label="Motor">{vehicle.engine}</Info>
                        <Info label="Cor">{vehicle.color}</Info>
                    </dl>
                </Panel>

                <section>
                    <h2 className="mb-4 text-xl font-bold tracking-tight">Linha do tempo</h2>
                    {timeline.length ? (
                        <ol className="relative grid gap-4 border-l-2 border-zinc-200 pl-6 dark:border-zinc-800">
                            {timeline.map((t) => (
                                <li key={t.id} className="relative">
                                    <span className="bg-background absolute top-5 -left-[33px] size-4 rounded-full border-4 border-[#ee3c3a]" />
                                    <Link href={route('os.show', t.id)} className="bg-card block rounded-2xl p-5 ring-1 ring-black/5 transition hover:shadow-md dark:ring-white/10">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="font-semibold">
                                                {date(t.date)} <span className="text-muted-foreground tabular font-normal">· {km(t.km_in)} · OS {t.number}</span>
                                            </p>
                                            <StatusBadge status={t.status} />
                                        </div>
                                        {t.complaint && <p className="text-muted-foreground mt-2 text-[15px]">{t.complaint}</p>}
                                        {t.items.length > 0 && (
                                            <ul className="mt-3 flex flex-wrap gap-1.5">
                                                {t.items.map((i, idx) => (
                                                    <li key={idx} className="bg-muted rounded-full px-3 py-1 text-sm font-medium">
                                                        {i.description}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {t.diagnosis && <p className="mt-3 border-l-2 pl-3 text-sm whitespace-pre-line">{t.diagnosis}</p>}
                                        <p className="text-muted-foreground mt-3 text-sm">
                                            {t.mechanic?.name ?? 'Sem mecânico'}
                                            {sensitive && t.total !== undefined ? ` · ${money(t.total)}` : ''}
                                        </p>
                                    </Link>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <Empty title="Nenhum serviço registrado" />
                    )}
                </section>
            </Page>
        </AppLayout>
    );
}
