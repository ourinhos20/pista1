import { ClientForm } from '@/components/client-form';
import { Block, Field, Grid, Placa, Tool, type Col } from '@/components/erp';
import { useBulkDelete } from '@/components/os-bulk';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { documentFmt, phone } from '@/lib/os';
import type { ClientData } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Search, UserPlus } from 'lucide-react';
import { useState } from 'react';

type Row = ClientData & { vehicles: { id: number; plate: string; brand: string | null; model: string | null }[]; service_orders_count: number };

export default function Clientes({ clients, filters }: { clients: Row[]; filters: { q: string } }) {
    // sócio marca vários e exclui de uma vez
    const { selection, bar } = useBulkDelete('clientes.destroy_many', {
        title: 'Excluir clientes',
        one: 'o cliente selecionado',
        many: (n) => `os ${n} clientes selecionados`,
        note: 'Os carros deles também saem. Quem já tem OS não é excluído.',
    });
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
        <AppLayout
            title="Clientes e Veículos"
            code="CAD010"
            toolbar={<Tool primary icon={<UserPlus />} label="Novo cliente" onClick={() => setOpen(true)} />}
        >
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
                        <Field label="Pesquisar">
                            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, CPF, telefone ou placa" />
                        </Field>
                        <button
                            type="submit"
                            className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] bg-white px-3 text-[13px] font-semibold md:h-8 dark:bg-zinc-900"
                        >
                            <Search className="size-4" /> Pesquisar
                        </button>
                    </form>
                </Block>
                <Block title="Clientes" bodyClassName="p-0">
                    <Grid
                        cols={cols}
                        rows={clients}
                        rowKey={(r) => r.id}
                        selection={selection}
                        onRowClick={(r) => router.visit(route('clientes.show', r.id))}
                        footer={<span>{clients.length} registro(s)</span>}
                    />
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
            {bar}
        </AppLayout>
    );
}
