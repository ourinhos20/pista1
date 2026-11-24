import { CarDiagramSvg, DamageLegend } from '@/components/car-diagram';
import InputError from '@/components/input-error';
import { Info, Page, Panel, PlateBadge, StatusBadge } from '@/components/oficina';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { ENTRY_CHECKLIST, FLOW, FUEL, NEXT_STEP, PAYMENT, STATUS, date, documentFmt, km, money, phone, plate, whatsapp } from '@/lib/os';
import { cn } from '@/lib/utils';
import type { OsFull, OsItem, OsStatus, SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowRight, Check, ChevronRight, LoaderCircle, MessageCircle, Plus, Printer, Trash2, UserCheck } from 'lucide-react';
import { useState } from 'react';

interface Props {
    os: OsFull;
    history: { id: number; number: string; status: OsStatus; date: string; km_in: number | null; summary: string | null }[];
    mechanics: { id: number; name: string }[];
    statuses: { value: OsStatus; label: string }[];
}

const MECHANIC_ALLOWED: OsStatus[] = ['diagnostico', 'aprovacao', 'execucao', 'pronto'];

function StatusTrack({ status }: { status: OsStatus }) {
    const current = FLOW.indexOf(status);
    return (
        <ol className="flex items-center gap-1 overflow-x-auto pb-1">
            {FLOW.map((s, i) => {
                const done = current >= 0 && i < current;
                const active = i === current;
                return (
                    <li key={s} className="flex min-w-0 flex-1 items-center gap-1">
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                            <div className={cn('h-1.5 rounded-full', done || active ? STATUS[s].dot : 'bg-zinc-200 dark:bg-zinc-800')} />
                            <span className={cn('truncate text-xs', active ? 'text-foreground font-semibold' : 'text-muted-foreground')}>{STATUS[s].label}</span>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

function ItemRow({ item, osId, sensitive }: { item: OsItem; osId: number; sensitive: boolean }) {
    const [price, setPrice] = useState(String(item.unit_price ?? 0));
    const [qty, setQty] = useState(String(item.quantity));

    const save = () => {
        const p = Number(price.replace(',', '.')) || 0;
        const q = Number(qty.replace(',', '.')) || 1;
        if (p === item.unit_price && q === item.quantity) return;
        router.put(route('os.items.update', [osId, item.id]), { ...item, unit_price: p, quantity: q }, { preserveScroll: true });
    };

    return (
        <li className="flex items-center gap-3 py-3">
            <span
                className={cn(
                    'shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase',
                    item.type === 'peca' ? 'bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
                )}
            >
                {item.type === 'peca' ? 'Peça' : 'Serviço'}
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-medium">{item.description}</span>
            {sensitive ? (
                <>
                    <Input value={qty} onChange={(e) => setQty(e.target.value)} onBlur={save} inputMode="decimal" className="tabular h-10 w-16 text-center" aria-label="Quantidade" />
                    <div className="relative">
                        <span className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2 text-sm">R$</span>
                        <Input value={price} onChange={(e) => setPrice(e.target.value)} onBlur={save} inputMode="decimal" className="tabular h-10 w-28 pl-8 text-right" aria-label="Valor unitário" />
                    </div>
                    <span className="tabular hidden w-24 text-right font-semibold sm:block">{money(item.total)}</span>
                    <button
                        type="button"
                        aria-label="Remover item"
                        className="text-muted-foreground hover:text-destructive grid size-10 place-items-center rounded-lg"
                        onClick={() => confirm(`Remover "${item.description}"?`) && router.delete(route('os.items.destroy', [osId, item.id]), { preserveScroll: true })}
                    >
                        <Trash2 className="size-4" />
                    </button>
                </>
            ) : (
                <span className="tabular text-muted-foreground text-sm">× {item.quantity}</span>
            )}
        </li>
    );
}

function AddItem({ osId, sensitive }: { osId: number; sensitive: boolean }) {
    const { data, setData, post, processing, errors, reset } = useForm({ type: 'servico' as 'servico' | 'peca', description: '', quantity: '1', unit_price: '' });
    return (
        <form
            className="flex flex-wrap items-start gap-2 border-t pt-4"
            onSubmit={(e) => {
                e.preventDefault();
                post(route('os.items.store', osId), { preserveScroll: true, onSuccess: () => reset('description', 'unit_price', 'quantity') });
            }}
        >
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                {(['servico', 'peca'] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setData('type', t)}
                        className={cn('h-10 rounded-lg px-3 text-sm font-semibold', data.type === t ? 'bg-card shadow ring-1 ring-black/5' : 'text-muted-foreground')}
                    >
                        {t === 'peca' ? 'Peça' : 'Serviço'}
                    </button>
                ))}
            </div>
            <div className="min-w-[220px] flex-1">
                <Input
                    placeholder={sensitive ? 'Descrição da peça ou serviço' : 'Peça ou serviço necessário'}
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    className="h-12 text-base"
                />
                <InputError message={errors.description} />
            </div>
            <Input value={data.quantity} onChange={(e) => setData('quantity', e.target.value)} inputMode="decimal" className="tabular h-12 w-20 text-center" aria-label="Quantidade" placeholder="Qtd" />
            {sensitive && (
                <Input value={data.unit_price} onChange={(e) => setData('unit_price', e.target.value)} inputMode="decimal" placeholder="Valor R$" className="tabular h-12 w-32" />
            )}
            <Button type="submit" variant="outline" className="h-12" disabled={processing || !data.description}>
                <Plus className="size-4" /> {sensitive ? 'Adicionar' : 'Pedir'}
            </Button>
        </form>
    );
}

function Payment({ os }: { os: OsFull }) {
    const { data, setData, patch, processing, isDirty, transform } = useForm({
        discount: String(os.discount ?? 0),
        down_payment: String(os.down_payment ?? 0),
        payment_method: os.payment_method ?? '',
    });
    const remaining = Math.max(0, (os.total ?? 0) - (Number(data.down_payment.replace(',', '.')) || 0));

    return (
        <div className="grid gap-4">
            <dl className="grid gap-2 text-[15px]">
                <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="tabular font-medium">{money(os.subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Desconto</dt>
                    <dd>
                        <Input value={data.discount} onChange={(e) => setData('discount', e.target.value)} inputMode="decimal" className="tabular h-10 w-28 text-right" />
                    </dd>
                </div>
                <div className="flex items-baseline justify-between border-t pt-3">
                    <dt className="font-semibold">Total</dt>
                    <dd className="tabular text-3xl font-bold tracking-tight">{money(os.total)}</dd>
                </div>
            </dl>
            <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-sm font-medium">
                    Entrada
                    <Input value={data.down_payment} onChange={(e) => setData('down_payment', e.target.value)} inputMode="decimal" className="tabular h-11" />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                    Pagamento
                    <select value={data.payment_method} onChange={(e) => setData('payment_method', e.target.value)} className="border-input bg-card h-11 rounded-xl border px-2">
                        <option value="">—</option>
                        {Object.entries(PAYMENT).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            <p className="text-muted-foreground flex justify-between text-sm">
                <span>Restante a receber</span>
                <span className="tabular text-foreground font-semibold">{money(remaining)}</span>
            </p>
            {isDirty && (
                <Button
                    disabled={processing}
                    onClick={() => {
                        transform((d) => ({
                            discount: Number(d.discount.replace(',', '.')) || 0,
                            down_payment: Number(d.down_payment.replace(',', '.')) || 0,
                            payment_method: d.payment_method || null,
                        }) as never);
                        patch(route('os.update', os.id), { preserveScroll: true });
                    }}
                >
                    Salvar valores
                </Button>
            )}
        </div>
    );
}

export default function OsShow({ os, history, mechanics, statuses }: Props) {
    const { auth } = usePage<SharedData>().props;
    const sensitive = auth.can.sensitive;
    const isMechanic = auth.user.role === 'mecanico';
    const [busy, setBusy] = useState(false);
    const diag = useForm({ diagnosis: os.diagnosis ?? '' });

    const next = NEXT_STEP[os.status];
    const canNext = next && (!isMechanic || MECHANIC_ALLOWED.includes(next.to));

    const setStatus = (status: OsStatus) => {
        setBusy(true);
        router.patch(route('os.status', os.id), { status }, { preserveScroll: true, onFinish: () => setBusy(false) });
    };

    const v = os.vehicle;
    const budgetText = [
        `Olá, ${os.client?.name?.split(' ')[0]}! Aqui é da Pista 1 Mecânica Automotiva.`,
        `Orçamento da OS ${os.number} — ${v?.title} (${plate(v?.plate)}):`,
        '',
        ...os.items.map((i) => `• ${i.description}${i.quantity !== 1 ? ` (${i.quantity}x)` : ''} — ${money(i.total)}`),
        '',
        os.discount ? `Desconto: ${money(os.discount)}` : '',
        `*Total: ${money(os.total)}*`,
        '',
        'Podemos seguir com o serviço? Responda SIM para aprovar.',
    ]
        .filter((l, i, a) => l !== '' || a[i - 1] !== '')
        .join('\n');
    const readyText = `Olá, ${os.client?.name?.split(' ')[0]}! Seu ${v?.title} (${plate(v?.plate)}) está pronto para retirada na Pista 1. Total: ${money(os.total)}. Te esperamos!`;
    const waBudget = sensitive ? whatsapp(os.client?.phone, budgetText) : null;
    const waReady = sensitive ? whatsapp(os.client?.phone, readyText) : null;

    const printTypes = sensitive
        ? [
              ['cliente', 'Ficha do cliente (orçamento / OS)'],
              ['entrada', 'Vistoria de entrada (avarias)'],
              ['diagnostico', 'Ficha do mecânico (diagnóstico)'],
              ['revisao', 'Checklist de revisão completa'],
          ]
        : [
              ['diagnostico', 'Ficha de diagnóstico'],
              ['revisao', 'Checklist de revisão completa'],
          ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: isMechanic ? 'Minhas OS' : 'Ordens de serviço', href: isMechanic ? '/mecanico' : '/os' },
                { title: `OS ${os.number}`, href: `/os/${os.id}` },
            ]}
        >
            <Head title={`OS ${os.number} · ${plate(v?.plate)}`} />
            <Page>
                {/* Cabeçalho: placa, carro e status em destaque */}
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-4">
                        <PlateBadge value={v?.plate} size="lg" />
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{v?.title || 'Veículo'}</h1>
                            <p className="text-muted-foreground mt-0.5 text-[15px]">
                                OS {os.number} · {os.client?.name}
                                {v?.color ? ` · ${v.color}` : ''}
                            </p>
                        </div>
                    </div>
                    <StatusBadge status={os.status} className="self-start px-3 py-1.5 text-sm" />
                </div>

                <StatusTrack status={os.status} />

                {/* Ações */}
                <div className="flex flex-wrap gap-2">
                    {canNext && (
                        <Button size="lg" className="hidden md:inline-flex" disabled={busy} onClick={() => setStatus(next.to)}>
                            {busy ? <LoaderCircle className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
                            {next.label}
                        </Button>
                    )}
                    {isMechanic && !os.mechanic && (
                        <Button size="lg" variant="outline" onClick={() => router.post(route('os.assume', os.id), {}, { preserveScroll: true })}>
                            <UserCheck className="size-5" /> Assumir esta OS
                        </Button>
                    )}
                    {waBudget && os.items.length > 0 && ['diagnostico', 'aprovacao'].includes(os.status) && (
                        <Button size="lg" variant="outline" asChild>
                            <a href={waBudget} target="_blank" rel="noreferrer" onClick={() => os.status === 'diagnostico' && setStatus('aprovacao')}>
                                <MessageCircle className="size-5 text-green-600" /> Enviar orçamento
                            </a>
                        </Button>
                    )}
                    {waReady && os.status === 'pronto' && (
                        <Button size="lg" variant="outline" asChild>
                            <a href={waReady} target="_blank" rel="noreferrer">
                                <MessageCircle className="size-5 text-green-600" /> Avisar que está pronto
                            </a>
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="lg" variant="outline">
                                <Printer className="size-5" /> Imprimir
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-72 rounded-xl p-1.5">
                            {printTypes.map(([k, label]) => (
                                <DropdownMenuItem key={k} asChild className="h-11 rounded-lg text-[15px]">
                                    <a href={route('os.print', [os.id, k])} target="_blank" rel="noreferrer">
                                        {label}
                                    </a>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {sensitive && (
                        <select
                            aria-label="Mudar status"
                            className="border-input bg-card text-muted-foreground h-14 rounded-2xl border px-3 text-[15px] font-medium"
                            value=""
                            onChange={(e) => e.target.value && setStatus(e.target.value as OsStatus)}
                        >
                            <option value="">Mudar status…</option>
                            {statuses
                                .filter((s) => s.value !== os.status)
                                .map((s) => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                        </select>
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="grid content-start gap-6 lg:col-span-2">
                        <Panel title="Relato do cliente">
                            <p className="text-[17px] leading-relaxed whitespace-pre-line">{os.complaint || <span className="text-muted-foreground">Nada relatado.</span>}</p>
                        </Panel>

                        <Panel title="Diagnóstico do mecânico">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    diag.patch(route('os.diagnosis', os.id), { preserveScroll: true });
                                }}
                                className="grid gap-3"
                            >
                                <textarea
                                    rows={5}
                                    value={diag.data.diagnosis}
                                    onChange={(e) => diag.setData('diagnosis', e.target.value)}
                                    placeholder="O que foi encontrado no carro, testes feitos, o que precisa trocar…"
                                    className="border-input bg-card focus-visible:ring-ring rounded-xl border px-3 py-3 text-base leading-relaxed outline-none focus-visible:ring-2"
                                />
                                {diag.isDirty && (
                                    <Button type="submit" disabled={diag.processing} className="justify-self-start">
                                        <Check className="size-4" /> Salvar diagnóstico
                                    </Button>
                                )}
                            </form>
                        </Panel>

                        <Panel title={sensitive ? 'Serviços e peças' : 'Serviços e peças pedidos'}>
                            {os.items.length ? (
                                <ul className="divide-y">
                                    {os.items.map((i) => (
                                        <ItemRow key={`${i.id}-${i.unit_price}-${i.quantity}`} item={i} osId={os.id} sensitive={sensitive} />
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground pb-4 text-[15px]">Nenhum item ainda.</p>
                            )}
                            <AddItem osId={os.id} sensitive={sensitive} />
                        </Panel>

                        <Panel title="Vistoria de entrada">
                            <dl className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                                <Info label="Km na entrada">
                                    <span className="tabular text-lg font-bold">{km(os.km_in)}</span>
                                </Info>
                                <Info label="Combustível">{os.fuel_level !== null ? FUEL[os.fuel_level] : '—'}</Info>
                                <Info label="Abertura">{date(os.created_at, true)}</Info>
                                <Info label="Agendado">{os.scheduled_at ? date(os.scheduled_at, true) : '—'}</Info>
                            </dl>
                            <div className="mb-5 flex flex-wrap gap-1.5">
                                {ENTRY_CHECKLIST.filter((c) => os.checklist?.[c.key]).map((c) => (
                                    <span key={c.key} className="bg-muted inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium">
                                        <Check className="size-3.5" /> {c.label}
                                    </span>
                                ))}
                            </div>
                            <div className="bg-muted/50 rounded-2xl p-2 md:p-4">
                                <CarDiagramSvg damages={os.damages} />
                            </div>
                            <div className="mt-4">
                                <DamageLegend damages={os.damages} />
                            </div>
                        </Panel>
                    </div>

                    <div className="grid content-start gap-6">
                        {sensitive && (
                            <Panel title="Valores">
                                <Payment key={`${os.total}-${os.down_payment}-${os.discount}`} os={os} />
                            </Panel>
                        )}

                        <Panel title="Responsável">
                            {sensitive ? (
                                <select
                                    className="border-input bg-card h-12 w-full rounded-xl border px-3 text-base"
                                    value={os.mechanic?.id ?? ''}
                                    onChange={(e) => router.patch(route('os.update', os.id), { mechanic_id: e.target.value || null }, { preserveScroll: true })}
                                >
                                    <option value="">Sem mecânico</option>
                                    {mechanics.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-[15px] font-medium">{os.mechanic?.name ?? 'Sem mecânico'}</p>
                            )}
                        </Panel>

                        {sensitive && os.client && (
                            <Panel
                                title="Cliente"
                                action={
                                    <Link href={route('clientes.show', os.client.id)} className="text-primary text-sm font-semibold">
                                        Abrir ficha
                                    </Link>
                                }
                            >
                                <dl className="grid gap-3">
                                    <Info label="Nome">{os.client.name}</Info>
                                    <Info label="WhatsApp">{phone(os.client.phone)}</Info>
                                    <Info label="CPF / CNPJ">{documentFmt(os.client.document)}</Info>
                                </dl>
                            </Panel>
                        )}

                        <Panel
                            title="Histórico do carro"
                            action={
                                v && (
                                    <Link href={route('veiculos.show', v.id)} className="text-primary text-sm font-semibold">
                                        Ver tudo
                                    </Link>
                                )
                            }
                        >
                            {history.length ? (
                                <ul className="grid gap-1">
                                    {history.map((h) => (
                                        <li key={h.id}>
                                            <Link href={route('os.show', h.id)} className="hover:bg-muted -mx-2 flex items-center gap-2 rounded-xl px-2 py-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold">
                                                        {date(h.date)} <span className="text-muted-foreground font-normal">· {km(h.km_in)}</span>
                                                    </p>
                                                    <p className="text-muted-foreground truncate text-sm">{h.summary || '—'}</p>
                                                </div>
                                                <ChevronRight className="text-muted-foreground size-4" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-sm">Primeira vez deste carro na oficina.</p>
                            )}
                        </Panel>

                        <Panel title="Movimentação">
                            <ol className="grid gap-3">
                                {os.events.map((e) => (
                                    <li key={e.id} className="flex gap-3 text-sm">
                                        <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', e.status ? STATUS[e.status].dot : 'bg-zinc-300')} />
                                        <div>
                                            <p className="font-medium">
                                                {e.note || (e.status ? STATUS[e.status].label : '')}
                                            </p>
                                            <p className="text-muted-foreground">
                                                {date(e.created_at, true)}
                                                {e.user ? ` · ${e.user}` : ''}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </Panel>

                        {auth.can.master && (
                            <button
                                type="button"
                                className="text-muted-foreground hover:text-destructive justify-self-start text-sm"
                                onClick={() => confirm(`Excluir a OS ${os.number}? Esta ação não pode ser desfeita.`) && router.delete(route('os.destroy', os.id))}
                            >
                                Excluir OS
                            </button>
                        )}
                    </div>
                </div>
            </Page>

            {/* Celular: ação principal no rodapé */}
            {canNext && (
                <div className={cn('no-print bg-background/95 fixed inset-x-0 z-30 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden', isMechanic ? 'bottom-0' : 'bottom-16')}>
                    <Button size="lg" className="w-full" disabled={busy} onClick={() => setStatus(next.to)}>
                        {busy ? <LoaderCircle className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
                        {next.label}
                    </Button>
                </div>
            )}
        </AppLayout>
    );
}
