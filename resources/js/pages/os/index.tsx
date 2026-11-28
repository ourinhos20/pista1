import { Block, Field, Grid, OriginTag, OsMobileRow, Placa, Since, Situacao, Tool, selectCls, type Col } from '@/components/erp';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { SERVICE_TYPE, STATUS, date, money, time } from '@/lib/os';
import { cn } from '@/lib/utils';
import type { OsCard, OsStatus } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';

const STATUSES: OsStatus[] = [
    'aguardando',
    'recebido',
    'diagnostico',
    'orcamento',
    'aprovacao',
    'pecas',
    'execucao',
    'pronto',
    'entregue',
    'cancelada',
];

type Filters = { status: string; q: string; origem: string };

/** Filtros rápidos do celular (os mesmos das caixas de seleção do computador). */
const chips: { label: string; status: string; origem: string; dot?: string }[] = [
    { label: 'Em aberto', status: 'abertas', origem: '' },
    { label: 'Online', status: 'aguardando', origem: 'online' },
    ...(['aguardando', 'recebido', 'diagnostico', 'orcamento', 'aprovacao', 'pecas', 'execucao', 'pronto'] as OsStatus[]).map((s) => ({
        label: STATUS[s].short,
        status: s,
        origem: '',
        dot: STATUS[s].dot,
    })),
    { label: 'Entregues', status: 'entregue', origem: '' },
    { label: 'Todas', status: 'todas', origem: '' },
];

