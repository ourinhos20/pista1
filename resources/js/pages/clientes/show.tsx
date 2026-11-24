import InputError from '@/components/input-error';
import { Empty, Info, OsRow, Page, PageHeader, Panel, PlateBadge } from '@/components/oficina';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { documentFmt, km, phone, whatsapp } from '@/lib/os';
import type { ClientData, OsCard, VehicleData } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Car, ChevronRight, MessageCircle, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { ClientForm } from './index';

export function VehicleForm({ clientId, vehicle, onDone }: { clientId?: number; vehicle?: VehicleData; onDone?: () => void }) {
    const { data, setData, post, put, processing, errors } = useForm({
        client_id: clientId ?? vehicle?.client_id,
        plate: vehicle?.plate ?? '',
        brand: vehicle?.brand ?? '',
        model: vehicle?.model ?? '',
        year: vehicle?.year ?? '',
        color: vehicle?.color ?? '',
        engine: vehicle?.engine ?? '',
        km: vehicle?.km ? String(vehicle.km) : '',
    });
    const fields: [Exclude<keyof typeof data, 'client_id'>, string][] = [
        ['plate', 'Placa'],
        ['brand', 'Marca'],
        ['model', 'Modelo'],
        ['year', 'Ano'],
        ['color', 'Cor'],
        ['engine', 'Motor'],
        ['km', 'Km atual'],
    ];
    return (
        <form
            className="grid gap-4"
            onSubmit={(e) => {
                e.preventDefault();
                const opts = { preserveScroll: true, onSuccess: () => onDone?.() };
                if (vehicle) put(route('veiculos.update', vehicle.id), opts);
                else post(route('veiculos.store'), opts);
            }}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                {fields.map(([k, label]) => (
                    <div key={k} className="grid gap-2">
                        <Label htmlFor={`v-${k}`}>{label}</Label>
                        <Input
                            id={`v-${k}`}
                            value={data[k]}
                            onChange={(e) => setData(k, k === 'plate' ? e.target.value.toUpperCase() : k === 'km' ? e.target.value.replace(/\D/g, '') : e.target.value)}
                            className={k === 'plate' ? 'h-12 font-mono text-lg font-bold tracking-widest uppercase' : 'h-12 text-base'}
                            inputMode={k === 'km' ? 'numeric' : undefined}
                        />
                        <InputError message={errors[k]} />
                    </div>
                ))}
            </div>
            <Button type="submit" size="lg" disabled={processing}>
                {vehicle ? 'Salvar veículo' : 'Cadastrar veículo'}
            </Button>
        </form>
    );
}

export default function ClienteShow({ client, vehicles, orders }: { client: ClientData; vehicles: VehicleData[]; orders: OsCard[] }) {
    const [editing, setEditing] = useState(false);
    const [adding, setAdding] = useState(false);
    const wa = whatsapp(client.phone, `Olá, ${client.name.split(' ')[0]}! Aqui é da Pista 1 Mecânica Automotiva.`);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Clientes', href: '/clientes' },
                { title: client.name, href: `/clientes/${client.id}` },
            ]}
        >
            <Head title={client.name} />
            <Page>
                <PageHeader
                    title={client.name}
                    subtitle={`${orders.length} ${orders.length === 1 ? 'OS' : 'ordens de serviço'} · ${vehicles.length} ${vehicles.length === 1 ? 'veículo' : 'veículos'}`}
                    actions={
                        <>
                            {wa && (
                                <Button size="lg" variant="outline" asChild>
                                    <a href={wa} target="_blank" rel="noreferrer">
                                        <MessageCircle className="size-5 text-green-600" /> WhatsApp
                                    </a>
                                </Button>
                            )}
                            <Dialog open={editing} onOpenChange={setEditing}>
                                <DialogTrigger asChild>
                                    <Button size="lg" variant="outline">
                                        <Pencil className="size-4" /> Editar
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-h-[90svh] overflow-y-auto rounded-2xl sm:max-w-xl">
                                    <DialogHeader>
                                        <DialogTitle>Editar cliente</DialogTitle>
                                    </DialogHeader>
                                    <ClientForm client={client} onDone={() => setEditing(false)} />
                                </DialogContent>
                            </Dialog>
                        </>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="grid content-start gap-6">
                        <Panel title="Dados">
                            <dl className="grid gap-4">
                                <Info label="WhatsApp">{phone(client.phone)}</Info>
                                <Info label="CPF / CNPJ">{documentFmt(client.document)}</Info>
                                <Info label="E-mail">{client.email}</Info>
                                <Info label="Endereço">{[client.address, client.city].filter(Boolean).join(' · ')}</Info>
                                {client.notes && <Info label="Observações">{client.notes}</Info>}
                            </dl>
                        </Panel>

                        <Panel
                            title="Veículos"
                            action={
                                <Dialog open={adding} onOpenChange={setAdding}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="outline">
                                            <Plus className="size-4" /> Veículo
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-h-[90svh] overflow-y-auto rounded-2xl sm:max-w-xl">
                                        <DialogHeader>
                                            <DialogTitle>Novo veículo</DialogTitle>
                                        </DialogHeader>
                                        <VehicleForm clientId={client.id} onDone={() => setAdding(false)} />
                                    </DialogContent>
                                </Dialog>
                            }
                        >
                            {vehicles.length ? (
                                <ul className="grid gap-1">
                                    {vehicles.map((v) => (
                                        <li key={v.id}>
                                            <Link href={route('veiculos.show', v.id)} className="hover:bg-muted -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5">
                                                <PlateBadge value={v.plate} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-semibold">{v.title || 'Veículo'}</p>
                                                    <p className="text-muted-foreground tabular text-sm">{km(v.km)}</p>
                                                </div>
                                                <ChevronRight className="text-muted-foreground size-4" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <Empty icon={<Car className="size-8 opacity-40" />} title="Nenhum veículo" />
                            )}
                        </Panel>
                    </div>

                    <Panel
                        title="Ordens de serviço"
                        className="lg:col-span-2"
                        action={
                            vehicles[0] && (
                                <Button size="sm" asChild>
                                    <Link href={route('os.create', { placa: vehicles[0].plate })}>
                                        <Plus className="size-4" /> Nova OS
                                    </Link>
                                </Button>
                            )
                        }
                    >
                        {orders.length ? (
                            <div className="divide-y">
                                {orders.map((os) => (
                                    <OsRow key={os.id} os={os} showMoney />
                                ))}
                            </div>
                        ) : (
                            <Empty title="Nenhuma OS ainda" />
                        )}
                    </Panel>
                </div>
            </Page>
        </AppLayout>
    );
}
