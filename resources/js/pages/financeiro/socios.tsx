import { ask } from '@/components/ask-dialog';
import { Block, Field, Grid, Tool, selectCls, type Col } from '@/components/erp';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { dateBr, monthLabel, todayIso } from '@/lib/finance';
import { money } from '@/lib/os';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowDownToLine, ArrowUpFromLine, Save, Trash2, UserCog } from 'lucide-react';
import { useState } from 'react';

type Bal = { id: number; name: string; share: number; aportes: number; retiradas: number; net: number; target: number; diff: number };
type Mov = {
    id: number;
    partner: string;
    partner_id: number;
    type: 'aporte' | 'retirada';
    amount: number;
    date: string;
    description: string | null;
    from_entry: boolean;
};
type P = { id: number; name: string; share: number; active: boolean; user_id: number | null };

interface Props {
    month: string;
    balance: { partners: Bal[]; total: number };
    result: { in: number; out: number; total: number; split: { id: number; name: string; share: number; value: number }[] };
    movements: Mov[];
    partners: P[];
    users: { id: number; name: string }[];
}

const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

function MovementForm({ type, partners, onDone }: { type: 'aporte' | 'retirada'; partners: P[]; onDone: () => void }) {
    const active = partners.filter((p) => p.active);
    const { data, setData, post, processing, errors } = useForm({
        type,
        partner_id: String(active[0]?.id ?? ''),
        amount: '',
        date: todayIso(),
        description: '',
    });
    return (
        <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
                e.preventDefault();
                post(route('financeiro.movements.store'), { preserveScroll: true, onSuccess: onDone });
            }}
        >
            <Field label="Sócio *" error={errors.partner_id}>
                <select className={selectCls} value={data.partner_id} onChange={(e) => setData('partner_id', e.target.value)}>
                    {active.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Data *" error={errors.date}>
                <Input type="date" value={data.date} onChange={(e) => setData('date', e.target.value)} />
            </Field>
            <Field label="Valor *" error={errors.amount}>
                <Input
                    inputMode="decimal"
                    value={data.amount}
                    onChange={(e) => setData('amount', e.target.value)}
                    className="text-right font-semibold tabular-nums"
                    placeholder="0,00"
                    autoFocus
                />
            </Field>
            <Field label="Descrição">
                <Input value={data.description} onChange={(e) => setData('description', e.target.value)} />
            </Field>
            <div className="flex justify-end sm:col-span-2">
                <button
                    type="submit"
                    disabled={processing}
                    className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white md:h-8"
                >
                    <Save className="size-4" /> Gravar {type}
                </button>
            </div>
        </form>
    );
}

function PartnerRowForm({ p, users }: { p?: P; users: Props['users'] }) {
    const { data, setData, post, put, processing, isDirty, errors } = useForm({
        name: p?.name ?? '',
        share: String(p?.share ?? ''),
        active: p?.active ?? true,
        user_id: p?.user_id ? String(p.user_id) : '',
    });
    const save = () => {
        const opts = { preserveScroll: true };
        if (p) put(route('financeiro.partners.update', p.id), opts);
        else post(route('financeiro.partners.store'), opts);
    };
    return (
        <tr className="border-b border-[#e3e5e8]">
            <td className="p-1.5">
                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Nome do sócio" />
                {errors.name && <span className="text-[12px] text-red-600">{errors.name}</span>}
            </td>
            <td className="w-24 p-1.5">
                <Input
                    value={data.share}
                    onChange={(e) => setData('share', e.target.value)}
                    inputMode="decimal"
                    className="text-right tabular-nums"
                />
            </td>
            <td className="w-40 p-1.5">
                <select className={selectCls} value={data.user_id} onChange={(e) => setData('user_id', e.target.value)}>
                    <option value="">—</option>
                    {users.map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.name}
                        </option>
                    ))}
                </select>
            </td>
            <td className="w-16 p-1.5 text-center">
                <input
                    type="checkbox"
                    className="size-4 accent-[#d42a2a]"
                    checked={data.active}
                    onChange={(e) => setData('active', e.target.checked)}
                />
            </td>
            <td className="w-24 p-1.5">
                {(isDirty || !p) && (
                    <button
                        type="button"
                        onClick={save}
                        disabled={processing || !data.name}
                        className="h-9 w-full rounded-[3px] bg-zinc-900 text-[12px] font-semibold text-white md:h-8"
                    >
                        {p ? 'Gravar' : 'Incluir'}
                    </button>
                )}
            </td>
        </tr>
    );
}

