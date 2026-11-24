import InputError from '@/components/input-error';
import { Empty, Page, PageHeader, Panel, PlateBadge } from '@/components/oficina';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { documentFmt, phone } from '@/lib/os';
import type { ClientData } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ChevronRight, Search, UserPlus, Users } from 'lucide-react';
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
    const fields: [keyof typeof data, string, string?][] = [
        ['name', 'Nome completo'],
        ['phone', 'WhatsApp', 'tel'],
        ['document', 'CPF / CNPJ', 'numeric'],
        ['email', 'E-mail', 'email'],
        ['address', 'Endereço'],
        ['city', 'Cidade'],
    ];
    return (
        <form
            className="grid gap-4"
            onSubmit={(e) => {
                e.preventDefault();
                const opts = { preserveScroll: true, onSuccess: () => onDone?.() };
                if (client) put(route('clientes.update', client.id), opts);
                else post(route('clientes.store'), opts);
            }}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                {fields.map(([k, label, mode]) => (
                    <div key={k} className={k === 'name' || k === 'address' ? 'grid gap-2 sm:col-span-2' : 'grid gap-2'}>
                        <Label htmlFor={k}>{label}</Label>
                        <Input id={k} inputMode={mode as never} value={data[k]} onChange={(e) => setData(k, e.target.value)} className="h-12 text-base" />
                        <InputError message={errors[k]} />
                    </div>
                ))}
                <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="notes">Observações</Label>
                    <textarea id="notes" rows={2} value={data.notes} onChange={(e) => setData('notes', e.target.value)} className="border-input bg-card rounded-xl border px-3 py-2 text-base" />
                </div>
            </div>
            <Button type="submit" size="lg" disabled={processing}>
                {client ? 'Salvar' : 'Cadastrar cliente'}
            </Button>
        </form>
    );
}

export default function Clientes({ clients, filters }: { clients: Row[]; filters: { q: string } }) {
    const [q, setQ] = useState(filters.q);
    const [open, setOpen] = useState(false);

    return (
        <AppLayout breadcrumbs={[{ title: 'Clientes', href: '/clientes' }]}>
            <Head title="Clientes" />
            <Page>
                <PageHeader
                    title="Clientes"
                    actions={
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button size="lg">
                                    <UserPlus className="size-5" /> Novo cliente
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90svh] overflow-y-auto rounded-2xl sm:max-w-xl">
                                <DialogHeader>
                                    <DialogTitle>Novo cliente</DialogTitle>
                                </DialogHeader>
                                <ClientForm onDone={() => setOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    }
                />

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        router.get(route('clientes.index'), { q }, { preserveState: true, replace: true });
                    }}
                    className="relative"
                >
                    <Search className="text-muted-foreground absolute top-1/2 left-4 size-5 -translate-y-1/2" />
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, placa, CPF ou telefone" className="h-12 rounded-xl pl-12 text-base" />
                </form>

                <Panel>
                    {clients.length ? (
                        <ul className="divide-y">
                            {clients.map((c) => (
                                <li key={c.id}>
                                    <Link href={route('clientes.show', c.id)} className="hover:bg-muted/70 -mx-2 flex items-center gap-4 rounded-xl px-2 py-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold">{c.name}</p>
                                            <p className="text-muted-foreground truncate text-sm">
                                                {[phone(c.phone), documentFmt(c.document)].filter(Boolean).join(' · ') || 'Sem contato'}
                                            </p>
                                        </div>
                                        <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
                                            {c.vehicles.slice(0, 3).map((v) => (
                                                <PlateBadge key={v.id} value={v.plate} size="sm" />
                                            ))}
                                        </div>
                                        <span className="text-muted-foreground tabular hidden w-16 text-right text-sm md:block">{c.service_orders_count} OS</span>
                                        <ChevronRight className="text-muted-foreground size-4" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Empty icon={<Users className="size-8 opacity-40" />} title="Nenhum cliente encontrado" />
                    )}
                </Panel>
            </Page>
        </AppLayout>
    );
}
