import { CarDiagramSvg, DamageLegend } from '@/components/car-diagram';
import { PhotoGallery, PhotoUpload } from '@/components/photo-gallery';
import { Block, Field, Grid, Placa, ReadOnly, Situacao, Tabs, Tool, selectCls, textareaCls, type Col } from '@/components/erp';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { ENTRY_CHECKLIST, FLOW, FUEL, PAYMENT, STATUS, WAITING_FOR, date, documentFmt, km, money, nextStep, phone, plate, whatsapp } from '@/lib/os';
import { REVISION_GROUPS, REVISION_TOTAL, REVISION_VALUES, type RevisionValue } from '@/lib/revisao';
import { cn } from '@/lib/utils';
import type { OsEvent, OsFull, OsItem, OsStatus, SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, ChevronDown, CircleCheck, Hourglass, Link2, MessageCircle, Plus, Printer, Save, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type Hist = { id: number; number: string; status: OsStatus; date: string; km_in: number | null; summary: string | null };
interface Props {
    os: OsFull;
    history: Hist[];
    mechanics: { id: number; name: string }[];
    statuses: { value: OsStatus; label: string }[];
}
type Tab = 'diag' | 'revisao' | 'itens' | 'fotos' | 'vistoria' | 'historico';

/* --------------------------------------------------------------- etapas */
function Etapas({ status }: { status: OsStatus }) {
    const cur = FLOW.indexOf(status);
    return (
        <ol className="flex overflow-x-auto rounded-[4px] border border-[#c9cdd3] bg-white text-[11px] font-semibold dark:bg-zinc-900">
            {FLOW.map((s, i) => (
                <li
                    key={s}
                    className={cn(
                        'flex min-w-28 flex-1 items-center gap-1.5 border-r border-[#e3e5e8] px-2 py-1.5 whitespace-nowrap last:border-r-0',
                        i === cur ? 'bg-zinc-900 text-white' : i < cur ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400',
                    )}
                >
                    <span className={cn('grid size-4 place-items-center rounded-[2px] text-[10px]', i === cur ? 'bg-[#d42a2a]' : i < cur ? STATUS[s].dot + ' text-white' : 'border border-zinc-300')}>
                        {i < cur ? '✓' : i + 1}
                    </span>
                    {STATUS[s].label}
                </li>
            ))}
        </ol>
    );
}

/* ------------------------------------------------------------ revisão */
function Revisao({ os }: { os: OsFull }) {
    const [values, setValues] = useState<Record<string, RevisionValue>>({ ...(os.revision ?? {}) });
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const filled = Object.keys(values).length;

    const set = (k: string, v: RevisionValue) => {
        setValues((cur) => {
            const n = { ...cur };
            if (n[k] === v) delete n[k];
            else n[k] = v;
            return n;
        });
        setDirty(true);
    };
    // grava sozinho logo após cada toque (o mecânico não perde nada se mudar de etapa)
    useEffect(() => {
        if (!dirty) return;
        const t = setTimeout(() => {
            setSaving(true);
            router.patch(route('os.revision', os.id), { revision: values }, { preserveScroll: true, preserveState: true, onSuccess: () => setDirty(false), onFinish: () => setSaving(false) });
        }, 600);
        return () => clearTimeout(t);
    }, [values, dirty, os.id]);

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span>
                    Preenchidos: <b className="tabular-nums">{filled}</b> de {REVISION_TOTAL}
                </span>
                <span className="text-muted-foreground text-[12px]">{saving || dirty ? 'Gravando…' : filled ? 'Gravado ✓' : 'Toque para marcar; grava sozinho'}</span>
                <span className="ml-auto flex gap-1.5">
                    {REVISION_VALUES.map((r) => (
                        <span key={r.value} className={cn('rounded-[2px] border px-1.5 py-0.5 text-[11px] font-bold', r.cls)}>
                            {r.label}: {Object.values(values).filter((v) => v === r.value).length}
                        </span>
                    ))}
                </span>
            </div>
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {REVISION_GROUPS.map((g) => (
                    <div key={g.title} className="overflow-hidden rounded-[4px] border border-[#c9cdd3]">
                        <div className="flex h-8 items-center border-b border-[#d7dade] bg-[#eceef1] px-2.5 text-[11px] font-bold tracking-wide uppercase dark:bg-zinc-800">{g.title}</div>
                        {g.items.map((it) => (
                            <div key={it.key} className="flex items-center gap-2 border-b border-[#eceef1] px-2.5 py-1.5 last:border-b-0 even:bg-[#f8f9fa] dark:even:bg-zinc-900/60">
                                <span className="min-w-0 flex-1 text-[15px] md:text-[13px]">{it.label}</span>
                                {REVISION_VALUES.map((r) => (
                                    <button
                                        key={r.value}
                                        type="button"
                                        onClick={() => set(it.key, r.value)}
                                        className={cn(
                                            'h-10 w-14 rounded-[3px] border text-[12px] font-bold md:h-7 md:w-11 md:text-[11px]',
                                            values[it.key] === r.value ? r.cls : 'border-[#c9cdd3] bg-white text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-900',
                                        )}
                                        aria-pressed={values[it.key] === r.value}
                                    >
                                        {r.short}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ------------------------------------------------------ peças/serviços */
function ItemRow({ item, osId }: { item: OsItem; osId: number }) {
    const [price, setPrice] = useState(String(item.unit_price ?? 0));
    const [qty, setQty] = useState(String(item.quantity));
    const save = () => {
        const p = Number(price.replace(',', '.')) || 0;
        const q = Number(qty.replace(',', '.')) || 1;
        if (p === item.unit_price && q === item.quantity) return;
        router.put(route('os.items.update', [osId, item.id]), { ...item, unit_price: p, quantity: q }, { preserveScroll: true });
    };
    const noPrice = !item.unit_price;
    return (
        <tr className={cn('border-b border-[#e3e5e8] even:bg-[#f8f9fa] dark:even:bg-zinc-900/60', noPrice && 'bg-amber-50/70 even:bg-amber-50/70 dark:bg-amber-950/20')}>
            <td className="px-2.5 py-1 text-[11px] font-bold uppercase">{item.type === 'peca' ? 'Peça' : 'Serviço'}</td>
            <td className="px-2.5 py-1">{item.description}</td>
            <td className="w-20 px-1.5 py-1">
                <Input value={qty} onChange={(e) => setQty(e.target.value)} onBlur={save} inputMode="decimal" className="text-right tabular-nums" aria-label="Quantidade" />
            </td>
            <td className="w-32 px-1.5 py-1">
                <Input value={price} onChange={(e) => setPrice(e.target.value)} onBlur={save} inputMode="decimal" className={cn('text-right tabular-nums', noPrice && 'border-amber-400')} aria-label="Valor unitário" />
            </td>
            <td className="w-28 px-2.5 py-1 text-right font-semibold tabular-nums">{money(item.total)}</td>
            <td className="w-10 px-1 py-1 text-center">
                <button
                    type="button"
                    aria-label="Remover item"
                    className="grid size-9 place-items-center rounded-[3px] text-zinc-500 hover:bg-red-50 hover:text-red-700 md:size-7"
                    onClick={() => confirm(`Remover "${item.description}"?`) && router.delete(route('os.items.destroy', [osId, item.id]), { preserveScroll: true })}
                >
                    <Trash2 className="size-4" />
                </button>
            </td>
        </tr>
    );
}

function AddItem({ osId, sensitive }: { osId: number; sensitive: boolean }) {
    const { data, setData, post, processing, errors, reset, transform } = useForm({ type: 'peca' as 'servico' | 'peca', description: '', quantity: '1', unit_price: '' });
    return (
        <form
            className="grid items-end gap-2 border-t border-[#d7dade] bg-[#f6f7f8] p-2.5 sm:grid-cols-[130px_1fr_80px_auto] lg:grid-cols-[130px_1fr_80px_120px_auto] dark:bg-zinc-800"
            onSubmit={(e) => {
                e.preventDefault();
                const n = (v: string) => (v.trim() === '' ? null : Number(v.replace(/\./g, '').replace(',', '.')) || 0);
                transform((d) => ({ ...d, quantity: n(d.quantity) ?? 1, unit_price: n(d.unit_price) }) as never);
                post(route('os.items.store', osId), { preserveScroll: true, onSuccess: () => reset('description', 'unit_price', 'quantity') });
            }}
        >
            <Field label="Tipo">
                <select className={selectCls} value={data.type} onChange={(e) => setData('type', e.target.value as 'peca' | 'servico')}>
                    <option value="peca">Peça</option>
                    <option value="servico">Serviço</option>
                </select>
            </Field>
            <Field label="Descrição" error={errors.description}>
                <Input
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder={data.type === 'peca' ? (sensitive ? 'Ex.: pastilha de freio dianteira' : 'Peça necessária') : 'Ex.: mão de obra troca de pastilhas'}
                />
            </Field>
            <Field label="Qtd">
                <Input value={data.quantity} onChange={(e) => setData('quantity', e.target.value)} inputMode="decimal" className="text-right tabular-nums" />
            </Field>
            {sensitive && (
                <Field label="Vl. unitário" className="hidden lg:grid">
                    <Input value={data.unit_price} onChange={(e) => setData('unit_price', e.target.value)} inputMode="decimal" className="text-right tabular-nums" />
                </Field>
            )}
            <button type="submit" disabled={processing || !data.description} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[3px] border border-zinc-800 bg-zinc-900 px-3 text-[13px] font-semibold text-white disabled:opacity-50 md:h-8">
                <Plus className="size-4" /> Incluir
            </button>
        </form>
    );
}

function Totais({ os }: { os: OsFull }) {
    const { data, setData, patch, processing, isDirty, transform } = useForm({
        discount: String(os.discount ?? 0),
    });
    const num = (v: string) => Number(v.replace(',', '.')) || 0;
    const total = Math.max(0, (os.subtotal ?? 0) - num(data.discount));
    return (
        <div className="grid gap-2.5">
            <div className="flex justify-between text-[13px]">
                <span>Subtotal</span>
                <b className="tabular-nums">{money(os.subtotal)}</b>
            </div>
            <Field label="Desconto (R$)">
                <Input value={data.discount} onChange={(e) => setData('discount', e.target.value)} inputMode="decimal" className="text-right tabular-nums" />
            </Field>
            <div className="flex items-baseline justify-between rounded-[3px] bg-zinc-900 px-3 py-2 text-white">
                <span className="text-[12px] font-bold uppercase">Total</span>
                <b className="text-[20px] tabular-nums">{money(total)}</b>
            </div>
            {os.costs && os.costs.purchases > 0 && (
                <div className="grid gap-1 rounded-[3px] border border-dashed border-[#c9cdd3] px-2.5 py-2 text-[12px]">
                    <p className="text-[10px] font-bold tracking-wide text-zinc-500 uppercase">Só sócios</p>
                    {(() => {
                        // custo = compras de peças lançadas para esta OS
                        const cost = os.costs.purchases;
                        const margin = total - cost;
                        return (
                            <>
                                <p className="flex justify-between">
                                    <span>Peças compradas p/ esta OS</span>
                                    <b className="tabular-nums">{money(cost)}</b>
                                </p>
                                <p className="flex justify-between">
                                    <span>Margem bruta</span>
                                    <b className={cn('tabular-nums', margin < 0 ? 'text-[#b51f1f]' : 'text-green-800')}>
                                        {money(margin)} {total > 0 && `(${Math.round((margin / total) * 100)}%)`}
                                    </b>
                                </p>
                            </>
                        );
                    })()}
                </div>
            )}
            {isDirty && (
                <Tool
                    primary
                    icon={<Save />}
                    label="Gravar valores"
                    disabled={processing}
                    onClick={() => {
                        transform((d) => ({ discount: num(d.discount) }) as never);
                        patch(route('os.update', os.id), { preserveScroll: true });
                    }}
                />
            )}
        </div>
    );
}

/* ------------------------------------------------------------ pagamentos */
function Pagamentos({ os }: { os: OsFull }) {
    const total = os.total ?? 0;
    const billed = os.billed_total ?? 0;
    const remaining = Math.max(0, Math.round((total - billed) * 100) / 100);
    const { data, setData, post, processing, errors, reset } = useForm({
        amount: remaining ? remaining.toFixed(2).replace('.', ',') : '',
        payment_method: 'pix',
        installments: '1',
        received: true as boolean,
    });
    const multi = ['credito', 'parcelado', 'boleto'].includes(data.payment_method);
    const err = errors as Record<string, string>;

    return (
        <div className="grid gap-2.5">
            {(os.payments ?? []).length > 0 && (
                <table className="w-full text-[12px]">
                    <tbody>
                        {os.payments!.map((p) => (
                            <tr key={p.id} className="border-b border-[#e3e5e8]">
                                <td className="py-1">
                                    {PAYMENT[p.payment_method ?? ''] ?? '—'}
                                    {p.installments ? ` ${p.installment}/${p.installments}` : ''}
                                    <span className={cn('block text-[11px]', p.paid_at ? 'text-green-700' : 'text-amber-700')}>
                                        {p.paid_at ? `Recebido ${p.paid_at.split('-').reverse().join('/')}` : `Vence ${p.due_date.split('-').reverse().join('/')}`}
                                    </span>
                                </td>
                                <td className="py-1 text-right font-semibold tabular-nums">{money(p.amount)}</td>
                                <td className="w-8 py-1 text-right">
                                    <button
                                        type="button"
                                        title="Excluir pagamento"
                                        className="text-zinc-400 hover:text-red-700"
                                        onClick={() => confirm('Excluir este pagamento?') && router.delete(route('os.payments.destroy', [os.id, p.id]), { preserveScroll: true })}
                                    >
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <div className="grid grid-cols-2 gap-1 text-[12px]">
                <span>Recebido</span>
                <b className="text-right text-green-800 tabular-nums">{money(os.paid_total)}</b>
                <span>A receber (parcelas)</span>
                <b className="text-right tabular-nums">{money(billed - (os.paid_total ?? 0))}</b>
                <span>Falta lançar</span>
                <b className={cn('text-right tabular-nums', remaining > 0 && 'text-[#b51f1f]')}>{money(remaining)}</b>
            </div>
            {total > 0 && remaining > 0 && (
                <form
                    className="grid gap-2 border-t border-dashed border-[#c9cdd3] pt-2.5"
                    onSubmit={(e) => {
                        e.preventDefault();
                        post(route('os.payments.store', os.id), { preserveScroll: true, onSuccess: () => reset() });
                    }}
                >
                    <div className="grid grid-cols-2 gap-2">
                        <Field label="Valor (R$)" error={err.amount}>
                            <Input value={data.amount} onChange={(e) => setData('amount', e.target.value)} inputMode="decimal" className="text-right tabular-nums" />
                        </Field>
                        <Field label="Forma">
                            <select className={selectCls} value={data.payment_method} onChange={(e) => setData('payment_method', e.target.value)}>
                                {Object.entries(PAYMENT).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>
                    {multi && (
                        <Field label="Parcelas">
                            <select className={selectCls} value={data.installments} onChange={(e) => setData('installments', e.target.value)}>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((i) => (
                                    <option key={i} value={i}>
                                        {i}x {i > 1 ? `de ${money((Number(data.amount.replace(/\./g, '').replace(',', '.')) || 0) / i)}` : ''}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    )}
                    <label className="flex items-center gap-2 text-[12px] font-medium">
                        <input type="checkbox" className="size-4 accent-[#d42a2a]" checked={data.received} onChange={(e) => setData('received', e.target.checked)} />
                        {Number(data.installments) > 1 ? '1ª parcela recebida agora' : 'Recebido agora'}
                    </label>
                    <button type="submit" disabled={processing} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[3px] border border-green-800 bg-green-700 text-[13px] font-semibold text-white disabled:opacity-60 md:h-8">
                        <CircleCheck className="size-4" /> Registrar pagamento
                    </button>
                </form>
            )}
        </div>
    );
}

/* ----------------------------------------------------------------- tela */
export default function OsShow({ os, history, mechanics, statuses }: Props) {
    const { auth } = usePage<SharedData>().props;
    const sensitive = auth.can.sensitive;
    const isMechanic = auth.user.role === 'mecanico';
    const [busy, setBusy] = useState(false);
    const [tab, setTab] = useState<Tab>(() => (sensitive && ['orcamento', 'aprovacao'].includes(os.status) ? 'itens' : 'diag'));
    const diag = useForm({ diagnosis: os.diagnosis ?? '', complaint: os.complaint ?? '' });

    const next = nextStep(os.status, auth.user.role);
    const v = os.vehicle;
    const pendingPrice = os.items.some((i) => !i.unit_price);

    const setStatus = (status: OsStatus) => {
        setBusy(true);
        router.patch(route('os.status', os.id), { status }, { preserveScroll: true, onFinish: () => setBusy(false) });
    };

    const saveDiag = () => {
        if (sensitive) diag.patch(route('os.update', os.id), { preserveScroll: true });
        else diag.patch(route('os.diagnosis', os.id), { preserveScroll: true });
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'F8') {
                e.preventDefault();
                window.open(route('os.print', [os.id, sensitive ? 'cliente' : 'diagnostico']), '_blank');
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [os.id, sensitive]);

    const first = os.client?.name?.split(' ')[0];
    const budgetText = [
        `Olá, ${first}! Aqui é da Pista 1 Mecânica Automotiva.`,
        `Orçamento da OS ${os.number} — ${v?.title} (${plate(v?.plate)}):`,
        '',
        ...os.items.map((i) => `• ${i.description}${i.quantity !== 1 ? ` (${i.quantity}x)` : ''} — ${money(i.total)}`),
        '',
        `*Total: ${money(os.total)}*`,
        '',
        os.public_url ? `Veja o orçamento completo, com fotos, e aprove por aqui:\n${os.public_url}` : 'Podemos seguir com o serviço? Responda SIM para autorizar.',
    ].join('\n');
    const readyText = `Olá, ${first}! Seu ${v?.title} (${plate(v?.plate)}) está pronto para retirada na Pista 1. Total: ${money(os.total)}.`;
    const wa = sensitive ? whatsapp(os.client?.phone, os.status === 'pronto' ? readyText : budgetText) : null;

    const printTypes: [string, string][] = sensitive
        ? [
              ['cliente', 'Via do cliente (orçamento / OS)'],
              ['entrada', 'Vistoria de entrada'],
              ['diagnostico', 'Ficha do mecânico'],
              ['revisao', 'Checklist de revisão'],
          ]
        : [
              ['diagnostico', 'Ficha do mecânico'],
              ['revisao', 'Checklist de revisão'],
          ];

    const histCols: Col<Hist>[] = [
        { label: 'Data', render: (r) => date(r.date), className: 'w-24' },
        { label: 'OS', render: (r) => r.number, className: 'w-20' },
        { label: 'Km', render: (r) => km(r.km_in), align: 'right', className: 'w-28' },
        { label: 'Serviços', render: (r) => <span className="line-clamp-1">{r.summary}</span> },
        { label: 'Situação', render: (r) => <Situacao status={r.status} />, hide: 'md' },
    ];
    const evCols: Col<OsEvent>[] = [
        { label: 'Data / hora', render: (r) => date(r.created_at, true), className: 'w-36' },
        { label: 'Situação', render: (r) => (r.status ? <Situacao status={r.status} /> : '—'), className: 'w-48' },
        { label: 'Ocorrência', render: (r) => r.note ?? '' },
        { label: 'Usuário', render: (r) => r.user ?? '', hide: 'md' },
    ];

    return (
        <AppLayout
            title={`OS ${os.number} · ${plate(v?.plate)} · ${v?.title ?? ''}`}
            code="ATD030"
            toolbar={
                <>
                    {next && <Tool primary icon={<ArrowRight />} label={next.label} onClick={() => setStatus(next.to)} disabled={busy} className="hidden md:inline-flex" />}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] bg-white px-3 text-[13px] font-semibold md:h-8 md:px-2.5 dark:bg-zinc-900">
                                <Printer className="size-4" /> Imprimir <kbd className="hidden rounded-[2px] border px-1 font-mono text-[10px] font-normal text-zinc-500 md:inline">F8</kbd>
                                <ChevronDown className="size-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 rounded-[4px] p-1">
                            {printTypes.map(([k, label]) => (
                                <DropdownMenuItem key={k} asChild className="h-9 rounded-[3px] text-[13px]">
                                    <a href={route('os.print', [os.id, k])} target="_blank" rel="noreferrer">
                                        {label}
                                    </a>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {wa && ['orcamento', 'aprovacao', 'pronto'].includes(os.status) && os.items.length > 0 && (
                        <Tool
                            icon={<MessageCircle className="text-green-600" />}
                            label={os.status === 'pronto' ? 'Avisar cliente' : 'Orçamento no WhatsApp'}
                            href={wa}
                            external
                            // enviar o orçamento já marca a OS como "aguardando aprovação" (o link passa a aceitar a resposta)
                            onClick={() => os.status === 'orcamento' && !os.items.some((i) => !i.unit_price) && setStatus('aprovacao')}
                        />
                    )}
                    {sensitive && !['entregue', 'cancelada'].includes(os.status) && (
                        <Tool icon={<ShoppingCart />} label="Comprar peças" href={route('compras.index', { os: os.id })} className="hidden lg:inline-flex" />
                    )}
                    {sensitive && os.public_url && ['orcamento', 'aprovacao'].includes(os.status) && (
                        <Tool
                            icon={<Link2 />}
                            label="Copiar link"
                            onClick={() => {
                                navigator.clipboard?.writeText(os.public_url!);
                                alert('Link do orçamento copiado. Cole na conversa com o cliente.');
                            }}
                            className="hidden md:inline-flex"
                        />
                    )}
                    {sensitive && (
                        <select aria-label="Alterar situação" className={cn(selectCls, 'w-auto md:w-44')} value="" onChange={(e) => e.target.value && setStatus(e.target.value as OsStatus)}>
                            <option value="">Alterar situação…</option>
                            {statuses
                                .filter((s) => s.value !== os.status)
                                .map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                        </select>
                    )}
                    {auth.can.master && (
                        <Tool danger icon={<Trash2 />} label="Excluir" onClick={() => confirm(`Excluir a OS ${os.number}? Não pode ser desfeito.`) && router.delete(route('os.destroy', os.id))} className="hidden lg:inline-flex" />
                    )}
                </>
            }
        >
            <Head title={`OS ${os.number} · ${plate(v?.plate)}`} />
            <div className="grid gap-2 md:gap-3">
                <Etapas status={os.status} />

                {isMechanic && WAITING_FOR[os.status] && (
                    <p className="flex items-center gap-2 rounded-[3px] border border-amber-300 bg-amber-50 px-3 py-2 text-[14px] font-medium dark:border-amber-800 dark:bg-amber-950/40">
                        <Hourglass className="size-4" /> {WAITING_FOR[os.status]}
                    </p>
                )}
                {os.approval_name && os.approved_at && !['orcamento', 'aprovacao'].includes(os.status) && (
                    <p className="flex flex-wrap items-center gap-2 rounded-[3px] border border-green-300 bg-green-50 px-3 py-2 text-[13px] dark:border-green-800 dark:bg-green-950/40">
                        <CircleCheck className="size-4 text-green-700" />
                        <b>Cliente aprovou pelo link</b> em {date(os.approved_at, true)} ({os.approval_name})
                        {os.approval_note && <span>· “{os.approval_note}”</span>}
                    </p>
                )}
                {os.rejected_at && os.status === 'orcamento' && (
                    <p className="flex flex-wrap items-center gap-2 rounded-[3px] border border-red-300 bg-red-50 px-3 py-2 text-[13px] dark:border-red-800 dark:bg-red-950/40">
                        <b className="text-red-800">Cliente NÃO aprovou</b> em {date(os.rejected_at, true)} ({os.approval_name})
                        {os.approval_note && <span>· “{os.approval_note}”</span>}
                        {sensitive && <span>Ajuste o orçamento e envie de novo.</span>}
                    </p>
                )}
                {sensitive && os.status === 'orcamento' && !os.rejected_at && (
                    <p className="flex items-center gap-2 rounded-[3px] border border-violet-300 bg-violet-50 px-3 py-2 text-[13px] dark:border-violet-800 dark:bg-violet-950/40">
                        O mecânico enviou o diagnóstico. Lance os valores na aba <b>Peças e serviços</b>, imprima a via do cliente e clique em <b>Orçamento enviado ao cliente</b>.
                    </p>
                )}

                <Block title="Dados da ordem de serviço">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 md:grid-cols-4 xl:grid-cols-6">
                        <Field label="Nº OS">
                            <ReadOnly className="font-bold">{os.number}</ReadOnly>
                        </Field>
                        <Field label="Situação">
                            <ReadOnly>
                                <Situacao status={os.status} />
                            </ReadOnly>
                        </Field>
                        <Field label="Agendado para">
                            <ReadOnly>{os.scheduled_at ? date(os.scheduled_at, true) : '—'}</ReadOnly>
                        </Field>
                        <Field label="Abertura">
                            <ReadOnly>{date(os.created_at, true)}</ReadOnly>
                        </Field>
                        <Field label="Placa">
                            <ReadOnly>
                                <Placa value={v?.plate} />
                            </ReadOnly>
                        </Field>
                        <Field label="Km entrada">
                            <ReadOnly className="font-semibold tabular-nums">{km(os.km_in)}</ReadOnly>
                        </Field>
                        <Field label="Veículo" className="col-span-2">
                            <ReadOnly>
                                {v?.title}
                                {v?.color ? ` · ${v.color}` : ''}
                            </ReadOnly>
                        </Field>
                        <Field label="Cliente" className="col-span-2">
                            <ReadOnly>
                                {sensitive && os.client ? (
                                    <a href={route('clientes.show', os.client.id)} className="text-[#b51f1f] hover:underline">
                                        {os.client.name}
                                    </a>
                                ) : (
                                    os.client?.name
                                )}
                            </ReadOnly>
                        </Field>
                        {sensitive && (
                            <>
                                <Field label="WhatsApp">
                                    <ReadOnly>{phone(os.client?.phone)}</ReadOnly>
                                </Field>
                                <Field label="CPF / CNPJ">
                                    <ReadOnly>{documentFmt(os.client?.document)}</ReadOnly>
                                </Field>
                            </>
                        )}
                        <Field label="Mecânico" className="col-span-2">
                            {sensitive ? (
                                <select className={selectCls} value={os.mechanic?.id ?? ''} onChange={(e) => router.patch(route('os.update', os.id), { mechanic_id: e.target.value || null }, { preserveScroll: true })}>
                                    <option value="">— sem mecânico —</option>
                                    {mechanics.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <ReadOnly>{os.mechanic?.name}</ReadOnly>
                            )}
                        </Field>
                        <Field label="Combustível">
                            <ReadOnly>{os.fuel_level !== null ? FUEL[os.fuel_level] : '—'}</ReadOnly>
                        </Field>
                    </div>
                </Block>

                <div className="bg-card overflow-hidden rounded-[4px] border border-[#c9cdd3]">
                    <div className="bg-[#f3f4f6] px-2 pt-2 dark:bg-zinc-800">
                        <Tabs<Tab>
                            value={tab}
                            onChange={setTab}
                            tabs={[
                                { value: 'diag', label: 'Solicitação e diagnóstico' },
                                { value: 'revisao', label: 'Revisão', badge: Object.keys(os.revision ?? {}).length ? <span className="rounded-[2px] bg-zinc-200 px-1 text-[10px] dark:bg-zinc-700">{Object.keys(os.revision).length}</span> : null },
                                {
                                    value: 'itens',
                                    label: 'Peças e serviços',
                                    badge: os.items.length ? <span className={cn('rounded-[2px] px-1 text-[10px]', sensitive && pendingPrice ? 'bg-amber-400 text-black' : 'bg-zinc-200 dark:bg-zinc-700')}>{os.items.length}</span> : null,
                                },
                                {
                                    value: 'fotos',
                                    label: 'Fotos',
                                    badge: os.photos.length ? <span className="rounded-[2px] bg-zinc-200 px-1 text-[10px] dark:bg-zinc-700">{os.photos.length}</span> : null,
                                },
                                { value: 'vistoria', label: 'Vistoria de entrada' },
                                { value: 'historico', label: 'Histórico' },
                            ]}
                        />
                    </div>

                    <div className="p-3">
                        {tab === 'diag' && (
                            <div className="grid gap-3 lg:grid-cols-2">
                                <Field label="Solicitação do cliente (pré-atendimento)">
                                    {sensitive ? (
                                        <textarea rows={8} className={textareaCls} value={diag.data.complaint} onChange={(e) => diag.setData('complaint', e.target.value)} />
                                    ) : (
                                        <div className="min-h-40 rounded-[3px] border border-[#d7dade] bg-[#f7f8f9] px-3 py-2 text-[16px] leading-relaxed whitespace-pre-line md:text-[14px] dark:bg-zinc-800">
                                            {os.complaint || '—'}
                                        </div>
                                    )}
                                </Field>
                                <Field label="Diagnóstico do mecânico">
                                    <textarea
                                        rows={8}
                                        className={textareaCls}
                                        placeholder="O que foi encontrado, testes feitos, o que precisa trocar…"
                                        value={diag.data.diagnosis}
                                        onChange={(e) => diag.setData('diagnosis', e.target.value)}
                                    />
                                </Field>
                                {diag.isDirty && (
                                    <div className="lg:col-span-2">
                                        <Tool primary icon={<Save />} label="Gravar" onClick={saveDiag} disabled={diag.processing} />
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'revisao' && <Revisao os={os} />}

                        {tab === 'itens' && (
                            <div className={cn('grid gap-3', sensitive && 'xl:grid-cols-[1fr_260px]')}>
                                <div className="min-w-0 overflow-hidden rounded-[4px] border border-[#c9cdd3]">
                                    {sensitive ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[560px] text-[13px]">
                                                <thead>
                                                    <tr className="border-b border-[#c9cdd3] bg-[#eceef1] text-left text-[11px] font-bold text-zinc-600 uppercase dark:bg-zinc-800">
                                                        <th className="h-8 w-20 px-2.5">Tipo</th>
                                                        <th className="px-2.5">Descrição</th>
                                                        <th className="px-2.5 text-right">Qtd</th>
                                                        <th className="px-2.5 text-right">Vl. unit.</th>
                                                        <th className="px-2.5 text-right">Total</th>
                                                        <th />
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {os.items.map((i) => (
                                                        <ItemRow key={`${i.id}-${i.unit_price}-${i.quantity}`} item={i} osId={os.id} />
                                                    ))}
                                                    {!os.items.length && (
                                                        <tr>
                                                            <td colSpan={6} className="text-muted-foreground px-3 py-6 text-center">
                                                                Nenhuma peça ou serviço lançado.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <Grid
                                            cols={[
                                                { label: 'Tipo', render: (r: OsItem) => <span className="text-[11px] font-bold uppercase">{r.type === 'peca' ? 'Peça' : 'Serviço'}</span>, className: 'w-20' },
                                                { label: 'Descrição', render: (r: OsItem) => r.description },
                                                { label: 'Qtd', render: (r: OsItem) => r.quantity, align: 'right', className: 'w-16' },
                                            ]}
                                            rows={os.items}
                                            rowKey={(r) => r.id}
                                            empty="Nenhuma peça ou serviço lançado."
                                        />
                                    )}
                                    {sensitive && pendingPrice && <p className="border-t border-amber-300 bg-amber-50 px-3 py-1.5 text-[12px] dark:bg-amber-950/30">Itens em amarelo estão sem valor.</p>}
                                    <AddItem osId={os.id} sensitive={sensitive} />
                                </div>
                                {sensitive && (
                                    <div className="grid content-start gap-3">
                                        <Block title="Totais">
                                            <Totais key={`${os.total}-${os.down_payment}-${os.discount}`} os={os} />
                                        </Block>
                                        <Block title="Pagamentos">
                                            <Pagamentos key={`${os.total}-${os.billed_total}`} os={os} />
                                        </Block>
                                    </div>
                                )}
                            </div>
                        )}

                        {tab === 'fotos' && (
                            <div className="grid gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <PhotoUpload osId={os.id} className="w-full sm:w-auto" />
                                    <p className="text-muted-foreground text-[12px]">
                                        Peça danificada, vazamento, desgaste, painel com luz acesa…
                                        {sensitive && ' As fotos marcadas para o cliente aparecem no link do orçamento.'}
                                    </p>
                                </div>
                                <PhotoGallery photos={os.photos} osId={os.id} canManage={sensitive} canDeleteAll={sensitive} />
                            </div>
                        )}

                        {tab === 'vistoria' && (
                            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                                <div className="rounded-[4px] border border-[#d7dade] bg-white p-2 text-zinc-900">
                                    <CarDiagramSvg damages={os.damages} />
                                    <div className="mt-2">
                                        <DamageLegend damages={os.damages} />
                                    </div>
                                </div>
                                <div className="grid content-start gap-1">
                                    <p className="text-[11px] font-semibold text-zinc-600 uppercase">Itens no veículo</p>
                                    {ENTRY_CHECKLIST.map((c) => (
                                        <div key={c.key} className="flex items-center justify-between border-b border-[#eceef1] py-1 text-[13px]">
                                            {c.label}
                                            <b className={os.checklist?.[c.key] ? 'text-green-700' : 'text-zinc-400'}>{os.checklist?.[c.key] ? 'SIM' : 'NÃO'}</b>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {tab === 'historico' && (
                            <div className="grid gap-3">
                                <Block title="Passagens anteriores deste veículo" bodyClassName="p-0">
                                    <Grid cols={histCols} rows={history} rowKey={(r) => r.id} onRowClick={(r) => router.visit(route('os.show', r.id))} empty="Primeira vez deste carro na oficina." />
                                </Block>
                                <Block title="Movimentação desta OS" bodyClassName="p-0">
                                    <Grid cols={evCols} rows={os.events} rowKey={(r) => r.id} />
                                </Block>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {next && (
                <div className="no-print bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t border-[#c9cdd3] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
                    <button disabled={busy} onClick={() => setStatus(next.to)} className="flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-[#d42a2a] text-[16px] font-semibold text-white disabled:opacity-60">
                        <ArrowRight className="size-5" /> {next.label}
                    </button>
                </div>
            )}
        </AppLayout>
    );
}
