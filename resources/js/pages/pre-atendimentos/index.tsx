import { Block, Field, Grid, Placa, ReadOnly, Tool, selectCls, type Col } from '@/components/erp';
import { PhotoGallery } from '@/components/photo-gallery';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { date, phone, plate, relative, whatsapp } from '@/lib/os';
import { cn } from '@/lib/utils';
import type { Photo } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Ban, Camera, FilePlus2, MessageCircle, RotateCcw } from 'lucide-react';
import { useState } from 'react';

type Row = {
    id: number;
    name: string;
    phone: string;
    plate: string | null;
    vehicle: string | null;
    complaint: string;
    preferred_at: string | null;
    status: 'novo' | 'convertido' | 'descartado';
    service_order_id: number | null;
    handled_by: string | null;
    created_at: string;
    photos: Photo[];
};

const SIT: Record<Row['status'], { label: string; cls: string }> = {
    novo: { label: 'Novo', cls: 'bg-[#d42a2a] text-white ring-[#b51f1f]' },
    convertido: { label: 'Virou OS', cls: 'bg-green-50 text-green-800 ring-green-300' },
    descartado: { label: 'Descartado', cls: 'bg-zinc-100 text-zinc-600 ring-zinc-300' },
};

export default function PreAtendimentos({ rows, filters, counts }: { rows: Row[]; filters: { status: string }; counts: Record<string, number> }) {
    const [open, setOpen] = useState<Row | null>(null);

    const cols: Col<Row>[] = [
        { label: 'Recebido', render: (r) => <span title={date(r.created_at, true)}>{relative(r.created_at)}</span>, className: 'w-24' },
        { label: 'Cliente', render: (r) => <b>{r.name}</b> },
        { label: 'WhatsApp', render: (r) => phone(r.phone), className: 'w-36', hide: 'md' },
        { label: 'Placa', render: (r) => (r.plate ? <Placa value={r.plate} /> : '—'), className: 'w-24' },
        { label: 'Carro', render: (r) => r.vehicle ?? '—', hide: 'lg' },
        { label: 'O que relatou', render: (r) => <span className="line-clamp-1">{r.complaint}</span>, hide: 'md' },
        { label: 'Prefere', render: (r) => (r.preferred_at ? date(r.preferred_at, true) : '—'), className: 'w-36', hide: 'lg' },
        {
            label: 'Fotos',
            render: (r) => (r.photos.length ? <span className="inline-flex items-center gap-1"><Camera className="size-3.5" /> {r.photos.length}</span> : '—'),
            align: 'center',
            className: 'w-16',
        },
        { label: 'Situação', render: (r) => <span className={cn('rounded-[3px] px-1.5 py-0.5 text-[11px] font-bold uppercase ring-1 ring-inset', SIT[r.status].cls)}>{SIT[r.status].label}</span>, className: 'w-28' },
    ];

    const waText = (r: Row) => `Olá, ${r.name.split(' ')[0]}! Aqui é da Pista 1 Mecânica Automotiva. Recebemos seu pedido pelo site${r.vehicle ? ` sobre o ${r.vehicle}` : ''}. `;

    return (
        <AppLayout title="Pedidos do Site (Pré-atendimento)" code="ATD005">
            <Head title="Pedidos do site" />
            <div className="grid gap-2 md:gap-3">
                <Block title="Filtro">
                    <div className="flex flex-wrap items-end gap-3">
                        <Field label="Situação" className="w-56">
                            <select className={selectCls} value={filters.status} onChange={(e) => router.get(route('pre.index'), { status: e.target.value }, { preserveState: true, replace: true })}>
                                <option value="novo">Novos ({counts.novo ?? 0})</option>
                                <option value="convertido">Viraram OS ({counts.convertido ?? 0})</option>
                                <option value="descartado">Descartados ({counts.descartado ?? 0})</option>
                                <option value="todos">Todos</option>
                            </select>
                        </Field>
                        <p className="text-muted-foreground pb-1 text-[12px]">
                            O cliente pede pelo site em <b>/agendar</b> (link "Agendar online"). Confira, chame no WhatsApp se precisar e transforme em OS.
                        </p>
                    </div>
                </Block>
                <Block title="Pedidos" bodyClassName="p-0">
                    <Grid cols={cols} rows={rows} rowKey={(r) => r.id} onRowClick={setOpen} empty="Nenhum pedido nesta situação." footer={<span>{rows.length} pedido(s) · clique para ver</span>} />
                </Block>
            </div>

            <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
                <DialogContent className="max-h-[92svh] overflow-y-auto rounded-[4px] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Pedido de {open?.name}</DialogTitle>
                    </DialogHeader>
                    {open && (
                        <div className="grid gap-3">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <Field label="WhatsApp" className="col-span-2">
                                    <ReadOnly>{phone(open.phone)}</ReadOnly>
                                </Field>
                                <Field label="Placa">
                                    <ReadOnly>{open.plate ? plate(open.plate) : '—'}</ReadOnly>
                                </Field>
                                <Field label="Recebido">
                                    <ReadOnly>{date(open.created_at, true)}</ReadOnly>
                                </Field>
                                <Field label="Carro" className="col-span-2">
                                    <ReadOnly>{open.vehicle}</ReadOnly>
                                </Field>
                                <Field label="Horário preferido" className="col-span-2">
                                    <ReadOnly>{open.preferred_at ? date(open.preferred_at, true) : 'Não informou'}</ReadOnly>
                                </Field>
                            </div>
                            <Field label="O que está acontecendo">
                                <div className="rounded-[3px] border border-[#d7dade] bg-[#f7f8f9] px-3 py-2 text-[14px] whitespace-pre-line dark:bg-zinc-800">{open.complaint}</div>
                            </Field>
                            {open.photos.length > 0 && (
                                <Field label={`Fotos do cliente (${open.photos.length})`}>
                                    <PhotoGallery photos={open.photos} />
                                </Field>
                            )}
                            {open.handled_by && <p className="text-muted-foreground text-[12px]">Tratado por {open.handled_by}.</p>}

                            <div className="flex flex-wrap gap-2 border-t border-[#e3e5e8] pt-3">
                                {open.status === 'novo' && (
                                    <>
                                        <Tool primary icon={<FilePlus2 />} label="Abrir OS com estes dados" href={route('os.create', { pre: open.id })} />
                                        {whatsapp(open.phone, waText(open)) && (
                                            <Tool icon={<MessageCircle className="text-green-600" />} label="Chamar no WhatsApp" href={whatsapp(open.phone, waText(open))!} external />
                                        )}
                                        <Tool
                                            danger
                                            icon={<Ban />}
                                            label="Descartar"
                                            onClick={() => confirm('Descartar este pedido?') && router.post(route('pre.discard', open.id), {}, { preserveScroll: true, onSuccess: () => setOpen(null) })}
                                        />
                                    </>
                                )}
                                {open.status === 'convertido' && open.service_order_id && <Tool primary icon={<FilePlus2 />} label="Ver a OS" href={route('os.show', open.service_order_id)} />}
                                {open.status === 'descartado' && (
                                    <Tool icon={<RotateCcw />} label="Voltar para novos" onClick={() => router.post(route('pre.restore', open.id), {}, { preserveScroll: true, onSuccess: () => setOpen(null) })} />
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
