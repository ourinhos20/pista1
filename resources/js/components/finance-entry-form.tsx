import { Field, selectCls, textareaCls } from '@/components/erp';
import { Input } from '@/components/ui/input';
import { type Categories, type EntryType, type FinanceRow, type Methods, todayIso } from '@/lib/finance';
import { cn } from '@/lib/utils';
import { router, useForm } from '@inertiajs/react';
import { Save, Trash2 } from 'lucide-react';

/** Inclusão / alteração de entrada ou despesa (com parcelas na inclusão). */
export function EntryForm({
    type,
    entry,
    categories,
    methods,
    parties = [],
    onDone,
}: {
    type: EntryType;
    entry?: FinanceRow;
    categories: Categories;
    methods: Methods;
    parties?: string[];
    onDone: () => void;
}) {
    const t = entry?.type ?? type;
    const { data, setData, post, put, processing, errors } = useForm({
        type: t,
        category: entry?.category ?? Object.keys(categories[t])[0],
        description: entry?.description ?? '',
        party: entry?.party ?? '',
        amount: entry ? String(entry.amount).replace('.', ',') : '',
        due_date: entry?.due_date ?? todayIso(),
        installments: '1',
        paid: entry ? !!entry.paid_at : false,
        paid_at: entry?.paid_at ?? todayIso(),
        payment_method: entry?.payment_method ?? '',
        notes: entry?.notes ?? '',
    });
    const err = errors as Record<string, string>;
    const isIn = data.type === 'entrada';
    const n = Number(data.installments) || 1;

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
                            onClick={() => {
                                setData((d) => ({ ...d, type: k, category: Object.keys(categories[k])[0] }));
                            }}
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

            <div className="grid gap-3 sm:grid-cols-6">
                <Field label="Categoria *" className="sm:col-span-3" error={err.category}>
                    <select className={selectCls} value={data.category} onChange={(e) => setData('category', e.target.value)}>
                        {Object.entries(categories[data.type]).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label={isIn ? 'Cliente / origem' : 'Fornecedor / favorecido'} className="sm:col-span-3" error={err.party}>
                    <Input list="parties" value={data.party} onChange={(e) => setData('party', e.target.value)} />
                    <datalist id="parties">
                        {parties.map((p) => (
                            <option key={p} value={p} />
                        ))}
                    </datalist>
                </Field>
                <Field label="Descrição *" className="sm:col-span-6" error={err.description}>
                    <Input value={data.description} onChange={(e) => setData('description', e.target.value)} placeholder={isIn ? 'Ex.: serviço avulso' : 'Ex.: pastilhas e discos – NF 1234'} />
                </Field>
                <Field label={entry ? 'Valor (R$) *' : n > 1 ? 'Valor total (R$) *' : 'Valor (R$) *'} className="sm:col-span-2" error={err.amount}>
                    <Input inputMode="decimal" value={data.amount} onChange={(e) => setData('amount', e.target.value)} className="text-right font-semibold tabular-nums" placeholder="0,00" />
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
                <div className="flex items-end gap-3 sm:col-span-4">
                    <label className="flex h-11 items-center gap-2 text-[13px] font-semibold md:h-8">
                        <input type="checkbox" className="size-4 accent-[#d42a2a]" checked={data.paid} onChange={(e) => setData('paid', e.target.checked)} />
                        {isIn ? 'Já recebido' : 'Já pago'}
                        {!entry && n > 1 ? ' (1ª parcela)' : ''}
                    </label>
                    {data.paid && (
                        <Field label="Data do pagamento" className="w-44">
                            <Input type="date" value={data.paid_at} onChange={(e) => setData('paid_at', e.target.value)} />
                        </Field>
                    )}
                </div>
                <Field label="Observações" className="sm:col-span-6">
                    <textarea rows={2} className={textareaCls} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                </Field>
            </div>

            <div className="flex items-center justify-between gap-2">
                {entry ? (
                    <button
                        type="button"
                        className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] bg-white px-3 text-[13px] font-semibold text-[#b51f1f] md:h-8"
                        onClick={() => confirm('Excluir este lançamento?') && router.delete(route('financeiro.entries.destroy', entry.id), { preserveScroll: true, onSuccess: onDone })}
                    >
                        <Trash2 className="size-4" /> Excluir
                    </button>
                ) : (
                    <span />
                )}
                <button type="submit" disabled={processing} className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white disabled:opacity-60 md:h-8">
                    <Save className="size-4" /> Gravar
                </button>
            </div>
        </form>
    );
}
