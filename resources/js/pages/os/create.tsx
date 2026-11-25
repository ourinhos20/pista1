import { Block, Field, Placa, Tool, selectCls, textareaCls } from '@/components/erp';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { documentFmt, phone } from '@/lib/os';
import { cn } from '@/lib/utils';
import { Head, useForm } from '@inertiajs/react';
import { Save, Search, UserCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Found = { id: number; name: string; phone: string | null; document: string | null; vehicles: { id: number; plate: string | null; title: string }[] };

interface Props {
    mechanics: { id: number; name: string }[];
    prefill: { placa?: string; client_id?: string };
    serviceTypes: Record<string, string>;
}

/** Busca o cliente já cadastrado por nome, CPF/CNPJ, telefone ou placa. */
function ClientSearch({ onPick }: { onPick: (c: Found) => void }) {
    const [q, setQ] = useState('');
    const [hits, setHits] = useState<Found[]>([]);
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (q.trim().length < 3) {
            setHits([]);
            return;
        }
        const ctrl = new AbortController();
        const t = setTimeout(() => {
            fetch(route('clientes.lookup', { q: q.trim() }), { headers: { Accept: 'application/json' }, signal: ctrl.signal })
                .then((r) => r.json())
                .then((d: Found[]) => {
                    setHits(d);
                    setOpen(true);
                })
                .catch(() => {});
        }, 250);
        return () => {
            clearTimeout(t);
            ctrl.abort();
        };
    }, [q]);

    useEffect(() => {
        const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    return (
        <div ref={box} className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => hits.length && setOpen(true)} placeholder="Digite nome, CPF, telefone ou placa…" className="pl-8" autoFocus />
            {open && q.trim().length >= 3 && (
                <ul className="bg-popover absolute top-full right-0 left-0 z-50 mt-1 max-h-80 overflow-auto rounded-[4px] border border-[#c9cdd3] py-1 shadow-xl">
                    {hits.length === 0 && <li className="px-3 py-2 text-[13px] text-zinc-500">Nenhum cliente encontrado. Preencha os dados abaixo: ele será cadastrado ao gravar a OS.</li>}
                    {hits.map((h) => (
                        <li key={h.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    onPick(h);
                                    setOpen(false);
                                    setQ('');
                                }}
                                className="flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] hover:bg-[#fdecec]"
                            >
                                <span className="min-w-0 flex-1">
                                    <b className="block truncate">{h.name}</b>
                                    <span className="block truncate text-[11px] text-zinc-500">{[phone(h.phone), documentFmt(h.document)].filter(Boolean).join(' · ') || 'sem contato'}</span>
                                </span>
                                <span className="flex shrink-0 gap-1">
                                    {h.vehicles.slice(0, 2).map((v) => (v.plate ? <Placa key={v.id} value={v.plate} /> : <span key={v.id} className="text-[11px] text-zinc-500">{v.title}</span>))}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function NovaOs({ mechanics, prefill, serviceTypes }: Props) {
    const form = useRef<HTMLFormElement>(null);
    const [client, setClient] = useState<Found | null>(null);
    const { data, setData, post, processing, errors, transform } = useForm({
        client_id: null as number | null,
        vehicle_id: null as number | null,
        name: '',
        phone: '',
        plate: prefill.placa ?? '',
        vehicle_model: '',
        vehicle_year: '',
        service_type: 'defeito',
        complaint: '',
        scheduled_at: '',
        mechanic_id: '',
        arrived: false as boolean,
    });
    const err = errors as Record<string, string>;
    const newVehicle = !data.vehicle_id;

    const pick = (c: Found) => {
        setClient(c);
        // se o cliente tem um carro só, já escolhe
        setData((d) => ({ ...d, client_id: c.id, vehicle_id: c.vehicles.length === 1 ? c.vehicles[0].id : null, name: '', phone: '' }));
    };
    const clearClient = () => {
        setClient(null);
        setData((d) => ({ ...d, client_id: null, vehicle_id: null }));
    };

    const submit = () => {
        transform((d) => ({ ...d, mechanic_id: d.mechanic_id || null, scheduled_at: d.scheduled_at || null, plate: d.vehicle_id ? null : d.plate || null }));
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

    const chosenVehicle = client?.vehicles.find((v) => v.id === data.vehicle_id);

    return (
        <AppLayout
            title="Nova OS · Atendimento"
            code="ATD010"
            toolbar={
                <>
                    <Tool primary icon={<Save />} label="Gravar OS" fkey="F10" onClick={() => form.current?.requestSubmit()} disabled={processing} />
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
                className="mx-auto grid max-w-4xl gap-2 md:gap-3"
            >
                <p className="rounded-[3px] border border-[#d7dade] bg-white px-3 py-2 text-[13px] text-zinc-600 dark:bg-zinc-900">
                    Só o básico: quem é, qual carro e o que precisa. <b>CPF e endereço</b> são completados quando o cliente chegar. <b>Km, combustível e avarias</b> o mecânico registra na vistoria.
                </p>

                <Block title="1 · Cliente">
                    {client ? (
                        <div className="flex flex-wrap items-center gap-3 rounded-[3px] border border-green-300 bg-green-50 px-3 py-2 text-[13px] dark:border-green-800 dark:bg-green-950/40">
                            <UserCheck className="size-5 text-green-700" />
                            <span className="min-w-0 flex-1">
                                <b>{client.name}</b> <span className="text-zinc-600">· cliente já cadastrado · {phone(client.phone) || 'sem telefone'}</span>
                            </span>
                            <button type="button" onClick={clearClient} className="text-[12px] font-semibold text-[#b51f1f] hover:underline">
                                trocar
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            <Field label="Cliente já veio antes? Procure aqui">
                                <ClientSearch onPick={pick} />
                            </Field>
                            <div className="grid gap-3 border-t border-dashed border-[#c9cdd3] pt-3 sm:grid-cols-[2fr_1fr]">
                                <Field label="Nome do cliente *" error={err.name}>
                                    <Input value={data.name} onChange={(e) => setData('name', e.target.value)} />
                                </Field>
                                <Field label="WhatsApp (com DDD) *" error={err.phone}>
                                    <Input value={data.phone} onChange={(e) => setData('phone', e.target.value)} inputMode="tel" placeholder="(11) 90000-0000" />
                                </Field>
                            </div>
                        </div>
                    )}
                </Block>

                <Block title="2 · Carro">
                    {client && client.vehicles.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                            {client.vehicles.map((v) => (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => setData('vehicle_id', v.id)}
                                    className={cn(
                                        'inline-flex h-11 items-center gap-2 rounded-[3px] border px-3 text-[13px] font-semibold md:h-9',
                                        data.vehicle_id === v.id ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-[#c9cdd3] bg-white dark:bg-zinc-900',
                                    )}
                                >
                                    {v.plate && <span className="font-mono">{v.plate}</span>}
                                    {v.title}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setData('vehicle_id', null)}
                                className={cn('inline-flex h-11 items-center rounded-[3px] border px-3 text-[13px] font-semibold md:h-9', newVehicle ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-[#c9cdd3] bg-white dark:bg-zinc-900')}
                            >
                                + Outro carro
                            </button>
                        </div>
                    )}
                    {chosenVehicle ? (
                        <p className="text-[13px] text-zinc-600">
                            Carro escolhido: <b>{chosenVehicle.title}</b> {chosenVehicle.plate ? `· ${chosenVehicle.plate}` : '· sem placa (informe na chegada)'}
                        </p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                            <Field label="Carro (marca e modelo)" error={err.vehicle_model}>
                                <Input value={data.vehicle_model} onChange={(e) => setData('vehicle_model', e.target.value)} placeholder="Ex.: Fiat Strada" />
                            </Field>
                            <Field label="Ano" error={err.vehicle_year}>
                                <Input value={data.vehicle_year} onChange={(e) => setData('vehicle_year', e.target.value)} inputMode="numeric" placeholder="2021" />
                            </Field>
                            <Field label={data.arrived ? 'Placa *' : 'Placa (se souber)'} error={err.plate}>
                                <Input value={data.plate} onChange={(e) => setData('plate', e.target.value.toUpperCase())} maxLength={8} className="font-mono font-bold tracking-widest uppercase" placeholder="ABC1D23" />
                            </Field>
                        </div>
                    )}
                </Block>

                <Block title="3 · O que o cliente precisa">
                    <div className="grid gap-3">
                        <Field label="Tipo">
                            <div className="grid grid-cols-2 overflow-hidden rounded-[3px] border border-[#b9bec6] sm:grid-cols-4">
                                {Object.entries(serviceTypes).map(([k, v]) => (
                                    <button
                                        key={k}
                                        type="button"
                                        onClick={() => setData('service_type', k)}
                                        className={cn('h-11 border-r border-b border-[#d7dade] text-[13px] font-semibold sm:border-b-0 md:h-9', data.service_type === k ? 'bg-zinc-900 text-white' : 'bg-card')}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </Field>
                        <Field label="Defeito / solicitação / preventiva *" error={err.complaint}>
                            <textarea
                                rows={4}
                                className={textareaCls}
                                value={data.complaint}
                                onChange={(e) => setData('complaint', e.target.value)}
                                placeholder="Ex.: barulho na roda dianteira ao frear; revisão dos 60 mil km; troca preventiva da correia…"
                            />
                        </Field>
                        <div className="grid items-end gap-3 sm:grid-cols-3">
                            <Field label="Agendado para">
                                <Input type="datetime-local" value={data.scheduled_at} onChange={(e) => setData('scheduled_at', e.target.value)} disabled={data.arrived} />
                            </Field>
                            <Field label="Mecânico (opcional)">
                                <select className={selectCls} value={data.mechanic_id} onChange={(e) => setData('mechanic_id', e.target.value)}>
                                    <option value="">Quem estiver livre</option>
                                    {mechanics.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <label className="flex h-11 items-center gap-2 rounded-[3px] border border-[#c9cdd3] bg-white px-3 text-[13px] font-semibold md:h-8 dark:bg-zinc-900">
                                <input type="checkbox" className="size-4 accent-[#d42a2a]" checked={data.arrived} onChange={(e) => setData('arrived', e.target.checked)} />
                                Cliente já está na oficina
                            </label>
                        </div>
                        {data.arrived && <p className="text-[12px] text-cyan-800">O carro entra direto na fila do mecânico (check-in feito agora). Informe a placa.</p>}
                    </div>
                </Block>

                <div className="no-print bg-background/95 sticky bottom-0 z-10 -mx-2 border-t border-[#c9cdd3] p-2 md:hidden">
                    <button type="submit" disabled={processing} className="h-12 w-full rounded-[4px] bg-[#d42a2a] font-semibold text-white disabled:opacity-50">
                        Gravar OS
                    </button>
                </div>
            </form>
        </AppLayout>
    );
}
