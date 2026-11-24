import { CarDiagramEditor } from '@/components/car-diagram';
import InputError from '@/components/input-error';
import { Page, PageHeader, Panel, PlateBadge } from '@/components/oficina';
import { usePlateLookup } from '@/components/plate-search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { ENTRY_CHECKLIST, FUEL, km, phone } from '@/lib/os';
import { cn } from '@/lib/utils';
import type { Damage } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Check, CircleCheck, LoaderCircle } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

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

const field = 'h-12 rounded-xl text-base';

export default function NovaOs({ mechanics, prefill }: Props) {
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

    useEffect(() => {
        setData('client_id', found?.client?.id ?? null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [found?.id]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        transform((d) => ({
            ...d,
            km_in: d.km_in ? Number(d.km_in.replace(/\D/g, '')) : null,
            mechanic_id: d.mechanic_id || null,
            scheduled_at: d.scheduled_at || null,
        }));
        post(route('os.store'));
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Ordens de serviço', href: '/os' },
                { title: 'Nova OS', href: '/os/nova' },
            ]}
        >
            <Head title="Nova OS" />
            <form onSubmit={submit}>
                <Page className="max-w-4xl">
                    <PageHeader title="Nova OS" subtitle="Comece pela placa. Se o carro já veio antes, o sistema puxa tudo sozinho." />

                    {/* 1. Veículo */}
                    <Panel title="1. Veículo e cliente">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="plate" className="text-[15px]">
                                    Placa
                                </Label>
                                <Input
                                    id="plate"
                                    autoFocus
                                    value={data.plate}
                                    onChange={(e) => setData('plate', e.target.value.toUpperCase())}
                                    placeholder="ABC1D23"
                                    maxLength={8}
                                    autoComplete="off"
                                    autoCapitalize="characters"
                                    className="h-16 rounded-2xl font-mono text-3xl font-bold tracking-[0.2em] uppercase placeholder:tracking-[0.2em]"
                                />
                                <InputError message={errors.plate} />
                            </div>

                            {found && (
                                <div className="flex items-center gap-4 rounded-2xl bg-green-50 p-4 ring-1 ring-green-200 dark:bg-green-950/40 dark:ring-green-900">
                                    <CircleCheck className="size-7 shrink-0 text-green-600" />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold">
                                            {found.title || 'Veículo'} <span className="text-muted-foreground font-normal">· {km(found.km)}</span>
                                        </p>
                                        <p className="text-muted-foreground text-[15px]">
                                            {found.client?.name}
                                            {found.client?.phone ? ` · ${phone(found.client.phone)}` : ''}
                                        </p>
                                    </div>
                                    <PlateBadge value={found.plate} />
                                </div>
                            )}

                            {!found && cleanPlate.length >= 3 && matches.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-muted-foreground self-center text-sm">Você quis dizer:</span>
                                    {matches.slice(0, 4).map((m) => (
                                        <button key={m.id} type="button" onClick={() => setData('plate', m.plate)} className="hover:bg-muted rounded-lg p-1">
                                            <PlateBadge value={m.plate} />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {isNew && (
                                <div className="grid gap-4 border-t pt-4">
                                    <p className="text-muted-foreground text-sm">Carro novo na oficina. Cadastre o cliente e o veículo:</p>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="grid gap-2 md:col-span-3">
                                            <Label htmlFor="cname">Nome do cliente</Label>
                                            <Input id="cname" className={field} value={data.client.name} onChange={(e) => setData('client', { ...data.client, name: e.target.value })} />
                                            <InputError message={errors['client.name' as keyof Form]} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="cphone">WhatsApp</Label>
                                            <Input id="cphone" inputMode="tel" placeholder="(11) 90000-0000" className={field} value={data.client.phone} onChange={(e) => setData('client', { ...data.client, phone: e.target.value })} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="cdoc">CPF / CNPJ</Label>
                                            <Input id="cdoc" inputMode="numeric" className={field} value={data.client.document} onChange={(e) => setData('client', { ...data.client, document: e.target.value })} />
                                        </div>
                                        <div />
                                        {(
                                            [
                                                ['brand', 'Marca', 'Volkswagen'],
                                                ['model', 'Modelo', 'Gol 1.6'],
                                                ['year', 'Ano', '2019'],
                                                ['color', 'Cor', 'Prata'],
                                                ['engine', 'Motor', '1.6 8v'],
                                            ] as const
                                        ).map(([k, label, ph]) => (
                                            <div key={k} className="grid gap-2">
                                                <Label htmlFor={k}>{label}</Label>
                                                <Input id={k} placeholder={ph} className={field} value={data.vehicle[k]} onChange={(e) => setData('vehicle', { ...data.vehicle, [k]: e.target.value })} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Panel>

                    {/* 2. Entrada */}
                    <Panel title="2. Entrada">
                        <div className="grid gap-5">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="km">Km atual</Label>
                                    <Input
                                        id="km"
                                        inputMode="numeric"
                                        placeholder={found?.km ? String(found.km) : '0'}
                                        className={cn(field, 'tabular text-xl font-semibold')}
                                        value={data.km_in}
                                        onChange={(e) => setData('km_in', e.target.value.replace(/\D/g, ''))}
                                    />
                                    <InputError message={errors.km_in} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="sched">Agendado para (opcional)</Label>
                                    <Input id="sched" type="datetime-local" className={field} value={data.scheduled_at} onChange={(e) => setData('scheduled_at', e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="mech">Mecânico</Label>
                                    <select
                                        id="mech"
                                        className={cn(field, 'border-input bg-card border px-3')}
                                        value={data.mechanic_id}
                                        onChange={(e) => setData('mechanic_id', e.target.value)}
                                    >
                                        <option value="">Definir depois</option>
                                        {mechanics.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Combustível</Label>
                                <div className="grid grid-cols-5 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                                    {FUEL.map((f, i) => (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => setData('fuel_level', data.fuel_level === i ? null : i)}
                                            className={cn(
                                                'h-11 rounded-lg text-sm font-semibold transition',
                                                data.fuel_level === i ? 'bg-card shadow ring-1 ring-black/5' : 'text-muted-foreground',
                                            )}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="complaint">O que o cliente relatou?</Label>
                                <textarea
                                    id="complaint"
                                    rows={4}
                                    className="border-input bg-card focus-visible:ring-ring rounded-xl border px-3 py-3 text-base outline-none focus-visible:ring-2"
                                    placeholder="Ex.: barulho na roda dianteira ao frear; luz da injeção acesa; revisão dos 60 mil km…"
                                    value={data.complaint}
                                    onChange={(e) => setData('complaint', e.target.value)}
                                />
                            </div>
                        </div>
                    </Panel>

                    {/* 3. Checklist */}
                    <Panel title="3. Itens no veículo">
                        <div className="flex flex-wrap gap-2">
                            {ENTRY_CHECKLIST.map((c) => {
                                const on = !!data.checklist[c.key];
                                return (
                                    <button
                                        key={c.key}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => setData('checklist', { ...data.checklist, [c.key]: !on })}
                                        className={cn(
                                            'inline-flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-medium ring-1 transition',
                                            on ? 'bg-foreground text-background ring-foreground' : 'bg-card ring-border hover:bg-muted',
                                        )}
                                    >
                                        {on && <Check className="size-4" />}
                                        {c.label}
                                    </button>
                                );
                            })}
                        </div>
                    </Panel>

                    {/* 4. Avarias */}
                    <Panel title="4. Avarias na lataria">
                        <CarDiagramEditor value={data.damages} onChange={(v) => setData('damages', v)} />
                    </Panel>

                    {/* Ação principal no rodapé */}
                    <div className="bg-background/90 sticky bottom-16 z-20 -mx-4 border-t px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:rounded-2xl md:border md:px-4">
                        <Button type="submit" size="lg" className="w-full" disabled={processing || cleanPlate.length < 3}>
                            {processing && <LoaderCircle className="size-5 animate-spin" />}
                            Abrir OS
                        </Button>
                    </div>
                </Page>
            </form>
        </AppLayout>
    );
}
