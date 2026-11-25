import { CarDiagramEditor, CarDiagramSvg, DamageLegend } from '@/components/car-diagram';
import { Block, Field, Grid, OriginTag, Placa, ReadOnly, Since, Situacao, Tabs, Tool, selectCls, textareaCls, type Col } from '@/components/erp';
import { PhotoGallery, PhotoUpload } from '@/components/photo-gallery';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { ENTRY_CHECKLIST, FLOW, FUEL, ORIGIN, PAYMENT, SERVICE_TYPE, STATUS, WAITING_FOR, date, documentFmt, km, money, nextStep, phone, plate, whatsapp } from '@/lib/os';
import { REVISION_GROUPS, REVISION_TOTAL, REVISION_VALUES, type RevisionValue } from '@/lib/revisao';
import { cn } from '@/lib/utils';
import type { Damage, OsEvent, OsFull, OsItem, OsStatus, SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, Check, ChevronDown, CircleCheck, ClipboardCheck, Hourglass, Link2, MessageCircle, PackageSearch, Pencil, Plus, Printer, Save, ShoppingCart, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type Hist = { id: number; number: string; status: OsStatus; date: string; km_in: number | null; summary: string | null };
interface Props {
    os: OsFull;
    history: Hist[];
    mechanics: { id: number; name: string }[];
    statuses: { value: OsStatus; label: string }[];
    serviceTypes: Record<string, string>;
}
type Tab = 'vistoria' | 'diag' | 'revisao' | 'itens' | 'fotos' | 'historico';

/** Mostra o motivo quando o servidor recusa mudar de etapa (ex.: falta vistoria). */
const showError = (errors: Record<string, string>) => {
    const msg = Object.values(errors)[0];
    if (msg) alert(msg);
};

/* ---------------------------------------------------- vistoria de entrada */
function Vistoria({ os, canEdit }: { os: OsFull; canEdit: boolean }) {
    const [editing, setEditing] = useState(!os.inspected_at && canEdit);
    const { data, setData, patch, processing, errors } = useForm({
        km_in: os.km_in ? String(os.km_in) : '',
        fuel_level: os.fuel_level as number | null,
        checklist: (os.checklist ?? {}) as Record<string, boolean>,
        damages: (os.damages ?? []) as Damage[],
    });
    const err = errors as Record<string, string>;

    if (!editing) {
        return (
            <div className="grid gap-3">
                {os.inspected_at ? (
                    <p className="flex flex-wrap items-center gap-2 text-[13px]">
                        <CircleCheck className="size-4 text-green-700" /> Vistoria feita em <b>{date(os.inspected_at, true)}</b>
                        {os.inspected_by && <span>por {os.inspected_by}</span>}
                        {canEdit && (
                            <button type="button" onClick={() => setEditing(true)} className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-[#b51f1f] hover:underline">
                                <Pencil className="size-3.5" /> Alterar
                            </button>
                        )}
                    </p>
                ) : (
                    <p className="rounded-[3px] border border-amber-300 bg-amber-50 px-3 py-2 text-[13px]">A vistoria é feita pelo mecânico quando o carro chega (km, combustível, itens e avarias).</p>
                )}
                {os.inspected_at && (
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,560px)_260px]">
                        <div className="max-w-xl">
                            <CarDiagramEditorReadOnly damages={os.damages} />
                        </div>
                        <dl className="grid content-start gap-1 text-[13px]">
                            <div className="flex justify-between border-b border-[#eceef1] py-1">
                                <dt>Km</dt>
                                <dd className="font-bold tabular-nums">{km(os.km_in)}</dd>
                            </div>
                            <div className="flex justify-between border-b border-[#eceef1] py-1">
                                <dt>Combustível</dt>
                                <dd className="font-bold">{os.fuel_level !== null ? FUEL[os.fuel_level] : '—'}</dd>
                            </div>
                            {ENTRY_CHECKLIST.map((c) => (
                                <div key={c.key} className="flex justify-between border-b border-[#eceef1] py-1">
                                    <dt>{c.label}</dt>
                                    <dd className={os.checklist?.[c.key] ? 'font-bold text-green-700' : 'text-zinc-400'}>{os.checklist?.[c.key] ? 'SIM' : 'NÃO'}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}
            </div>
        );
    }

    return (
        <form
            className="grid gap-4"
            onSubmit={(e) => {
                e.preventDefault();
                patch(route('os.vistoria', os.id), { preserveScroll: true, onSuccess: () => setEditing(false) });
            }}
        >
            <p className="text-[13px] text-zinc-600">
                <b>Primeiro passo, antes do diagnóstico:</b> registre como o carro chegou. Isso protege a oficina se aparecer um risco depois. Tire fotos das avarias na aba <b>Fotos</b>.
            </p>
            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
                <Field label="Km do painel *" error={err.km_in}>
                    <Input value={data.km_in} onChange={(e) => setData('km_in', e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="text-lg font-bold tabular-nums" />
                </Field>
                <Field label="Combustível *" error={err.fuel_level}>
                    <div className="grid grid-cols-5 overflow-hidden rounded-[3px] border border-[#b9bec6]">
                        {FUEL.map((f, i) => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setData('fuel_level', i)}
                                className={cn('h-11 border-r border-[#d7dade] text-[13px] font-semibold last:border-r-0 md:h-8', data.fuel_level === i ? 'bg-zinc-900 text-white' : 'bg-card')}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </Field>
            </div>
            <Field label="Itens no veículo">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-5">
                    {ENTRY_CHECKLIST.map((c) => (
                        <label key={c.key} className="flex h-10 items-center gap-2 text-[14px] md:h-7 md:text-[13px]">
                            <input type="checkbox" className="size-5 accent-[#d42a2a] md:size-4" checked={!!data.checklist[c.key]} onChange={(e) => setData('checklist', { ...data.checklist, [c.key]: e.target.checked })} />
                            {c.label}
                        </label>
                    ))}
                </div>
            </Field>
            <Field label="Avarias na lataria (toque no desenho)">
                <div className="max-w-3xl">
                    <CarDiagramEditor value={data.damages} onChange={(v) => setData('damages', v)} />
                </div>
            </Field>
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={processing} className="inline-flex h-12 items-center gap-2 rounded-[3px] bg-[#d42a2a] px-5 text-[15px] font-semibold text-white disabled:opacity-60 md:h-9 md:text-[13px]">
                    <ClipboardCheck className="size-5 md:size-4" /> {os.inspected_at ? 'Gravar alterações' : 'Concluir vistoria'}
                </button>
                {os.inspected_at && (
                    <button type="button" onClick={() => setEditing(false)} className="inline-flex h-12 items-center gap-1 rounded-[3px] border border-[#c9cdd3] px-4 text-[13px] font-semibold md:h-9">
                        <X className="size-4" /> Cancelar
                    </button>
                )}
            </div>
        </form>
    );
}

function CarDiagramEditorReadOnly({ damages }: { damages: Damage[] }) {
    return (
        <div className="rounded-[4px] border border-[#d7dade] bg-white p-2 text-zinc-900">
            <CarDiagramSvg damages={damages} />
            <div className="mt-2">
                <DamageLegend damages={damages} />
            </div>
        </div>
    );
}

/* --------------------------------------- cadastro do cliente e do carro */
function CadastroForm({ os, checkin, onDone }: { os: OsFull; checkin: boolean; onDone: () => void }) {
    const c = os.client;
    const v = os.vehicle;
    const { data, setData, put, post, processing, errors } = useForm({
        client: { name: c?.name ?? '', phone: c?.phone ?? '', document: c?.document ?? '', email: c?.email ?? '', address: c?.address ?? '', city: c?.city ?? '' },
        vehicle: { plate: v?.plate ?? '', brand: v?.brand ?? '', model: v?.model ?? '', year: v?.year ?? '', color: v?.color ?? '', engine: v?.engine ?? '' },
    });
    const err = errors as Record<string, string>;
    const setC = (k: keyof typeof data.client, val: string) => setData('client', { ...data.client, [k]: val });
    const setV = (k: keyof typeof data.vehicle, val: string) => setData('vehicle', { ...data.vehicle, [k]: val });

    return (
        <form
            className="grid gap-3"
            onSubmit={(e) => {
                e.preventDefault();
                const opts = { preserveScroll: true, onSuccess: onDone };
                if (checkin) post(route('os.checkin', os.id), opts);
                else put(route('os.cadastro', os.id), opts);
            }}
        >
            {checkin && <p className="rounded-[3px] bg-cyan-50 px-3 py-2 text-[13px] text-cyan-900">Confira os dados e complete o que faltar. Só a <b>placa</b> é obrigatória agora; o resto pode ficar para depois.</p>}
            <p className="text-[11px] font-bold tracking-wide text-zinc-600 uppercase">Carro</p>
            <div className="grid gap-3 sm:grid-cols-6">
                <Field label={checkin ? 'Placa *' : 'Placa'} className="sm:col-span-2" error={err['vehicle.plate']}>
                    <Input value={data.vehicle.plate} onChange={(e) => setV('plate', e.target.value.toUpperCase())} maxLength={8} className="font-mono text-lg font-bold tracking-widest uppercase" autoFocus={checkin} />
                </Field>
                <Field label="Marca" className="sm:col-span-2">
                    <Input value={data.vehicle.brand} onChange={(e) => setV('brand', e.target.value)} />
                </Field>
                <Field label="Modelo" className="sm:col-span-2">
                    <Input value={data.vehicle.model} onChange={(e) => setV('model', e.target.value)} />
                </Field>
                <Field label="Ano" className="sm:col-span-2">
                    <Input value={data.vehicle.year} onChange={(e) => setV('year', e.target.value)} inputMode="numeric" />
                </Field>
                <Field label="Cor" className="sm:col-span-2">
                    <Input value={data.vehicle.color} onChange={(e) => setV('color', e.target.value)} />
                </Field>
                <Field label="Motor" className="sm:col-span-2">
                    <Input value={data.vehicle.engine} onChange={(e) => setV('engine', e.target.value)} />
                </Field>
            </div>
            <p className="mt-1 text-[11px] font-bold tracking-wide text-zinc-600 uppercase">Cliente</p>
            <div className="grid gap-3 sm:grid-cols-6">
                <Field label="Nome" className="sm:col-span-4" error={err['client.name']}>
                    <Input value={data.client.name} onChange={(e) => setC('name', e.target.value)} />
                </Field>
                <Field label="WhatsApp" className="sm:col-span-2">
                    <Input value={data.client.phone} onChange={(e) => setC('phone', e.target.value)} inputMode="tel" />
                </Field>
                <Field label="CPF / CNPJ" className="sm:col-span-2">
                    <Input value={data.client.document} onChange={(e) => setC('document', e.target.value)} inputMode="numeric" />
                </Field>
                <Field label="E-mail" className="sm:col-span-4" error={err['client.email']}>
                    <Input type="email" value={data.client.email} onChange={(e) => setC('email', e.target.value)} />
                </Field>
                <Field label="Endereço" className="sm:col-span-4">
                    <Input value={data.client.address} onChange={(e) => setC('address', e.target.value)} />
                </Field>
                <Field label="Cidade" className="sm:col-span-2">
                    <Input value={data.client.city} onChange={(e) => setC('city', e.target.value)} />
                </Field>
            </div>
            <div className="flex justify-end">
                <button type="submit" disabled={processing} className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white disabled:opacity-60 md:h-9">
                    <Save className="size-4" /> {checkin ? 'Confirmar chegada e liberar para o mecânico' : 'Gravar cadastro'}
                </button>
            </div>
        </form>
    );
}

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
                    {STATUS[s].short ?? STATUS[s].label}
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
    const noPrice = !item.unit_price && item.approval !== 'recusado';
    const setApproval = (approval: 'aprovado' | 'recusado' | null) =>
        router.patch(route('os.items.approval', [osId, item.id]), { approval }, { preserveScroll: true });
    return (
        <tr
            className={cn(
                'border-b border-[#e3e5e8] even:bg-[#f8f9fa] dark:even:bg-zinc-900/60',
                noPrice && 'bg-amber-50/70 even:bg-amber-50/70 dark:bg-amber-950/20',
                item.approval === 'recusado' && 'text-zinc-400',
            )}
        >
            <td className="px-2.5 py-1 text-[11px] font-bold uppercase">{item.type === 'peca' ? 'Peça' : 'Serviço'}</td>
            <td className="px-2.5 py-1">
                <span className={item.approval === 'recusado' ? 'line-through' : ''}>{item.description}</span>
                {item.extra && <span className="ml-1.5 rounded-[2px] bg-amber-400 px-1 text-[10px] font-bold text-black uppercase">complementar</span>}
            </td>
            <td className="w-36 px-1.5 py-1">
                <span className="flex items-center gap-1">
                    <button
                        type="button"
                        title="Cliente aprovou"
                        onClick={() => setApproval(item.approval === 'aprovado' ? null : 'aprovado')}
                        className={cn('grid size-8 place-items-center rounded-[3px] border md:size-7', item.approval === 'aprovado' ? 'border-green-700 bg-green-700 text-white' : 'border-[#c9cdd3] text-zinc-400')}
                    >
                        <Check className="size-4" />
                    </button>
                    <button
                        type="button"
                        title="Cliente recusou"
                        onClick={() => setApproval(item.approval === 'recusado' ? null : 'recusado')}
                        className={cn('grid size-8 place-items-center rounded-[3px] border md:size-7', item.approval === 'recusado' ? 'border-zinc-700 bg-zinc-700 text-white' : 'border-[#c9cdd3] text-zinc-400')}
                    >
                        <X className="size-4" />
                    </button>
                    <span className="text-[11px] text-zinc-500">{item.approval === 'aprovado' ? 'aprovado' : item.approval === 'recusado' ? 'recusado' : 'pendente'}</span>
                </span>
            </td>
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
export default function OsShow({ os, history, mechanics, statuses, serviceTypes }: Props) {
    const { auth } = usePage<SharedData>().props;
    const sensitive = auth.can.sensitive;
    const isMechanic = auth.user.role === 'mecanico';
    const [busy, setBusy] = useState(false);
    const [cadastro, setCadastro] = useState<'checkin' | 'edit' | null>(null);
    const needsInspection = ['recebido', 'diagnostico'].includes(os.status) && !os.inspected_at;
    const [tab, setTab] = useState<Tab>(() => {
        if (needsInspection && !sensitive) return 'vistoria';
        if (sensitive && ['orcamento', 'aprovacao', 'pecas', 'execucao'].includes(os.status)) return 'itens';
        return 'diag';
    });
    const diag = useForm({ diagnosis: os.diagnosis ?? '', complaint: os.complaint ?? '' });

    const next = nextStep(os.status, auth.user.role);
    const v = os.vehicle;
    const active = os.items.filter((i) => i.approval !== 'recusado');
    const pendingPrice = active.some((i) => !i.unit_price);
    const pendingExtras = os.items.filter((i) => i.extra && i.approval === null);
    const extrasPriced = pendingExtras.length > 0 && pendingExtras.every((i) => (i.unit_price ?? 0) > 0);
    const canInspect = !['aguardando', 'entregue', 'cancelada'].includes(os.status);

    const setStatus = (status: OsStatus) => {
        setBusy(true);
        router.patch(route('os.status', os.id), { status }, { preserveScroll: true, onError: showError, onFinish: () => setBusy(false) });
    };

    /** Ação principal da etapa (botão vermelho). Algumas abrem um passo antes de mudar. */
    const primary = (() => {
        if (os.status === 'aguardando' && sensitive) return { label: 'Cliente chegou', run: () => setCadastro('checkin') };
        if (os.status === 'diagnostico' && !os.inspected_at)
            return {
                label: 'Fazer vistoria de entrada',
                run: () => {
                    setTab('vistoria');
                    requestAnimationFrame(() => document.getElementById('os-abas')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                },
            };
        if (!next) return null;
        return { label: next.label, run: () => setStatus(next.to) };
    })();

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

    // mensagens de WhatsApp prontas para cada etapa
    const first = os.client?.name?.split(' ')[0];
    const car = `${v?.title ?? 'carro'}${v?.plate ? ` (${plate(v.plate)})` : ''}`;
    const budgetText = [
        `Olá, ${first}! Aqui é da Pista 1 Mecânica Automotiva.`,
        `Orçamento da OS ${os.number} — ${car}:`,
        '',
        ...active.map((i) => `• ${i.description}${i.quantity !== 1 ? ` (${i.quantity}x)` : ''} — ${money(i.total)}`),
        '',
        `*Total: ${money(os.total)}*`,
        '',
        os.public_url ? `Veja os detalhes, as fotos e aprove item por item por aqui:\n${os.public_url}` : 'Podemos seguir com o serviço? Responda SIM para autorizar.',
    ].join('\n');
    const extraText = [
        `Olá, ${first}! Durante o serviço no seu ${car} encontramos mais um item:`,
        '',
        ...pendingExtras.map((i) => `• ${i.description} — ${money(i.total)}`),
        '',
        `O que você já aprovou continua sendo feito. Aprove ou recuse este item aqui:\n${os.public_url}`,
    ].join('\n');
    const readyText = `Olá, ${first}! Seu ${car} está pronto para retirada na Pista 1. Total: ${money(os.total)}.`;
    const arrivedText = `Olá, ${first}! Recebemos seu ${car} na Pista 1. Assim que o diagnóstico ficar pronto, mandamos o orçamento por aqui.`;
    const scheduledText = `Olá, ${first}! Aqui é da Pista 1. Confirmando seu agendamento${os.scheduled_at ? ` para ${date(os.scheduled_at, true)}` : ''}. Qualquer coisa, é só chamar.`;
    const waFor: Partial<Record<OsStatus, [string, string]>> = {
        aguardando: ['Confirmar agendamento', scheduledText],
        recebido: ['Avisar que recebemos', arrivedText],
        orcamento: ['Orçamento no WhatsApp', budgetText],
        aprovacao: ['Reenviar orçamento', budgetText],
        pronto: ['Avisar que está pronto', readyText],
    };
    const waStep = sensitive ? waFor[os.status] : undefined;
    const wa = waStep && (os.status !== 'orcamento' || active.length > 0) ? whatsapp(os.client?.phone, waStep[1]) : null;
    const waExtra = sensitive && extrasPriced && os.public_url ? whatsapp(os.client?.phone, extraText) : null;

    const printTypes: [string, string][] = sensitive
        ? [
              ['cliente', 'Via do cliente (orçamento / OS)'],
              ['entrada', 'Vistoria de entrada'],
              ['diagnostico', 'Ficha do mecânico'],
              ['revisao', 'Checklist de revisão'],
          ]
        : [
              ['entrada', 'Vistoria de entrada (em branco/preenchida)'],
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
            title={`OS ${os.number} · ${v?.plate ? plate(v.plate) : 'sem placa'} · ${v?.title ?? ''}`}
            code="ATD030"
            toolbar={
                <>
                    {primary && <Tool primary icon={<ArrowRight />} label={primary.label} onClick={primary.run} disabled={busy} className="hidden md:inline-flex" />}
                    {sensitive && os.status === 'aprovacao' && <Tool icon={<PackageSearch />} label="Aprovado · aguardar peças" onClick={() => setStatus('pecas')} disabled={busy} />}
                    {sensitive && os.status === 'execucao' && <Tool icon={<PackageSearch />} label="Aguardando peças" onClick={() => setStatus('pecas')} disabled={busy} className="hidden lg:inline-flex" />}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] bg-white px-3 text-[13px] font-semibold md:h-8 md:px-2.5 dark:bg-zinc-900">
                                <Printer className="size-4" /> Imprimir <kbd className="hidden rounded-[2px] border px-1 font-mono text-[10px] font-normal text-zinc-500 md:inline">F8</kbd>
                                <ChevronDown className="size-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-72 rounded-[4px] p-1">
                            {printTypes.map(([k, label]) => (
                                <DropdownMenuItem key={k} asChild className="h-9 rounded-[3px] text-[13px]">
                                    <a href={route('os.print', [os.id, k])} target="_blank" rel="noreferrer">
                                        {label}
                                    </a>
                                </DropdownMenuItem>
                            ))}
                            {isMechanic && <p className="px-2 py-1.5 text-[11px] text-zinc-500">Preencheu no papel? Tire uma foto da ficha e anexe na aba Fotos.</p>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {wa && waStep && (
                        <Tool
                            icon={<MessageCircle className="text-green-600" />}
                            label={waStep[0]}
                            href={wa}
                            external
                            // enviar o orçamento já marca a OS como "aguardando aprovação" (o link passa a aceitar a resposta)
                            onClick={() => os.status === 'orcamento' && !pendingPrice && setStatus('aprovacao')}
                        />
                    )}
                    {waExtra && <Tool icon={<MessageCircle className="text-amber-600" />} label="Enviar item complementar" href={waExtra} external />}
                    {sensitive && !['entregue', 'cancelada', 'aguardando'].includes(os.status) && (
                        <Tool icon={<ShoppingCart />} label="Comprar peças" href={route('compras.index', { os: os.id })} className="hidden lg:inline-flex" />
                    )}
                    {sensitive && os.public_url && ['orcamento', 'aprovacao', 'pecas', 'execucao'].includes(os.status) && (
                        <Tool
                            icon={<Link2 />}
                            label="Copiar link"
                            onClick={() => {
                                navigator.clipboard?.writeText(os.public_url!);
                                alert('Link do orçamento copiado. Cole na conversa com o cliente.');
                            }}
                            className="hidden xl:inline-flex"
                        />
                    )}
                    {sensitive && (
                        <select aria-label="Alterar etapa" className={cn(selectCls, 'w-auto md:w-40')} value="" onChange={(e) => e.target.value && setStatus(e.target.value as OsStatus)}>
                            <option value="">Alterar etapa…</option>
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
                        <Tool danger icon={<Trash2 />} label="Excluir" onClick={() => confirm(`Excluir a OS ${os.number}? Não pode ser desfeito.`) && router.delete(route('os.destroy', os.id))} className="hidden xl:inline-flex" />
                    )}
                </>
            }
        >
            <Head title={`OS ${os.number} · ${v?.plate ? plate(v.plate) : 'sem placa'}`} />
            <div className="grid gap-2 md:gap-3">
                <Etapas status={os.status} />

                <p className="-mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5 text-[12px] text-zinc-600">
                    <span>
                        Nesta etapa <Since iso={os.status_since} status={os.status} className="text-[12px]" />
                    </span>
                    <span>· Origem: {ORIGIN[os.origin] ?? os.origin}</span>
                    {os.service_type && <span>· {SERVICE_TYPE[os.service_type]}</span>}
                </p>

                {/* avisos: o que fazer agora nesta etapa */}
                {isMechanic && WAITING_FOR[os.status] && (
                    <p className="flex items-center gap-2 rounded-[3px] border border-amber-300 bg-amber-50 px-3 py-2 text-[14px] font-medium dark:border-amber-800 dark:bg-amber-950/40">
                        <Hourglass className="size-4" /> {WAITING_FOR[os.status]}
                    </p>
                )}
                {sensitive && os.status === 'aguardando' && (
                    <p className="flex flex-wrap items-center gap-2 rounded-[3px] border border-zinc-300 bg-white px-3 py-2 text-[13px] dark:bg-zinc-900">
                        <span>
                            Quando o cliente chegar, clique em <b>Cliente chegou</b>: confira a placa e complete o cadastro. O carro entra na fila do mecânico.
                        </span>
                    </p>
                )}
                {needsInspection && os.status === 'diagnostico' && (
                    <p className="flex items-center gap-2 rounded-[3px] border border-red-300 bg-red-50 px-3 py-2 text-[13px] font-medium dark:border-red-800 dark:bg-red-950/40">
                        <ClipboardCheck className="size-4 shrink-0 text-red-700" />
                        <span>
                            Faça a <b>vistoria de entrada</b> antes do diagnóstico (km, combustível, itens e avarias).
                        </span>
                    </p>
                )}
                {os.approval_name && os.approved_at && !['orcamento', 'aprovacao'].includes(os.status) && (
                    <p className="flex flex-wrap items-center gap-2 rounded-[3px] border border-green-300 bg-green-50 px-3 py-2 text-[13px] dark:border-green-800 dark:bg-green-950/40">
                        <CircleCheck className="size-4 text-green-700" />
                        <b>Cliente aprovou pelo link</b> em {date(os.approved_at, true)} ({os.approval_name})
                        {os.approval_note && <span>· “{os.approval_note}”</span>}
                    </p>
                )}
                {pendingExtras.length > 0 && (
                    <p className="flex flex-wrap items-center gap-2 rounded-[3px] border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] dark:border-amber-800 dark:bg-amber-950/40">
                        <b>{pendingExtras.length} item(ns) complementar(es) aguardando o cliente.</b>
                        {sensitive
                            ? extrasPriced
                                ? 'Clique em "Enviar item complementar" para o cliente aprovar pelo link.'
                                : 'Lance o valor na aba Peças e serviços e envie para o cliente.'
                            : 'Não execute esses itens até o cliente aprovar.'}
                    </p>
                )}
                {os.rejected_at && os.status === 'orcamento' && (
                    <p className="flex flex-wrap items-center gap-2 rounded-[3px] border border-red-300 bg-red-50 px-3 py-2 text-[13px] dark:border-red-800 dark:bg-red-950/40">
                        <b className="text-red-800">Cliente NÃO aprovou nenhum item</b> em {date(os.rejected_at, true)} ({os.approval_name})
                        {os.approval_note && <span>· “{os.approval_note}”</span>}
                        {sensitive && <span>Ajuste e reenvie, ou entregue o carro (se cobrar diagnóstico, inclua o item "Taxa de diagnóstico").</span>}
                    </p>
                )}
                {sensitive && os.status === 'orcamento' && !os.rejected_at && (
                    <p className="flex items-center gap-2 rounded-[3px] border border-violet-300 bg-violet-50 px-3 py-2 text-[13px] dark:border-violet-800 dark:bg-violet-950/40">
                        <span>
                            O mecânico enviou o diagnóstico. Lance os valores em <b>Peças e serviços</b> e clique em <b>Orçamento no WhatsApp</b> (ou imprima a via do cliente).
                        </span>
                    </p>
                )}

                <Block
                    title="Dados da ordem de serviço"
                    actions={
                        sensitive && (
                            <button type="button" onClick={() => setCadastro('edit')} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#b51f1f] hover:underline">
                                <Pencil className="size-3.5" /> Completar / corrigir cadastro
                            </button>
                        )
                    }
                >
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 md:grid-cols-4 xl:grid-cols-6">
                        <Field label="Nº OS">
                            <ReadOnly className="font-bold">
                                {os.number} <OriginTag origin={os.origin} />
                            </ReadOnly>
                        </Field>
                        <Field label="Etapa">
                            <ReadOnly>
                                <Situacao status={os.status} />
                            </ReadOnly>
                        </Field>
                        <Field label="Agendado para">
                            <ReadOnly>{os.scheduled_at ? date(os.scheduled_at, true) : '—'}</ReadOnly>
                        </Field>
                        <Field label="Chegou em">
                            <ReadOnly>{os.checked_in_at ? date(os.checked_in_at, true) : '—'}</ReadOnly>
                        </Field>
                        <Field label="Placa">
                            <ReadOnly>{v?.plate ? <Placa value={v.plate} /> : <span className="text-amber-700">informar na chegada</span>}</ReadOnly>
                        </Field>
                        <Field label="Km entrada">
                            <ReadOnly className="font-semibold tabular-nums">{km(os.km_in)}</ReadOnly>
                        </Field>
                        <Field label="Veículo" className="col-span-2">
                            <ReadOnly>
                                {v?.title || '—'}
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
                                    <ReadOnly>{documentFmt(os.client?.document) || <span className="text-zinc-400">completar</span>}</ReadOnly>
                                </Field>
                            </>
                        )}
                        <Field label="Mecânico" className="col-span-2">
                            {sensitive ? (
                                <select className={selectCls} value={os.mechanic?.id ?? ''} onChange={(e) => router.patch(route('os.update', os.id), { mechanic_id: e.target.value || null }, { preserveScroll: true })}>
                                    <option value="">— quem estiver livre —</option>
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
                        <Field label="Tipo">
                            {sensitive ? (
                                <select className={selectCls} value={os.service_type ?? ''} onChange={(e) => router.patch(route('os.update', os.id), { service_type: e.target.value || null }, { preserveScroll: true })}>
                                    <option value="">—</option>
                                    {Object.entries(serviceTypes).map(([k, l]) => (
                                        <option key={k} value={k}>
                                            {l}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <ReadOnly>{os.service_type ? SERVICE_TYPE[os.service_type] : '—'}</ReadOnly>
                            )}
                        </Field>
                    </div>
                </Block>

                <div id="os-abas" className="bg-card scroll-mt-16 overflow-hidden rounded-[4px] border border-[#c9cdd3]">
                    <div className="bg-[#f3f4f6] px-2 pt-2 dark:bg-zinc-800">
                        <Tabs<Tab>
                            value={tab}
                            onChange={setTab}
                            tabs={[
                                {
                                    value: 'vistoria',
                                    label: 'Vistoria de entrada',
                                    badge: os.inspected_at ? (
                                        <CircleCheck className="size-3.5 text-green-700" />
                                    ) : canInspect ? (
                                        <span className="rounded-[2px] bg-[#d42a2a] px-1 text-[10px] text-white">fazer</span>
                                    ) : null,
                                },
                                { value: 'diag', label: 'Relato e diagnóstico' },
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
                                { value: 'historico', label: 'Histórico' },
                            ]}
                        />
                    </div>

                    <div className="p-3">
                        {tab === 'diag' && (
                            <div className="grid gap-3 lg:grid-cols-2">
                                <Field label="O que o cliente relatou">
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
                                            <table className="w-full min-w-[700px] text-[13px]">
                                                <thead>
                                                    <tr className="border-b border-[#c9cdd3] bg-[#eceef1] text-left text-[11px] font-bold text-zinc-600 uppercase dark:bg-zinc-800">
                                                        <th className="h-8 w-20 px-2.5">Tipo</th>
                                                        <th className="px-2.5">Descrição</th>
                                                        <th className="px-2.5">Cliente</th>
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
                                                            <td colSpan={7} className="text-muted-foreground px-3 py-6 text-center">
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
                                                {
                                                    label: 'Descrição',
                                                    render: (r: OsItem) => (
                                                        <span className={r.approval === 'recusado' ? 'text-zinc-400 line-through' : ''}>
                                                            {r.description}
                                                            {r.extra && <span className="ml-1.5 rounded-[2px] bg-amber-400 px-1 text-[10px] font-bold text-black uppercase">complementar</span>}
                                                        </span>
                                                    ),
                                                },
                                                {
                                                    label: 'Cliente',
                                                    render: (r: OsItem) =>
                                                        r.approval === 'aprovado' ? (
                                                            <b className="text-green-700">✓ pode fazer</b>
                                                        ) : r.approval === 'recusado' ? (
                                                            <span className="text-zinc-500">não fazer</span>
                                                        ) : (
                                                            <span className="text-amber-700">aguardando</span>
                                                        ),
                                                    className: 'w-28',
                                                },
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

                        {tab === 'vistoria' && <Vistoria os={os} canEdit={canInspect} />}

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

            {primary && (
                <div className="no-print bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t border-[#c9cdd3] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
                    <button disabled={busy} onClick={primary.run} className="flex h-12 w-full items-center justify-center gap-2 rounded-[4px] bg-[#d42a2a] text-[16px] font-semibold text-white disabled:opacity-60">
                        <ArrowRight className="size-5" /> {primary.label}
                    </button>
                </div>
            )}

            <Dialog open={cadastro !== null} onOpenChange={(o) => !o && setCadastro(null)}>
                <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[4px] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{cadastro === 'checkin' ? 'Cliente chegou: confira os dados' : 'Cadastro do cliente e do veículo'}</DialogTitle>
                    </DialogHeader>
                    {cadastro && <CadastroForm os={os} checkin={cadastro === 'checkin'} onDone={() => setCadastro(null)} />}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