export default function OsIndex({ orders, filters }: { orders: OsCard[]; filters: Filters }) {
    const [q, setQ] = useState(filters.q);
    const [status, setStatus] = useState(filters.status);
    const [origem, setOrigem] = useState(filters.origem ?? '');
    const search = (params?: Partial<Filters>) =>
        router.get(route('os.index'), { status, q, origem, ...params }, { preserveState: true, replace: true });

    const cols: Col<OsCard>[] = [
        {
            label: 'Nº OS',
            render: (r) => (
                <span className="flex items-center gap-1.5">
                    <b className="tabular-nums">{r.number}</b>
                    <OriginTag origin={r.origin} />
                    {r.online_new && <span className="rounded-[2px] bg-[#d42a2a] px-1 text-[10px] font-bold text-white">NOVO</span>}
                </span>
            ),
            className: 'w-28',
        },
        {
            label: 'Agendado',
            render: (r) => (r.scheduled_at ? `${date(r.scheduled_at)} ${time(r.scheduled_at)}` : '—'),
            hide: 'lg',
            className: 'w-36',
        },
        {
            label: 'Placa',
            render: (r) => (r.vehicle?.plate ? <Placa value={r.vehicle.plate} /> : <span className="text-[12px] text-zinc-400">sem placa</span>),
            className: 'w-24',
        },
        { label: 'Veículo', render: (r) => r.vehicle?.title },
        { label: 'Cliente', render: (r) => r.client?.name, hide: 'md' },
        { label: 'Tipo', render: (r) => (r.service_type ? SERVICE_TYPE[r.service_type] : '—'), hide: 'lg', className: 'w-36' },
        { label: 'Mecânico', render: (r) => r.mechanic?.name ?? '—', hide: 'lg' },
        {
            label: 'Situação',
            render: (r) => (
                <span className="flex flex-wrap items-center gap-x-2">
                    <Situacao status={r.status} />
                    <Since iso={r.status_since} status={r.status} />
                </span>
            ),
        },
        { label: 'Valor', render: (r) => (r.total ? money(r.total) : '—'), align: 'right', hide: 'sm' },
    ];

    return (
        <AppLayout
            title="Ordens de Serviço"
            code="ATD020"
            toolbar={<Tool primary icon={<Plus />} label="Nova OS" fkey="F2" href={route('os.create')} className="hidden md:inline-flex" />}
        >
            <Head title="Ordens de serviço" />
            <div className="grid gap-3">
                {/* celular: busca larga e filtros em botões que deslizam para o lado */}
                <div className="grid gap-3 md:hidden">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            search();
                        }}
                    >
                        <label className="flex h-12 items-center gap-2 rounded-xl border border-[#dfe2e6] bg-white px-3.5 text-zinc-500 focus-within:border-[#d42a2a] focus-within:ring-2 focus-within:ring-[#d42a2a]/20 dark:border-zinc-700 dark:bg-zinc-900">
                            <Search className="size-5 shrink-0" />
                            <span className="sr-only">Pesquisar</span>
                            <input
                                type="search"
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Nome, CPF, telefone, placa ou nº"
                                className="min-w-0 flex-1 bg-transparent text-base text-zinc-900 outline-none dark:text-white"
                            />
                        </label>
                    </form>
                    <div role="group" aria-label="Filtrar" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                        {chips.map((c) => {
                            const on = c.status === status && c.origem === origem;
                            return (
                                <button
                                    key={c.label}
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => {
                                        setStatus(c.status);
                                        setOrigem(c.origem);
                                        search({ status: c.status, origem: c.origem });
                                    }}
                                    className={cn(
                                        'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold whitespace-nowrap',
                                        on
                                            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                                            : 'border-[#dfe2e6] bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200',
                                    )}
                                >
                                    {c.dot && <span className={cn('size-2 rounded-full', c.dot)} />}
                                    {c.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <Block title="Filtros" className="hidden md:block">
                    <form
                        className="grid items-end gap-2 sm:grid-cols-[220px_180px_1fr_auto]"
                        onSubmit={(e) => {
                            e.preventDefault();
                            search();
                        }}
                    >
                        <Field label="Situação">
                            <select
                                className={selectCls}
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    search({ status: e.target.value });
                                }}
                            >
                                <option value="abertas">Em aberto (todas)</option>
                                {STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                        {STATUS[s].label}
                                    </option>
                                ))}
                                <option value="todas">Todas as OS</option>
                            </select>
                        </Field>
                        <Field label="Origem">
                            <select
                                className={selectCls}
                                value={origem}
                                onChange={(e) => {
                                    setOrigem(e.target.value);
                                    search({ origem: e.target.value });
                                }}
                            >
                                <option value="">Todas</option>
                                <option value="online">Online</option>
                                <option value="bot">Bot do WhatsApp</option>
                                <option value="site">Site</option>
                                <option value="balcao">Balcão</option>
                            </select>
                        </Field>
                        <Field label="Pesquisar">
                            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, CPF, telefone, placa ou nº da OS" />
                        </Field>
                        <Tool icon={<Search />} label="Pesquisar" onClick={() => search()} />
                    </form>
                </Block>

                <Block title="Resultado" bodyClassName="p-0">
                    <Grid
                        cols={cols}
                        rows={orders}
                        rowKey={(r) => r.id}
                        onRowClick={(r) => router.visit(route('os.show', r.id))}
                        mobile={(r) => (
                            <OsMobileRow
                                os={r}
                                when={
                                    r.status === 'aguardando' ? (
                                        <span className="text-[12px] text-zinc-600">
                                            {r.scheduled_at ? `${date(r.scheduled_at)} ${time(r.scheduled_at)}` : 'a combinar'}
                                        </span>
                                    ) : undefined
                                }
                            />
                        )}
                        empty="Nenhuma OS encontrada com esses filtros."
                        footer={
                            <>
                                <span>{orders.length} registro(s)</span>
                                <span className="hidden md:inline">Clique na linha para abrir a OS</span>
                            </>
                        }
                    />
                </Block>
            </div>

            {/* celular: Nova OS ao alcance do polegar, acima da barra de navegação */}
            <Link
                href={route('os.create')}
                className="no-print fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex h-14 items-center gap-2 rounded-2xl bg-[#d42a2a] pr-5 pl-4 text-[16px] font-bold text-white shadow-[0_8px_20px_rgba(212,42,42,0.32)] md:hidden"
            >
                <Plus className="size-[22px]" /> Nova OS
            </Link>
        </AppLayout>
    );
}
