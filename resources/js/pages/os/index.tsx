import { Block, Field, Grid, Placa, Situacao, Tool, selectCls, type Col } from '@/components/erp';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { STATUS, date, money, time } from '@/lib/os';
import type { OsCard, OsStatus } from '@/types';
import { Head, router } from '@inertiajs/react';
import { FilePlus2, Search } from 'lucide-react';
import { useState } from 'react';

const STATUSES: OsStatus[] = ['aguardando', 'diagnostico', 'orcamento', 'aprovacao', 'execucao', 'pronto', 'entregue', 'cancelada'];

export default function OsIndex({ orders, filters }: { orders: OsCard[]; filters: { status: string; q: string } }) {
    const [q, setQ] = useState(filters.q);
    const [status, setStatus] = useState(filters.status);
    const search = (params?: Partial<typeof filters>) => router.get(route('os.index'), { status, q, ...params }, { preserveState: true, replace: true });

    const cols: Col<OsCard>[] = [
        { label: 'Nº OS', render: (r) => <b className="tabular-nums">{r.number}</b>, className: 'w-20' },
        { label: 'Abertura', render: (r) => date(r.created_at), hide: 'md', className: 'w-24' },
        { label: 'Agendado', render: (r) => (r.scheduled_at ? `${date(r.scheduled_at)} ${time(r.scheduled_at)}` : '—'), hide: 'lg', className: 'w-36' },
        { label: 'Placa', render: (r) => <Placa value={r.vehicle?.plate} />, className: 'w-24' },
        { label: 'Veículo', render: (r) => r.vehicle?.title },
        { label: 'Cliente', render: (r) => r.client?.name, hide: 'md' },
        { label: 'Mecânico', render: (r) => r.mechanic?.name ?? '—', hide: 'lg' },
        { label: 'Situação', render: (r) => <Situacao status={r.status} /> },
        { label: 'Valor', render: (r) => (r.total ? money(r.total) : '—'), align: 'right', hide: 'sm' },
    ];

    return (
        <AppLayout title="Ordens de Serviço" code="ATD020" toolbar={<Tool primary icon={<FilePlus2 />} label="Nova OS" fkey="F2" href={route('os.create')} />}>
            <Head title="Ordens de serviço" />
            <div className="grid gap-2 md:gap-3">
                <Block title="Filtros">
                    <form
                        className="grid items-end gap-2 sm:grid-cols-[220px_1fr_auto]"
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
                        <Field label="Pesquisa">
                            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Placa, nome do cliente, modelo ou nº da OS" />
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
