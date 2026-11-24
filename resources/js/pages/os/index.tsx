import { Empty, OsRow, Page, PageHeader, Panel } from '@/components/oficina';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { STATUS } from '@/lib/os';
import { cn } from '@/lib/utils';
import type { OsCard, OsStatus } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';

const TABS: { value: string; label: string }[] = [
    { value: 'abertas', label: 'Em aberto' },
    ...(['aguardando', 'diagnostico', 'aprovacao', 'execucao', 'pronto', 'entregue'] as OsStatus[]).map((s) => ({ value: s, label: STATUS[s].label })),
    { value: 'todas', label: 'Todas' },
];

export default function OsIndex({ orders, filters }: { orders: OsCard[]; filters: { status: string; q: string } }) {
    const [q, setQ] = useState(filters.q);
    const go = (params: Partial<typeof filters>) => router.get(route('os.index'), { ...filters, ...params }, { preserveState: true, replace: true });

    return (
        <AppLayout breadcrumbs={[{ title: 'Ordens de serviço', href: '/os' }]}>
            <Head title="Ordens de serviço" />
            <Page>
                <PageHeader
                    title="Ordens de serviço"
                    actions={
                        <Button asChild size="lg">
                            <Link href={route('os.create')}>
                                <Plus className="size-5" /> Nova OS
                            </Link>
                        </Button>
                    }
                />

                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
                    {TABS.map((t) => (
                        <button
                            key={t.value}
                            onClick={() => go({ status: t.value })}
                            className={cn(
                                'h-10 shrink-0 rounded-full px-4 text-sm font-semibold ring-1 transition',
                                filters.status === t.value ? 'bg-foreground text-background ring-foreground' : 'bg-card ring-border hover:bg-muted',
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        go({ q });
                    }}
                    className="relative"
                >
                    <Search className="text-muted-foreground absolute top-1/2 left-4 size-5 -translate-y-1/2" />
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Placa, nome do cliente ou número da OS" className="h-12 rounded-xl pl-12 text-base" />
                </form>

                <Panel>
                    {orders.length ? (
                        <div className="divide-y">
                            {orders.map((os) => (
                                <OsRow key={os.id} os={os} showMoney />
                            ))}
                        </div>
                    ) : (
                        <Empty title="Nenhuma OS encontrada" text="Tente outro filtro ou busca." />
                    )}
                </Panel>
            </Page>
        </AppLayout>
    );
}
