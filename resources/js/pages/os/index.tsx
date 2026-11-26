import { Block, Field, Grid, OriginTag, Placa, Since, Situacao, Tool, selectCls, type Col } from '@/components/erp';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { SERVICE_TYPE, STATUS, date, money, time } from '@/lib/os';
import type { OsCard, OsStatus } from '@/types';
import { Head, router } from '@inertiajs/react';
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
            toolbar={<Tool primary icon={<Plus />} label="Nova OS" fkey="F2" href={route('os.create')} />}
        >
            <Head title="Ordens de serviço" />
            <div className="grid gap-2 md:gap-3">
                <Block title="Filtros">
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
        </AppLayout>
    );
}
