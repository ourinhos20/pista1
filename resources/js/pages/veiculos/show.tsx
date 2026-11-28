import { Block, Field, Grid, Placa, ReadOnly, Situacao, Tool, type Col } from '@/components/erp';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VehicleForm } from '@/components/vehicle-form';
import AppLayout from '@/layouts/app-layout';
import { date, km, money } from '@/lib/os';
import type { ClientData, OsCard, SharedData, VehicleData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { FilePlus2, Pencil } from 'lucide-react';
import { useState } from 'react';

type Entry = OsCard & { date: string; diagnosis: string | null; items: { type: string; description: string; quantity: number }[] };

export default function VeiculoShow({ vehicle, client, timeline }: { vehicle: VehicleData; client: ClientData | null; timeline: Entry[] }) {
    const { auth } = usePage<SharedData>().props;
    const sensitive = auth.can.sensitive;
    const [editing, setEditing] = useState(false);

    const cols: Col<Entry>[] = [
        { label: 'Data', render: (r) => date(r.date), className: 'w-24' },
        { label: 'OS', render: (r) => <b>{r.number}</b>, className: 'w-16' },
        { label: 'Km', render: (r) => km(r.km_in), align: 'right', className: 'w-28' },
        {
            label: 'Serviços / peças',
            render: (r) => (
                <div className="py-1">
                    <p className="line-clamp-2">{r.items.map((i) => i.description).join(' · ') || r.complaint}</p>
                    {r.diagnosis && <p className="text-muted-foreground line-clamp-1 text-[12px]">Diag.: {r.diagnosis}</p>}
                </div>
            ),
        },
        { label: 'Mecânico', render: (r) => r.mechanic?.name ?? '—', hide: 'lg', className: 'w-36' },
        { label: 'Situação', render: (r) => <Situacao status={r.status} />, hide: 'md', className: 'w-48' },
        ...(sensitive
            ? [
                  {
                      label: 'Valor',
                      render: (r: Entry) => (r.total ? money(r.total) : '—'),
                      align: 'right' as const,
                      hide: 'sm' as const,
                      className: 'w-28',
                  },
              ]
            : []),
    ];

    return (
        <AppLayout
            title={`Veículo · ${vehicle.title || vehicle.plate}`}
            code="CAD020"
            toolbar={
                sensitive && (
                    <>
                        <Tool primary icon={<FilePlus2 />} label="Nova OS" href={route('os.create', { placa: vehicle.plate })} />
                        <Tool icon={<Pencil />} label="Alterar" onClick={() => setEditing(true)} />
                    </>
                )
            }
        >
            <Head title={vehicle.plate} />
            <div className="grid gap-2 md:gap-3">
                <Block title="Dados do veículo">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                        <Field label="Placa">
                            <ReadOnly>
                                <Placa value={vehicle.plate} />
                            </ReadOnly>
                        </Field>
                        <Field label="Marca">
                            <ReadOnly>{vehicle.brand}</ReadOnly>
                        </Field>
                        <Field label="Modelo" className="col-span-2">
                            <ReadOnly>{vehicle.model}</ReadOnly>
                        </Field>
                        <Field label="Ano">
                            <ReadOnly>{vehicle.year}</ReadOnly>
                        </Field>
                        <Field label="Cor">
                            <ReadOnly>{vehicle.color}</ReadOnly>
                        </Field>
                        <Field label="Chassi">
                            <ReadOnly className="font-mono">{vehicle.chassis}</ReadOnly>
                        </Field>
                        {vehicle.engine && (
                            <Field label="Motor">
                                <ReadOnly>{vehicle.engine}</ReadOnly>
                            </Field>
                        )}
                        <Field label="Km atual">
                            <ReadOnly className="font-bold tabular-nums">{km(vehicle.km)}</ReadOnly>
                        </Field>
                        <Field label="Proprietário" className="col-span-2 md:col-span-4 xl:col-span-8">
                            <ReadOnly>
                                {sensitive && client ? (
                                    <a href={route('clientes.show', client.id)} className="text-[#b51f1f] hover:underline">
                                        {client.name}
                                    </a>
                                ) : (
                                    client?.name
                                )}
                            </ReadOnly>
                        </Field>
                    </div>
                </Block>

                <Block title={`Histórico de serviços · ${timeline.length}`} bodyClassName="p-0">
                    <Grid
                        cols={cols}
                        rows={timeline}
                        rowKey={(r) => r.id}
                        onRowClick={(r) => router.visit(route('os.show', r.id))}
                        empty="Nenhum serviço registrado."
                    />
                </Block>
            </div>

            <Dialog open={editing} onOpenChange={setEditing}>
                <DialogContent className="max-h-[90svh] overflow-y-auto rounded-[4px] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Alterar veículo</DialogTitle>
                    </DialogHeader>
                    <VehicleForm vehicle={vehicle} onDone={() => setEditing(false)} />
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
