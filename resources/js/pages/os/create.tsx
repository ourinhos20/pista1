import { CarDiagramEditor } from '@/components/car-diagram';
import { Block, Field, Placa, ReadOnly, Tool, selectCls, textareaCls } from '@/components/erp';
import { usePlateLookup } from '@/components/plate-search';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { ENTRY_CHECKLIST, FUEL, documentFmt, km, phone } from '@/lib/os';
import { cn } from '@/lib/utils';
import type { Damage } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { CircleCheck, Save, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface Props {
    mechanics: { id: number; name: string }[];
    prefill: { placa?: string; client_id?: string };
}

type Form = {
    plate: string;
    client_id: number | null;
    client: { name: string; phone: string; document: string };
    vehicle: { brand: string; model: string; year: string; color: string; engine: string };
    km_in: string;
    fuel_level: number | null;
    scheduled_at: string;
    complaint: string;
    mechanic_id: string;
    damages: Damage[];
    checklist: Record<string, boolean>;
};

export default function NovaOs({ mechanics, prefill }: Props) {
    const form = useRef<HTMLFormElement>(null);
    const { data, setData, post, processing, errors, transform } = useForm<Form>({
        plate: prefill.placa ?? '',
        client_id: null,
        client: { name: '', phone: '', document: '' },
        vehicle: { brand: '', model: '', year: '', color: '', engine: '' },
        km_in: '',
        fuel_level: null,
        scheduled_at: '',
        complaint: '',
        mechanic_id: '',
        damages: [],
        checklist: {},
    });

    const { matches, exact } = usePlateLookup(data.plate);
    const found = exact ? matches.find((m) => m.id === exact) : undefined;
    const cleanPlate = data.plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const isNew = cleanPlate.length >= 7 && !found;
    const err = errors as Record<string, string>;

    useEffect(() => {
        setData('client_id', found?.client?.id ?? null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [found?.id]);

    const submit = () => {
        transform((d) => ({
            ...d,
            km_in: d.km_in ? Number(d.km_in.replace(/\D/g, '')) : null,
            mechanic_id: d.mechanic_id || null,
            scheduled_at: d.scheduled_at || null,
        }));
        post(route('os.store'));
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'F10') {
                e.preventDefault();
                form.current?.requestSubmit();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <AppLayout
            title="Pré-atendimento · Nova OS"
            code="ATD010"
            toolbar={
                <>
                    <Tool primary icon={<Save />} label="Gravar OS" fkey="F10" onClick={() => form.current?.requestSubmit()} disabled={processing || cleanPlate.length < 3} />
                    <Tool icon={<X />} label="Cancelar" href={route('dashboard')} />
                </>
            }
        >
            <Head title="Nova OS" />
            <form
                ref={form}
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
                className="grid gap-2 md:gap-3 xl:grid-cols-2"
            >
                <Block title="1 · Veículo e cliente" className="xl:col-span-2">
                    <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                        <Field label="Placa *" error={err.plate}>
                            <Input
                                autoFocus
                                value={data.plate}
                                onChange={(e) => setData('plate', e.target.value.toUpperCase())}
                                placeholder="ABC1D23"
                                maxLength={8}
                                autoComplete="off"
                                autoCapitalize="characters"
                                className="h-12 font-mono text-2xl font-bold tracking-[0.15em] uppercase md:h-10 md:text-xl"
                            />
                        </Field>

                        <div className="grid content-end">
                            {found ? (
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[3px] border border-green-300 bg-green-50 px-3 py-2 text-[13px] dark:border-green-800 dark:bg-green-950/40">
                                    <CircleCheck className="size-5 text-green-700" />
                                    <b>Veículo já cadastrado</b>
                                    <span>{found.title}</span>
                                    <span>Km: {km(found.km)}</span>
                                    <span>
                                        Cliente: <b>{found.client?.name}</b> {found.client?.phone ? `· ${phone(found.client.phone)}` : ''}
                                    </span>
                                </div>
                            ) : cleanPlate.length >= 3 && matches.length > 0 ? (
                                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                                    <span className="text-muted-foreground">Placas parecidas:</span>
                                    {matches.slice(0, 5).map((m) => (
                                        <button key={m.id} type="button" onClick={() => setData('plate', m.plate)}>
                                            <Placa value={m.plate} />
                                        </button>
                                    ))}
                                </div>
                            ) : isNew ? (
                                <p className="rounded-[3px] border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] dark:border-amber-800 dark:bg-amber-950/40">
                                    Placa nova. Preencha os dados do cliente e do veículo abaixo.
                                </p>
                            ) : (
                                <p className="text-muted-foreground text-[13px]">Digite a placa. Se o carro já veio antes, o sistema puxa cliente e histórico.</p>
                            )}
                        </div>
                    </div>

                    {found && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Field label="Cliente">
                                <ReadOnly>{found.client?.name}</ReadOnly>
                            </Field>
                            <Field label="CPF / CNPJ">
                                <ReadOnly>{documentFmt(found.client?.document)}</ReadOnly>
                            </Field>
                            <Field label="Veículo">
                                <ReadOnly>{found.title}</ReadOnly>
                            </Field>
                            <Field label="Cor">
                                <ReadOnly>{found.color}</ReadOnly>
                            </Field>
                        </div>
                    )}

                    {isNew && (
                        <div className="mt-3 grid gap-3 border-t border-dashed border-[#c9cdd3] pt-3 sm:grid-cols-2 lg:grid-cols-6">
                            <Field label="Nome do cliente *" className="lg:col-span-3" error={err['client.name']}>
                                <Input value={data.client.name} onChange={(e) => setData('client', { ...data.client, name: e.target.value })} />
                            </Field>
                            <Field label="WhatsApp" className="lg:col-span-1">
                                <Input inputMode="tel" value={data.client.phone} onChange={(e) => setData('client', { ...data.client, phone: e.target.value })} />
                            </Field>
                            <Field label="CPF / CNPJ" className="lg:col-span-2">
                                <Input inputMode="numeric" value={data.client.document} onChange={(e) => setData('client', { ...data.client, document: e.target.value })} />
                            </Field>
                            {(
                                [
                                    ['brand', 'Marca', 2],
                                    ['model', 'Modelo', 2],
                                    ['year', 'Ano', 1],
                                    ['color', 'Cor', 1],
                                ] as const
                            ).map(([k, label, span]) => (
                                <Field key={k} label={label} className={span === 2 ? 'lg:col-span-2' : ''}>
                                    <Input value={data.vehicle[k]} onChange={(e) => setData('vehicle', { ...data.vehicle, [k]: e.target.value })} />
                                </Field>
                            ))}
                        </div>
                    )}
                </Block>

                <Block title="2 · Agendamento e solicitação">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Data / hora agendada">
                            <Input type="datetime-local" value={data.scheduled_at} onChange={(e) => setData('scheduled_at', e.target.value)} />
                        </Field>
                        <Field label="Km atual" error={err.km_in}>
                            <Input inputMode="numeric" placeholder={found?.km ? String(found.km) : ''} value={data.km_in} onChange={(e) => setData('km_in', e.target.value.replace(/\D/g, ''))} className="tabular-nums" />
                        </Field>
                        <Field label="Mecânico">
                            <select className={selectCls} value={data.mechanic_id} onChange={(e) => setData('mechanic_id', e.target.value)}>
                                <option value="">Quem pegar na agenda</option>
                                {mechanics.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Defeitos / solicitação do cliente" className="sm:col-span-3">
                            <textarea
                                rows={6}
                                className={textareaCls}
                                placeholder="Ex.: barulho na roda dianteira ao frear; luz da injeção acesa; revisão dos 60 mil km; troca preventiva de correia…"
                                value={data.complaint}
                                onChange={(e) => setData('complaint', e.target.value)}
                            />
                        </Field>
                    </div>
                </Block>

                <Block title="3 · Vistoria de entrada (pode ser feita na chegada)">
                    <div className="grid gap-3">
                        <Field label="Combustível">
                            <div className="grid grid-cols-5 overflow-hidden rounded-[3px] border border-[#b9bec6]">
                                {FUEL.map((f, i) => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setData('fuel_level', data.fuel_level === i ? null : i)}
                                        className={cn('h-11 border-r border-[#d7dade] text-[13px] font-semibold last:border-r-0 md:h-8', data.fuel_level === i ? 'bg-zinc-900 text-white' : 'bg-card hover:bg-zinc-50')}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </Field>
                        <Field label="Itens no veículo">
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
                                {ENTRY_CHECKLIST.map((c) => (
                                    <label key={c.key} className="flex h-10 items-center gap-2 text-[14px] md:h-7 md:text-[13px]">
                                        <input type="checkbox" className="size-5 accent-[#d42a2a] md:size-4" checked={!!data.checklist[c.key]} onChange={(e) => setData('checklist', { ...data.checklist, [c.key]: e.target.checked })} />
                                        {c.label}
                                    </label>
                                ))}
                            </div>
                        </Field>
                    </div>
                </Block>

                <Block title="4 · Avarias na lataria" className="xl:col-span-2">
                    <div className="mx-auto max-w-3xl">
                        <CarDiagramEditor value={data.damages} onChange={(v) => setData('damages', v)} />
                    </div>
                </Block>

                <div className="no-print bg-background/95 sticky bottom-0 z-10 -mx-2 border-t border-[#c9cdd3] p-2 md:hidden xl:col-span-2">
                    <button type="submit" disabled={processing || cleanPlate.length < 3} className="h-12 w-full rounded-[4px] bg-[#d42a2a] font-semibold text-white disabled:opacity-50">
                        Gravar OS
                    </button>
                </div>
            </form>
        </AppLayout>
    );
}
