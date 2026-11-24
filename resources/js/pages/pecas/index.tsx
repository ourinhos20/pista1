import { Block, Field, Grid, Tool, selectCls, type Col } from '@/components/erp';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { money } from '@/lib/os';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import { PackagePlus, Save, Search, ShoppingCart } from 'lucide-react';
import { useState } from 'react';

type Part = {
    id: number;
    code: string | null;
    description: string;
    brand: string | null;
    unit: string;
    cost_price: number;
    sale_price: number;
    min_stock: number;
    stock: number;
    low: boolean;
    supplier_id: number | null;
    supplier: string | null;
    active: boolean;
};
type Sup = { id: number; name: string };

const UNITS = ['un', 'L', 'kit', 'par', 'jogo', 'm', 'kg'];
const br = (v: number) => String(v ?? 0).replace('.', ',');

function PartForm({ part, suppliers, onDone }: { part?: Part; suppliers: Sup[]; onDone: () => void }) {
    const { data, setData, post, put, processing, errors } = useForm({
        code: part?.code ?? '',
        description: part?.description ?? '',
        brand: part?.brand ?? '',
        unit: part?.unit ?? 'un',
        cost_price: part ? br(part.cost_price) : '',
        sale_price: part ? br(part.sale_price) : '',
        min_stock: part ? br(part.min_stock) : '0',
        supplier_id: part?.supplier_id ? String(part.supplier_id) : '',
        active: part?.active ?? true,
    });
    const num = (v: string) => Number(v.replace(/\./g, '').replace(',', '.')) || 0;
    const cost = num(data.cost_price);
    const sale = num(data.sale_price);
    const margin = cost > 0 && sale > 0 ? Math.round(((sale - cost) / sale) * 100) : null;

    return (
        <form
            className="grid gap-3 sm:grid-cols-6"
            onSubmit={(e) => {
                e.preventDefault();
                const opts = { preserveScroll: true, onSuccess: onDone };
                if (part) put(route('pecas.update', part.id), opts);
                else post(route('pecas.store'), opts);
            }}
        >
            <Field label="Descrição *" className="sm:col-span-4" error={errors.description}>
                <Input value={data.description} onChange={(e) => setData('description', e.target.value)} autoFocus />
            </Field>
            <Field label="Código" className="sm:col-span-2" error={errors.code}>
                <Input value={data.code} onChange={(e) => setData('code', e.target.value)} className="font-mono" />
            </Field>
            <Field label="Marca" className="sm:col-span-2">
                <Input value={data.brand} onChange={(e) => setData('brand', e.target.value)} />
            </Field>
            <Field label="Unidade" className="sm:col-span-1">
                <select className={selectCls} value={data.unit} onChange={(e) => setData('unit', e.target.value)}>
                    {UNITS.map((u) => (
                        <option key={u}>{u}</option>
                    ))}
                </select>
            </Field>
            <Field label="Fornecedor" className="sm:col-span-3">
                <select className={selectCls} value={data.supplier_id} onChange={(e) => setData('supplier_id', e.target.value)}>
                    <option value="">—</option>
                    {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Custo (R$)" className="sm:col-span-2" error={errors.cost_price}>
                <Input value={data.cost_price} onChange={(e) => setData('cost_price', e.target.value)} inputMode="decimal" className="text-right tabular-nums" />
            </Field>
            <Field label="Preço de venda (R$)" className="sm:col-span-2" error={errors.sale_price}>
                <Input value={data.sale_price} onChange={(e) => setData('sale_price', e.target.value)} inputMode="decimal" className="text-right font-semibold tabular-nums" />
            </Field>
            <Field label="Estoque mínimo" className="sm:col-span-2">
                <Input value={data.min_stock} onChange={(e) => setData('min_stock', e.target.value)} inputMode="decimal" className="text-right tabular-nums" />
            </Field>
            <p className="text-muted-foreground text-[12px] sm:col-span-4">
                {margin !== null ? (
                    <>
                        Margem sobre a venda: <b className={margin < 20 ? 'text-[#b51f1f]' : 'text-green-800'}>{margin}%</b>
                    </>
                ) : (
                    'O estoque não é digitado: ele é calculado pelas compras menos o que foi usado nas OS.'
                )}
            </p>
            <label className="flex items-center gap-2 text-[13px] font-medium sm:col-span-2 sm:justify-end">
                <input type="checkbox" className="size-4 accent-[#d42a2a]" checked={data.active} onChange={(e) => setData('active', e.target.checked)} />
                Ativa
            </label>
            <div className="flex justify-end sm:col-span-6">
                <button type="submit" disabled={processing} className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white md:h-8">
                    <Save className="size-4" /> Gravar
                </button>
            </div>
        </form>
    );
}

export default function Catalogo({ rows, filters, suppliers }: { rows: Part[]; filters: { q: string; filtro: string }; suppliers: Sup[] }) {
    const [q, setQ] = useState(filters.q);
    const [open, setOpen] = useState<Part | 'new' | null>(null);
    const go = (p: Partial<typeof filters>) => router.get(route('pecas.index'), { ...filters, q, ...p }, { preserveState: true, replace: true });
    const lowCount = rows.filter((r) => r.low).length;
    const stockValue = rows.reduce((s, r) => s + Math.max(0, r.stock) * r.cost_price, 0);

    const cols: Col<Part>[] = [
        { label: 'Código', render: (r) => <span className="font-mono text-[12px]">{r.code ?? '—'}</span>, className: 'w-28', hide: 'md' },
        { label: 'Descrição', render: (r) => <span className={cn('font-semibold', !r.active && 'text-zinc-400 line-through')}>{r.description}</span> },
        { label: 'Marca', render: (r) => r.brand ?? '—', className: 'w-28', hide: 'lg' },
        { label: 'Fornecedor', render: (r) => r.supplier ?? '—', className: 'w-44', hide: 'lg' },
        { label: 'Custo', render: (r) => money(r.cost_price), align: 'right', className: 'w-28', hide: 'sm' },
        { label: 'Venda', render: (r) => <b>{money(r.sale_price)}</b>, align: 'right', className: 'w-28' },
        {
            label: 'Estoque',
            render: (r) => (
                <span className={cn('font-bold tabular-nums', r.stock <= 0 ? 'text-zinc-400' : r.low ? 'text-[#b51f1f]' : 'text-green-800')}>
                    {r.stock.toLocaleString('pt-BR')} {r.unit}
                    {r.low && <span className="ml-1 rounded-[2px] bg-[#d42a2a] px-1 text-[10px] text-white">BAIXO</span>}
                </span>
            ),
            align: 'right',
            className: 'w-32',
        },
    ];

    return (
        <AppLayout
            title="Catálogo de Peças e Estoque"
            code="PEC010"
            toolbar={
                <>
                    <Tool primary icon={<PackagePlus />} label="Nova peça" onClick={() => setOpen('new')} />
                    <Tool icon={<ShoppingCart />} label="Lançar compra" href={route('compras.index', { nova: 1 })} />
                </>
            }
        >
            <Head title="Peças" />
            <div className="grid gap-2 md:gap-3">
                <Block title="Pesquisa">
                    <form
                        className="grid items-end gap-2 sm:grid-cols-[1fr_200px_auto]"
                        onSubmit={(e) => {
                            e.preventDefault();
                            go({});
                        }}
                    >
                        <Field label="Descrição, código ou marca">
                            <Input value={q} onChange={(e) => setQ(e.target.value)} />
                        </Field>
                        <Field label="Mostrar">
                            <select className={selectCls} value={filters.filtro} onChange={(e) => go({ filtro: e.target.value })}>
                                <option value="">Todas as peças</option>
                                <option value="baixo">Só estoque baixo</option>
                            </select>
                        </Field>
                        <button type="submit" className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] bg-white px-3 text-[13px] font-semibold md:h-8 dark:bg-zinc-900">
                            <Search className="size-4" /> Pesquisar
                        </button>
                    </form>
                </Block>
                <Block title="Peças" bodyClassName="p-0">
                    <Grid
                        cols={cols}
                        rows={rows}
                        rowKey={(r) => r.id}
                        onRowClick={setOpen}
                        empty="Nenhuma peça cadastrada. Use Nova peça ou lance uma compra marcando 'salvar no catálogo'."
                        footer={
                            <>
                                <span>
                                    {rows.length} peça(s){lowCount ? ` · ${lowCount} com estoque baixo` : ''}
                                </span>
                                <span>
                                    Valor em estoque (custo): <b className="tabular-nums">{money(stockValue)}</b>
                                </span>
                            </>
                        }
                    />
                </Block>
            </div>

            <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
                <DialogContent className="max-h-[92svh] overflow-y-auto rounded-[4px] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{open === 'new' ? 'Nova peça' : 'Alterar peça'}</DialogTitle>
                    </DialogHeader>
                    {open && <PartForm key={open === 'new' ? 'new' : open.id} part={open === 'new' ? undefined : open} suppliers={suppliers} onDone={() => setOpen(null)} />}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
