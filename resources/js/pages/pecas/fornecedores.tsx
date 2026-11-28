import { Block, Field, Grid, Tool, type Col } from '@/components/erp';
import { useBulkDelete } from '@/components/os-bulk';
import { SupplierForm, type Sup } from '@/components/supplier-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { documentFmt, money, phone, whatsapp } from '@/lib/os';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import { MessageCircle, Search, Truck } from 'lucide-react';
import { useState } from 'react';

export default function Fornecedores({ rows, filters }: { rows: Sup[]; filters: { q: string } }) {
    // sócio marca vários e exclui de uma vez
    const { selection, bar } = useBulkDelete('fornecedores.destroy_many', {
        title: 'Excluir fornecedores',
        one: 'o fornecedor selecionado',
        many: (n) => `os ${n} fornecedores selecionados`,
        note: 'Quem já tem compras não é excluído (desative no cadastro).',
    });
    const [q, setQ] = useState(filters.q);
    const [open, setOpen] = useState<Sup | 'new' | null>(null);

    const cols: Col<Sup>[] = [
        { label: 'Fornecedor', render: (r) => <span className={cn('font-semibold', !r.active && 'text-zinc-400 line-through')}>{r.name}</span> },
        { label: 'Vendedor', render: (r) => r.contact ?? '—', hide: 'md' },
        {
            label: 'Telefone',
            render: (r) =>
                r.phone ? (
                    <a
                        href={whatsapp(r.phone, 'Olá! Aqui é da Pista 1 Mecânica Automotiva.') ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 hover:text-green-700"
                    >
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
        {
            label: 'A pagar',
            render: (r) => (r.open_total ? <b className="text-[#b51f1f]">{money(r.open_total)}</b> : '—'),
            align: 'right',
            className: 'w-28',
        },
    ];

    return (
        <AppLayout
            title="Fornecedores"
            code="PEC020"
            toolbar={<Tool primary icon={<Truck />} label="Novo fornecedor" onClick={() => setOpen('new')} />}
        >
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
                        <Field label="Pesquisar">
                            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, vendedor ou CNPJ" />
                        </Field>
                        <button
                            type="submit"
                            className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] bg-white px-3 text-[13px] font-semibold md:h-8 dark:bg-zinc-900"
                        >
                            <Search className="size-4" /> Pesquisar
                        </button>
                    </form>
                </Block>
                <Block title="Fornecedores" bodyClassName="p-0">
                    <Grid
                        cols={cols}
                        rows={rows}
                        rowKey={(r) => r.id}
                        selection={selection}
                        onRowClick={(r) => router.visit(route('fornecedores.show', r.id))}
                        footer={<span>{rows.length} fornecedor(es) · clique para ver o histórico de compras</span>}
                    />
                </Block>
            </div>
            <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
                <DialogContent className="max-h-[92svh] overflow-y-auto rounded-[4px] sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{open === 'new' ? 'Novo fornecedor' : 'Alterar fornecedor'}</DialogTitle>
                    </DialogHeader>
                    {open && (
                        <SupplierForm key={open === 'new' ? 'new' : open.id} s={open === 'new' ? undefined : open} onDone={() => setOpen(null)} />
                    )}
                </DialogContent>
            </Dialog>
            {bar}
        </AppLayout>
    );
}
