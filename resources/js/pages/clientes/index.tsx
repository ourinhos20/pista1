import { Block, Field, Grid, Placa, Tool, textareaCls, type Col } from '@/components/erp';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { documentFmt, phone } from '@/lib/os';
import type { ClientData } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Save, Search, UserPlus } from 'lucide-react';
import { useState } from 'react';

type Row = ClientData & { vehicles: { id: number; plate: string; brand: string | null; model: string | null }[]; service_orders_count: number };

export function ClientForm({ client, onDone }: { client?: ClientData; onDone?: () => void }) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: client?.name ?? '',
        phone: client?.phone ?? '',
        document: client?.document ?? '',
        email: client?.email ?? '',
        address: client?.address ?? '',
        city: client?.city ?? '',
        notes: client?.notes ?? '',
    });
    return (
        <form
            className="grid gap-3"
            onSubmit={(e) => {
                e.preventDefault();
                const opts = { preserveScroll: true, onSuccess: () => onDone?.() };
                if (client) put(route('clientes.update', client.id), opts);
                else post(route('clientes.store'), opts);
            }}
        >
            <div className="grid gap-3 sm:grid-cols-6">
                <Field label="Nome completo *" className="sm:col-span-6" error={errors.name}>
                    <Input value={data.name} onChange={(e) => setData('name', e.target.value)} autoFocus />
                </Field>
                <Field label="WhatsApp" className="sm:col-span-2" error={errors.phone}>
                    <Input inputMode="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                </Field>
                <Field label="CPF / CNPJ" className="sm:col-span-2" error={errors.document}>
                    <Input inputMode="numeric" value={data.document} onChange={(e) => setData('document', e.target.value)} />
                </Field>
                <Field label="E-mail" className="sm:col-span-2" error={errors.email}>
                    <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                </Field>
                <Field label="Endereço" className="sm:col-span-4">
                    <Input value={data.address} onChange={(e) => setData('address', e.target.value)} />
                </Field>
                <Field label="Cidade" className="sm:col-span-2">
                    <Input value={data.city} onChange={(e) => setData('city', e.target.value)} />
                </Field>
                <Field label="Observações" className="sm:col-span-6">
                    <textarea rows={2} className={textareaCls} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                </Field>
            </div>
            <div className="flex justify-end">
                <button type="submit" disabled={processing} className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white md:h-8">
                    <Save className="size-4" /> {client ? 'Gravar alterações' : 'Gravar cliente'}
                </button>
            </div>
        </form>
    );
}

export default function Clientes({ clients, filters }: { clients: Row[]; filters: { q: string } }) {
    const [q, setQ] = useState(filters.q);
    const [open, setOpen] = useState(false);

    const cols: Col<Row>[] = [
        { label: 'Código', render: (r) => <span className="tabular-nums">{String(r.id).padStart(5, '0')}</span>, className: 'w-20', hide: 'md' },
        { label: 'Nome', render: (r) => <b className="font-semibold">{r.name}</b> },
        { label: 'WhatsApp', render: (r) => phone(r.phone) || '—', className: 'w-36', hide: 'sm' },
        { label: 'CPF / CNPJ', render: (r) => documentFmt(r.document) || '—', className: 'w-40', hide: 'lg' },
        {
            label: 'Veículos',
            render: (r) => (
                <span className="flex flex-wrap gap-1">
                    {r.vehicles.slice(0, 3).map((v) => (
                        <Placa key={v.id} value={v.plate} />
                    ))}
                </span>
            ),
            hide: 'md',
        },
        { label: 'OS', render: (r) => r.service_orders_count, align: 'right', className: 'w-14' },
    ];

    return (
        <AppLayout title="Clientes e Veículos" code="CAD010" toolbar={<Tool primary icon={<UserPlus />} label="Novo cliente" onClick={() => setOpen(true)} />}>
            <Head title="Clientes" />
            <div className="grid gap-2 md:gap-3">
                <Block title="Pesquisa">
                    <form
                        className="grid items-end gap-2 sm:grid-cols-[1fr_auto]"
                        onSubmit={(e) => {
                            e.preventDefault();
                            router.get(route('clientes.index'), { q }, { preserveState: true, replace: true });
                        }}
                    >
                        <Field label="Nome, placa, CPF/CNPJ ou telefone">
                            <Input value={q} onChange={(e) => setQ(e.target.value)} />
                        </Field>
                        <button type="submit" className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] bg-white px-3 text-[13px] font-semibold md:h-8 dark:bg-zinc-900">
                            <Search className="size-4" /> Pesquisar
                        </button>
                    </form>
                </Block>
                <Block title="Clientes" bodyClassName="p-0">
                    <Grid cols={cols} rows={clients} rowKey={(r) => r.id} onRowClick={(r) => router.visit(route('clientes.show', r.id))} footer={<span>{clients.length} registro(s)</span>} />
                </Block>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90svh] overflow-y-auto rounded-[4px] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Novo cliente</DialogTitle>
                    </DialogHeader>
                    <ClientForm onDone={() => setOpen(false)} />
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
