import { ask } from '@/components/ask-dialog';
import { Field, selectCls, textareaCls } from '@/components/erp';
import { Input } from '@/components/ui/input';
import { type EntryOptions, type EntryType, type FinanceRow, moneyInput, todayIso } from '@/lib/finance';
import { money } from '@/lib/os';
import { cn } from '@/lib/utils';
import { Link, router, useForm } from '@inertiajs/react';
import { CircleCheck, Save, Trash2 } from 'lucide-react';

/**
 * Inclusão / alteração de entrada ou despesa (com parcelas na inclusão).
 * Entrada pode ser vinculada a uma OS: puxa cliente, descrição e o valor que falta receber,
 * e o pagamento passa a aparecer na própria OS.
 */
export function EntryForm({
    type,
    entry,
    options,
    osId,
    onDone,
}: {
    type: EntryType;
    entry?: FinanceRow;
    options: EntryOptions;
    /** abre já com esta OS escolhida (botão "Lançar" do painel) */
    osId?: number;
    onDone: () => void;
}) {
    const { categories, methods, parties, orders, partnerList } = options;
    const t = entry?.type ?? type;
    const preset = osId ? orders.find((o) => o.id === osId) : undefined;
    const { data, setData, post, put, processing, errors } = useForm({
        type: t,
        category: entry?.category ?? (preset ? 'servicos' : Object.keys(categories[t])[0]),
        description: entry?.description ?? (preset ? `OS ${preset.number} · ${preset.vehicle}` : ''),
        party: entry?.party ?? preset?.client ?? '',
        amount: entry ? moneyInput(entry.amount) : preset ? moneyInput(preset.remaining) : '',
        due_date: entry?.due_date ?? todayIso(),
        installments: '1',
        paid: entry ? !!entry.paid_at : !!preset,
        paid_at: entry?.paid_at ?? todayIso(),
        payment_method: entry?.payment_method ?? '',
        notes: entry?.notes ?? '',
        service_order_id: entry?.service_order_id ? String(entry.service_order_id) : preset ? String(preset.id) : '',
        partner_id: '',
    });
    const err = errors as Record<string, string>;
    const isIn = data.type === 'entrada';
    const n = Number(data.installments) || 1;
    const auto = entry && (entry.purchase_id || entry.service_order_id);
    // a OS atual do lançamento pode já não ter saldo (está quitada), mas continua na lista
    const osOptions = entry?.service_order_id && !orders.some((o) => o.id === entry.service_order_id) ? null : orders;

    const pickOs = (id: string) => {
        const os = orders.find((o) => String(o.id) === id);
        if (!os) return setData('service_order_id', '');
        setData((d) => ({
            ...d,
            service_order_id: id,
            category: 'servicos',
            party: os.client ?? d.party,
            description: `OS ${os.number} · ${os.vehicle}`,
            amount: moneyInput(os.remaining),
        }));
    };

    return (
        <form
            className="grid gap-3"
            onSubmit={(e) => {
                e.preventDefault();
                const opts = { preserveScroll: true, onSuccess: onDone };
                if (entry) put(route('financeiro.entries.update', entry.id), opts);
                else post(route('financeiro.entries.store'), opts);
            }}
        >
            {!entry && (
                <div className="grid grid-cols-2 overflow-hidden rounded-[3px] border border-[#b9bec6]">
                    {(['saida', 'entrada'] as EntryType[]).map((k) => (
                        <button
                            key={k}
                            type="button"
                            onClick={() =>
                                setData((d) => ({ ...d, type: k, category: Object.keys(categories[k])[0], service_order_id: '', party: '' }))
                            }
                            className={cn(
                                'h-10 text-[13px] font-bold uppercase md:h-8',
                                data.type === k ? (k === 'entrada' ? 'bg-green-700 text-white' : 'bg-[#d42a2a] text-white') : 'bg-card text-zinc-600',
                            )}
                        >
                            {k === 'entrada' ? 'Entrada (receita)' : 'Saída (despesa)'}
                        </button>
                    ))}
                </div>
            )}

            {auto && (
                <p className="rounded-[3px] border border-zinc-300 bg-zinc-50 px-3 py-2 text-[12px] dark:bg-zinc-800">
                    {entry.purchase_id ? (
                        <>
                            Lançado automaticamente pela <b>compra de peças</b>. Para mudar valor ou parcelas, exclua a compra em{' '}
                            <Link href={route('compras.index')} className="font-semibold text-[#b51f1f] hover:underline">
                                Compras
                            </Link>{' '}
                            e lance de novo.
                        </>
                    ) : (
                        <>
                            Pagamento da{' '}
                            <Link href={route('os.show', entry.service_order_id!)} className="font-semibold text-[#b51f1f] hover:underline">
                                OS {entry.os_number}
                            </Link>
                            . Ele também aparece na aba de pagamentos da OS.
                        </>
                    )}
                </p>
            )}

            <div className="grid gap-3 sm:grid-cols-6">
                {isIn && !entry?.purchase_id && (
                    <Field label="OS" className="sm:col-span-6" error={err.service_order_id}>
                        {osOptions ? (
                            <select className={selectCls} value={data.service_order_id} onChange={(e) => pickOs(e.target.value)}>
                                <option value="">— Receita avulsa, sem OS —</option>
                                {orders.map((o) => (
                                    <option key={o.id} value={o.id}>
                                        OS {o.number} · {o.client ?? '—'} · {o.vehicle} · {o.status_label} · falta {money(o.remaining)}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <Input value={`OS ${entry?.os_number} (já quitada)`} disabled />
                        )}
                    </Field>
                )}
                <Field label="Categoria *" className="sm:col-span-3" error={err.category}>
                    <select className={selectCls} value={data.category} onChange={(e) => setData('category', e.target.value)}>
                        {Object.entries(categories[data.type]).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label={isIn ? 'Cliente' : 'Fornecedor'} className="sm:col-span-3" error={err.party}>
                    <Input
                        list={`parties-${data.type}`}
                        value={data.party}
                        onChange={(e) => setData('party', e.target.value)}
                        placeholder={isIn ? 'Nome do cliente' : 'Nome do fornecedor'}
                    />
                    <datalist id={`parties-${data.type}`}>
                        {parties[data.type].map((p) => (
                            <option key={p} value={p} />
                        ))}
                    </datalist>
                </Field>
                <Field label="Descrição *" className="sm:col-span-6" error={err.description}>
                    <Input value={data.description} onChange={(e) => setData('description', e.target.value)} />
                </Field>
                <Field label={entry ? 'Valor *' : n > 1 ? 'Valor total *' : 'Valor *'} className="sm:col-span-2" error={err.amount}>
                    <Input
                        inputMode="decimal"
                        value={data.amount}
                        onChange={(e) => setData('amount', e.target.value)}
                        className="text-right font-semibold tabular-nums"
                        placeholder="0,00"
                    />
                </Field>
                <Field label={n > 1 ? '1º vencimento *' : 'Vencimento *'} className="sm:col-span-2" error={err.due_date}>
                    <Input type="date" value={data.due_date} onChange={(e) => setData('due_date', e.target.value)} />
                </Field>
                {!entry ? (
                    <Field label="Parcelas" className="sm:col-span-2">
                        <select className={selectCls} value={data.installments} onChange={(e) => setData('installments', e.target.value)}>
                            {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => (
                                <option key={i} value={i}>
                                    {i === 1 ? 'À vista (1x)' : `${i}x mensais`}
                                </option>
                            ))}
                        </select>
                    </Field>
                ) : (
                    <div className="sm:col-span-2" />
                )}
                <Field label="Forma de pagamento" className="sm:col-span-2">
                    <select className={selectCls} value={data.payment_method} onChange={(e) => setData('payment_method', e.target.value)}>
                        <option value="">—</option>
                        {Object.entries(methods).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </select>
                </Field>
                <div className="flex flex-wrap items-end gap-3 sm:col-span-4">
                    <label className="flex h-11 items-center gap-2 text-[13px] font-semibold md:h-8">
                        <input
                            type="checkbox"
                            className="size-4 accent-[#d42a2a]"
                            checked={data.paid}
                            onChange={(e) => setData('paid', e.target.checked)}
                        />
                        {isIn ? 'Já recebido' : 'Já pago'}
                        {!entry && n > 1 ? ' (1ª parcela)' : ''}
                    </label>
                    {data.paid && (
                        <Field label="Data do pagamento" className="w-44">
                            <Input type="date" value={data.paid_at} onChange={(e) => setData('paid_at', e.target.value)} />
                        </Field>
                    )}
                </div>
                {/* sócio que pagou/recebeu com o próprio dinheiro: vira aporte/retirada dele */}
                {!entry && data.paid && partnerList.length > 0 && (
                    <Field label={isIn ? 'Quem recebeu o dinheiro?' : 'De onde saiu o dinheiro?'} className="sm:col-span-6" error={err.partner_id}>
                        <select className={selectCls} value={data.partner_id} onChange={(e) => setData('partner_id', e.target.value)}>
                            <option value="">{isIn ? 'Entrou no caixa / conta da oficina' : 'Caixa / conta da oficina'}</option>
                            {partnerList.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {isIn
                                        ? `Ficou com o sócio ${p.name} (conta como retirada dele)`
                                        : `Do bolso do sócio ${p.name} (conta como aporte dele)`}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
                {entry?.paid_by && (
                    <p className="text-[12px] text-zinc-600 sm:col-span-6">
                        {isIn ? 'Recebido' : 'Pago'} pelo sócio <b>{entry.paid_by}</b> (lançado como {isIn ? 'retirada' : 'aporte'} dele em Sócios).
                    </p>
                )}
                <Field label="Observações" className="sm:col-span-6">
                    <textarea rows={2} className={textareaCls} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                </Field>
            </div>

            <div className="flex items-center justify-between gap-2">
                {entry ? (
                    <button
                        type="button"
                        className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] bg-white px-3 text-[13px] font-semibold text-[#b51f1f] md:h-8"
                        onClick={async () =>
                            (await ask(
                                entry.purchase_id
                                    ? 'Este lançamento veio de uma compra de peças. Excluir só a conta a pagar (a compra continua registrada)?'
                                    : 'Excluir este lançamento?',
                                { danger: true, okLabel: 'Excluir' },
                            )) && router.delete(route('financeiro.entries.destroy', entry.id), { preserveScroll: true, onSuccess: onDone })
                        }
                    >
                        <Trash2 className="size-4" /> Excluir
                    </button>
                ) : (
                    <span />
                )}
                <button
                    type="submit"
                    disabled={processing}
                    className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white disabled:opacity-60 md:h-8"
                >
                    <Save className="size-4" /> Gravar
                </button>
            </div>
        </form>
    );
}

/** Baixa: confirma a data e a forma em que foi pago/recebido (alimenta "recebimentos por forma"). */
export function PayForm({ entry, methods, onDone }: { entry: FinanceRow; methods: EntryOptions['methods']; onDone: () => void }) {
    const isIn = entry.type === 'entrada';
    const { data, setData, patch, processing } = useForm({ paid_at: todayIso(), payment_method: entry.payment_method ?? '' });
    return (
        <form
            className="grid gap-3"
            onSubmit={(e) => {
                e.preventDefault();
                patch(route('financeiro.entries.pay', entry.id), { preserveScroll: true, onSuccess: onDone });
            }}
        >
            <p className="text-[13px]">
                {entry.description} · <b>{money(entry.amount)}</b>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label={isIn ? 'Recebido em' : 'Pago em'}>
                    <Input type="date" value={data.paid_at} onChange={(e) => setData('paid_at', e.target.value)} />
                </Field>
                <Field label="Forma">
                    <select className={selectCls} value={data.payment_method} onChange={(e) => setData('payment_method', e.target.value)}>
                        <option value="">—</option>
                        {Object.entries(methods).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={processing}
                    className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-green-800 bg-green-700 px-4 text-[13px] font-semibold text-white disabled:opacity-60 md:h-8"
                >
                    <CircleCheck className="size-4" /> Confirmar {isIn ? 'recebimento' : 'pagamento'}
                </button>
            </div>
        </form>
    );
}
