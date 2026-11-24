import { Block, Field, Grid, Tool, textareaCls, type Col } from '@/components/erp';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { documentFmt, money, phone, whatsapp } from '@/lib/os';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import { MessageCircle, Save, Search, Truck } from 'lucide-react';
import { useState } from 'react';

type Sup = {
    id: number;
    name: string;
    document: string | null;
    phone: string | null;
    contact: string | null;
    email: string | null;
    notes: string | null;
    active: boolean;
    purchases_count: number;
    purchases_total: number;
};

export function SupplierForm({ s, onDone }: { s?: Sup; onDone: () => void }) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: s?.name ?? '',
        document: s?.document ?? '',
        phone: s?.phone ?? '',
        contact: s?.contact ?? '',
        email: s?.email ?? '',
        notes: s?.notes ?? '',
        active: s?.active ?? true,
    });
    return (
        <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
                e.preventDefault();
                // preserveState: a tela que abriu este formulário (ex.: a compra) continua como estava
                const opts = { preserveScroll: true, preserveState: true, onSuccess: onDone };
                if (s) put(route('fornecedores.update', s.id), opts);
                else post(route('fornecedores.store'), opts);
            }}
        >
            <Field label="Nome / razão social *" className="sm:col-span-2" error={errors.name}>
                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} autoFocus />
            </Field>
            <Field label="CNPJ / CPF" error={errors.document}>
                <Input value={data.document} onChange={(e) => setData('document', e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Telefone / WhatsApp">
                <Input value={data.phone} onChange={(e) => setData('phone', e.target.value)} inputMode="tel" />
            </Field>
            <Field label="Vendedor / contato">
                <Input value={data.contact} onChange={(e) => setData('contact', e.target.value)} />
            </Field>
            <Field label="E-mail" error={errors.email}>
                <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
            </Field>
            <Field label="Observações (prazo de entrega, condições…)" className="sm:col-span-2">
                <textarea rows={2} className={textareaCls} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-[13px] font-medium">
                <input type="checkbox" className="size-4 accent-[#d42a2a]" checked={data.active} onChange={(e) => setData('active', e.target.checked)} />
                Ativo
            </label>
            <div className="flex justify-end">
                <button type="submit" disabled={processing} className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white md:h-8">
                    <Save className="size-4" /> Gravar
                </button>
            </div>
        </form>
    );
}

export default function Fornecedores({ rows, filters }: { rows: Sup[]; filters: { q: string } }) {
    const [q, setQ] = useState(filters.q);
    const [open, setOpen] = useState<Sup | 'new' | null>(null);

    const cols: Col<Sup>[] = [
        { label: 'Fornecedor', render: (r) => <span className={cn('font-semibold', !r.active && 'text-zinc-400 line-through')}>{r.name}</span> },
        { label: 'Contato', render: (r) => r.contact ?? '—', hide: 'md' },
        {
            label: 'Telefone',
            render: (r) =>
                r.phone ? (
                    <a href={whatsapp(r.phone, 'Olá! Aqui é da Pista 1 Mecânica Automotiva.') ?? '#'} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 hover:text-green-700">
                        <MessageCircle className="size-3.5 text-green-600" /> {phone(r.phone)}
                    </a>
                ) : (
                    '—'
                ),
            className: 'w-40',
        },
        { label: 'CNPJ', render: (r) => documentFmt(r.document) || '—', className: 'w-44', hide: 'lg' },
        { label: 'Compras', render: (r) => r.purchases_count, align: 'right', className: 'w-20', hide: 'sm' },
        { label: 'Total comprado', render: (r) => money(r.purchases_total), align: 'right', className: 'w-32', hide: 'sm' },
    ];

    return (
        <AppLayout title="Fornecedores" code="PEC020" toolbar={<Tool primary icon={<Truck />} label="Novo fornecedor" onClick={() => setOpen('new')} />}>
            <Head title="Fornecedores" />
            <div className="grid gap-2 md:gap-3">
                <Block title="Pesquisa">
                    <form
                        className="grid items-end gap-2 sm:grid-cols-[1fr_auto]"
                        onSubmit={(e) => {
                            e.preventDefault();
                            router.get(route('fornecedores.index'), { q }, { preserveState: true, replace: true });
                        }}
                    >
                        <Field label="Nome, contato ou CNPJ">
                            <Input value={q} onChange={(e) => setQ(e.target.value)} />
                        </Field>
                        <button type="submit" className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] bg-white px-3 text-[13px] font-semibold md:h-8 dark:bg-zinc-900">
                            <Search className="size-4" /> Pesquisar
                        </button>
                    </form>
                </Block>
                <Block title="Fornecedores" bodyClassName="p-0">
                    <Grid cols={cols} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => router.visit(route('fornecedores.show', r.id))} footer={<span>{rows.length} fornecedor(es) · clique para ver o histórico de compras</span>} />
                </Block>
            </div>
            <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
                <DialogContent className="max-h-[92svh] overflow-y-auto rounded-[4px] sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{open === 'new' ? 'Novo fornecedor' : 'Alterar fornecedor'}</DialogTitle>
                    </DialogHeader>
                    {open && <SupplierForm key={open === 'new' ? 'new' : open.id} s={open === 'new' ? undefined : open} onDone={() => setOpen(null)} />}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
