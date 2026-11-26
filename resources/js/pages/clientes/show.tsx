import { Block, Field, Grid, Placa, ReadOnly, Situacao, Tool, type Col } from '@/components/erp';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { VehiclePicker } from '@/components/vehicle-picker';
import AppLayout from '@/layouts/app-layout';
import { date, documentFmt, km, money, phone, whatsapp } from '@/lib/os';
import type { ClientData, OsCard, VehicleData } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { CarFront, FilePlus2, MessageCircle, Pencil, Save } from 'lucide-react';
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
        chassis: vehicle?.chassis ?? '',
        km: vehicle?.km ? String(vehicle.km) : '',
    });
    const fields: [Exclude<keyof typeof data, 'client_id' | 'brand' | 'model'>, string][] = [
        ['year', 'Ano'],
        ['color', 'Cor'],
        ['chassis', 'Chassi'],
        ['km', 'Km atual'],
    ];
    return (
        <form
            className="grid gap-3"
            onSubmit={(e) => {
                e.preventDefault();
                const opts = { preserveScroll: true, onSuccess: () => onDone?.() };
                if (vehicle) put(route('veiculos.update', vehicle.id), opts);
                else post(route('veiculos.store'), opts);
            }}
        >
            <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Placa *" error={errors.plate}>
                    <Input
                        value={data.plate}
                        onChange={(e) => setData('plate', e.target.value.toUpperCase())}
                        className="font-mono font-bold tracking-widest uppercase"
                    />
                </Field>
                <VehiclePicker
                    brand={data.brand}
                    model={data.model}
                    onBrand={(v) => setData('brand', v)}
                    onModel={(v) => setData('model', v)}
                    errors={{ brand: errors.brand, model: errors.model }}
                    modelClassName="sm:col-span-2"
                />
                {fields.map(([k, label]) => (
                    <Field key={k} label={label} error={errors[k]}>
                        <Input
                            value={data[k]}
                            onChange={(e) =>
                                setData(
                                    k,
                                    k === 'chassis' ? e.target.value.toUpperCase() : k === 'km' ? e.target.value.replace(/\D/g, '') : e.target.value,
                                )
                            }
                            className={k === 'chassis' ? 'font-mono uppercase' : ''}
                            maxLength={k === 'chassis' ? 17 : undefined}
                            inputMode={k === 'km' ? 'numeric' : undefined}
                        />
                    </Field>
                ))}
            </div>
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={processing}
                    className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white md:h-8"
                >
                    <Save className="size-4" /> Gravar veículo
                </button>
            </div>
        </form>
    );
}

export default function ClienteShow({ client, vehicles, orders }: { client: ClientData; vehicles: VehicleData[]; orders: OsCard[] }) {
    const [dialog, setDialog] = useState<'cliente' | 'veiculo' | null>(null);
    const wa = whatsapp(client.phone, `Olá, ${client.name.split(' ')[0]}! Aqui é da Pista 1 Mecânica Automotiva.`);

    const vCols: Col<VehicleData>[] = [
        { label: 'Placa', render: (r) => <Placa value={r.plate} />, className: 'w-24' },
        { label: 'Veículo', render: (r) => r.title },
        { label: 'Cor', render: (r) => r.color ?? '—', hide: 'md' },
        { label: 'Km atual', render: (r) => km(r.km), align: 'right', className: 'w-28' },
    ];
    const oCols: Col<OsCard>[] = [
        { label: 'Nº OS', render: (r) => <b>{r.number}</b>, className: 'w-20' },
        { label: 'Data', render: (r) => date(r.created_at), className: 'w-24' },
        { label: 'Placa', render: (r) => <Placa value={r.vehicle?.plate} />, className: 'w-24', hide: 'sm' },
        { label: 'Solicitação', render: (r) => <span className="line-clamp-1">{r.complaint}</span>, hide: 'md' },
        { label: 'Situação', render: (r) => <Situacao status={r.status} /> },
        { label: 'Valor', render: (r) => (r.total ? money(r.total) : '—'), align: 'right' },
    ];

    return (
        <AppLayout
            title={`Cliente · ${client.name}`}
            code="CAD011"
            toolbar={
                <>
                    {vehicles[0] && <Tool primary icon={<FilePlus2 />} label="Nova OS" href={route('os.create', { placa: vehicles[0].plate })} />}
                    <Tool icon={<Pencil />} label="Alterar" onClick={() => setDialog('cliente')} />
                    <Tool icon={<CarFront />} label="Incluir veículo" onClick={() => setDialog('veiculo')} />
                    {wa && <Tool icon={<MessageCircle className="text-green-600" />} label="WhatsApp" href={wa} external />}
                </>
            }
        >
            <Head title={client.name} />
            <div className="grid gap-2 md:gap-3">
                <Block title="Dados cadastrais">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        <Field label="Código">
                            <ReadOnly>{String(client.id).padStart(5, '0')}</ReadOnly>
                        </Field>
                        <Field label="Nome" className="lg:col-span-3">
                            <ReadOnly className="font-semibold">{client.name}</ReadOnly>
                        </Field>
                        <Field label="CPF / CNPJ" className="lg:col-span-2">
                            <ReadOnly>{documentFmt(client.document)}</ReadOnly>
                        </Field>
                        <Field label="WhatsApp">
                            <ReadOnly>{phone(client.phone)}</ReadOnly>
                        </Field>
                        <Field label="E-mail" className="lg:col-span-2">
                            <ReadOnly>{client.email}</ReadOnly>
                        </Field>
                        <Field label="Endereço" className="lg:col-span-2">
                            <ReadOnly>{client.address}</ReadOnly>
                        </Field>
                        <Field label="Cidade">
                            <ReadOnly>{client.city}</ReadOnly>
                        </Field>
                        {client.notes && (
                            <Field label="Observações" className="sm:col-span-2 lg:col-span-6">
                                <ReadOnly>{client.notes}</ReadOnly>
                            </Field>
                        )}
                    </div>
                </Block>

                <div className="grid gap-2 md:gap-3 xl:grid-cols-[2fr_3fr]">
                    <Block title={`Veículos · ${vehicles.length}`} bodyClassName="p-0">
                        <Grid
                            cols={vCols}
                            rows={vehicles}
                            rowKey={(r) => r.id}
                            onRowClick={(r) => router.visit(route('veiculos.show', r.id))}
                            empty="Nenhum veículo."
                        />
                    </Block>
                    <Block title={`Ordens de serviço · ${orders.length}`} bodyClassName="p-0">
                        <Grid
                            cols={oCols}
                            rows={orders}
                            rowKey={(r) => r.id}
                            onRowClick={(r) => router.visit(route('os.show', r.id))}
                            empty="Nenhuma OS."
                        />
                    </Block>
                </div>
            </div>

            <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
                <DialogContent className="max-h-[90svh] overflow-y-auto rounded-[4px] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{dialog === 'cliente' ? 'Alterar cliente' : 'Incluir veículo'}</DialogTitle>
                    </DialogHeader>
                    {dialog === 'cliente' ? (
                        <ClientForm client={client} onDone={() => setDialog(null)} />
                    ) : (
                        <VehicleForm clientId={client.id} onDone={() => setDialog(null)} />
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