export default function Socios({ month, balance, result, movements, partners, users }: Props) {
    const [dialog, setDialog] = useState<'aporte' | 'retirada' | 'socios' | null>(null);
    const shareSum = partners.filter((p) => p.active).reduce((s, p) => s + p.share, 0);
    const n = balance.partners.length;

    const balCols: Col<Bal>[] = [
        { label: 'Sócio', render: (r) => <b>{r.name}</b> },
        { label: 'Part.', render: (r) => pct(r.share), align: 'right', className: 'w-20', hide: 'sm' },
        { label: 'Aportes', render: (r) => money(r.aportes), align: 'right', className: 'w-32', hide: 'md' },
        { label: 'Retiradas', render: (r) => money(r.retiradas), align: 'right', className: 'w-32', hide: 'md' },
        { label: 'Investido líquido', render: (r) => <b>{money(r.net)}</b>, align: 'right', className: 'w-36' },
        { label: 'Parte ideal', render: (r) => money(r.target), align: 'right', className: 'w-32', hide: 'lg' },
        {
            label: 'Situação',
            render: (r) =>
                Math.abs(r.diff) < 1 ? (
                    <span className="font-semibold text-zinc-600">Em dia</span>
                ) : r.diff > 0 ? (
                    <span className="font-semibold text-green-800">{money(r.diff)} acima da parte</span>
                ) : (
                    <span className="font-bold text-[#b51f1f]">Precisa aportar {money(-r.diff)}</span>
                ),
            className: 'w-56',
        },
    ];

    const movCols: Col<Mov>[] = [
        { label: 'Data', render: (r) => dateBr(r.date), className: 'w-24' },
        { label: 'Sócio', render: (r) => r.partner, className: 'w-40' },
        {
            label: 'Tipo',
            render: (r) => (
                <span className={cn('text-[11px] font-bold uppercase', r.type === 'aporte' ? 'text-green-700' : 'text-[#b51f1f]')}>
                    {r.type === 'aporte' ? 'Aporte' : 'Retirada'}
                </span>
            ),
            className: 'w-24',
        },
        {
            label: 'Descrição',
            render: (r) => (
                <span>
                    {r.description ?? '—'}
                    {r.from_entry && (
                        <span className="ml-1.5 rounded-[2px] bg-zinc-200 px-1 text-[10px] font-semibold dark:bg-zinc-700">via lançamento</span>
                    )}
                </span>
            ),
            hide: 'sm',
        },
        { label: 'Valor', render: (r) => <b>{(r.type === 'retirada' ? '- ' : '') + money(r.amount)}</b>, align: 'right', className: 'w-32' },
        {
            label: '',
            render: (r) =>
                r.from_entry ? null : (
                    <button
                        title="Excluir"
                        onClick={async () =>
                            (await ask('Excluir esta movimentação?', { danger: true, okLabel: 'Excluir' })) &&
                            router.delete(route('financeiro.movements.destroy', r.id), { preserveScroll: true })
                        }
                        className="grid size-9 place-items-center rounded-[3px] text-zinc-500 hover:bg-red-50 hover:text-red-700 md:size-7"
                    >
                        <Trash2 className="size-4" />
                    </button>
                ),
            className: 'w-12',
            align: 'center',
        },
    ];

    return (
        <AppLayout
            title="Sócios"
            code="FIN020"
            toolbar={
                <>
                    <Tool primary icon={<ArrowDownToLine />} label="Novo aporte" onClick={() => setDialog('aporte')} />
                    <Tool icon={<ArrowUpFromLine />} label="Nova retirada" onClick={() => setDialog('retirada')} />
                    <Tool icon={<UserCog />} label="Cadastro de sócios" onClick={() => setDialog('socios')} />
                </>
            }
        >
            <Head title="Sócios" />
            <div className="grid gap-2 md:gap-3">
                <Block title="Equilíbrio dos aportes" bodyClassName="p-0">
                    <p className="border-b border-[#e3e5e8] bg-[#fafafa] px-3 py-2 text-[13px] dark:bg-zinc-900">
                        Total investido pelos sócios: <b>{money(balance.total)}</b>.{' '}
                        {n > 0 && (
                            <>
                                Pela participação, a parte de cada um é a coluna <b>Parte ideal</b>. Quem está abaixo precisa aportar a diferença para
                                todos ficarem iguais.
                            </>
                        )}
                    </p>
                    <Grid cols={balCols} rows={balance.partners} rowKey={(r) => r.id} empty="Cadastre os sócios para começar." />
                    {Math.abs(shareSum - 100) > 0.05 && n > 0 && (
                        <p className="border-t border-amber-300 bg-amber-50 px-3 py-1.5 text-[12px]">
                            A soma das participações está em {pct(shareSum)} (o normal é 100%). Ajuste em <b>Cadastro de sócios</b>.
                        </p>
                    )}
                </Block>

                <div className="grid gap-2 md:gap-3 xl:grid-cols-[380px_1fr]">
                    <Block
                        title={`Resultado e divisão · ${monthLabel(month)}`}
                        bodyClassName="p-0"
                        actions={
                            <Input
                                type="month"
                                value={month}
                                onChange={(e) => router.get(route('financeiro.partners'), { mes: e.target.value }, { preserveState: true })}
                                className="h-8 w-36 md:h-7"
                                aria-label="Mês"
                            />
                        }
                    >
                        <table className="w-full text-[13px]">
                            <tbody>
                                <tr className="border-b border-[#e3e5e8]">
                                    <td className="px-3 py-1.5">Recebido no mês</td>
                                    <td className="px-3 py-1.5 text-right text-green-800 tabular-nums">{money(result.in)}</td>
                                </tr>
                                <tr className="border-b border-[#e3e5e8]">
                                    <td className="px-3 py-1.5">Pago no mês</td>
                                    <td className="px-3 py-1.5 text-right text-[#b51f1f] tabular-nums">- {money(result.out)}</td>
                                </tr>
                                <tr className="border-b border-[#c9cdd3] bg-[#f3f4f6] font-bold dark:bg-zinc-800">
                                    <td className="px-3 py-1.5">Resultado do mês</td>
                                    <td className={cn('px-3 py-1.5 text-right tabular-nums', result.total < 0 && 'text-[#b51f1f]')}>
                                        {money(result.total)}
                                    </td>
                                </tr>
                                {result.split.map((s) => (
                                    <tr key={s.id} className="border-b border-[#e3e5e8] last:border-b-0">
                                        <td className="px-3 py-1.5">
                                            {s.name} <span className="text-zinc-500">({pct(s.share)})</span>
                                        </td>
                                        <td className={cn('px-3 py-1.5 text-right font-semibold tabular-nums', s.value < 0 && 'text-[#b51f1f]')}>
                                            {money(s.value)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Block>

                    <Block title="Movimentações dos sócios" bodyClassName="p-0">
                        <Grid
                            cols={movCols}
                            rows={movements}
                            rowKey={(r) => r.id}
                            empty="Nenhum aporte ou retirada."
                            footer={<span>{movements.length} movimentação(ões)</span>}
                        />
                    </Block>
                </div>
            </div>

            <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
                <DialogContent className={cn('max-h-[92svh] overflow-y-auto rounded-[4px]', dialog === 'socios' ? 'sm:max-w-3xl' : 'sm:max-w-xl')}>
                    <DialogHeader>
                        <DialogTitle>
                            {dialog === 'aporte' ? 'Novo aporte' : dialog === 'retirada' ? 'Nova retirada' : 'Cadastro de sócios'}
                        </DialogTitle>
                    </DialogHeader>
                    {(dialog === 'aporte' || dialog === 'retirada') && (
                        <MovementForm key={dialog} type={dialog} partners={partners} onDone={() => setDialog(null)} />
                    )}
                    {dialog === 'socios' && (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-[13px]">
                                <thead>
                                    <tr className="border-b border-[#c9cdd3] bg-[#eceef1] text-left text-[11px] font-bold text-zinc-600 uppercase dark:bg-zinc-800">
                                        <th className="h-8 px-2">Nome</th>
                                        <th className="px-2 text-right">Part. %</th>
                                        <th className="px-2">Usuário</th>
                                        <th className="px-2 text-center">Ativo</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {partners.map((p) => (
                                        <PartnerRowForm key={`${p.id}-${p.name}-${p.share}-${p.active}`} p={p} users={users} />
                                    ))}
                                    <PartnerRowForm key={`novo-${partners.length}`} users={users} />
                                </tbody>
                            </table>
                            <p className="text-muted-foreground mt-2 text-[12px]">
                                A participação (%) define a parte ideal de cada um nos aportes e a divisão do resultado.
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
