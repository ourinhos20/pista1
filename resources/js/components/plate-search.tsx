import { PlateBadge } from '@/components/oficina';
import { cn } from '@/lib/utils';
import type { ClientData, SharedData, VehicleData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Match = VehicleData & { client: ClientData | null };

export function usePlateLookup(term: string) {
    const [matches, setMatches] = useState<Match[]>([]);
    const [exact, setExact] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const clean = term.replace(/[^A-Za-z0-9]/g, '');
        if (clean.length < 3) {
            setMatches([]);
            setExact(null);
            return;
        }
        setLoading(true);
        const ctrl = new AbortController();
        const t = setTimeout(() => {
            fetch(route('veiculos.lookup', { placa: clean }), { headers: { Accept: 'application/json' }, signal: ctrl.signal })
                .then((r) => r.json())
                .then((d) => {
                    setMatches(d.matches ?? []);
                    setExact(d.exact ?? null);
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        }, 220);
        return () => {
            clearTimeout(t);
            ctrl.abort();
        };
    }, [term]);

    return { matches, exact, loading };
}

/** Busca por placa disponível em qualquer tela (cabeçalho). */
export function PlateSearch({ className }: { className?: string }) {
    const { auth } = usePage<SharedData>().props;
    const [term, setTerm] = useState('');
    const [open, setOpen] = useState(false);
    const { matches, exact, loading } = usePlateLookup(term);
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const go = (id: number) => {
        setOpen(false);
        setTerm('');
        router.visit(route('veiculos.show', id));
    };

    const clean = term.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    return (
        <div ref={box} className={cn('relative w-full max-w-sm', className)}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (exact) go(exact);
                    else if (matches.length === 1) go(matches[0].id);
                }}
            >
                <label className="bg-muted focus-within:ring-ring flex h-11 items-center gap-2 rounded-xl px-3 ring-0 focus-within:ring-2">
                    <Search className="text-muted-foreground size-4 shrink-0" />
                    <span className="sr-only">Buscar por placa</span>
                    <input
                        value={term}
                        onChange={(e) => {
                            setTerm(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        placeholder="Buscar placa…"
                        className="placeholder:text-muted-foreground w-full bg-transparent font-mono text-base font-semibold tracking-wider uppercase outline-none placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:normal-case"
                        autoCapitalize="characters"
                        autoComplete="off"
                        inputMode="text"
                        maxLength={8}
                    />
                </label>
            </form>

            {open && clean.length >= 3 && (
                <div className="bg-popover absolute top-12 right-0 left-0 z-50 overflow-hidden rounded-2xl p-1.5 shadow-xl ring-1 ring-black/10 dark:ring-white/10">
                    {loading && !matches.length && <p className="text-muted-foreground px-3 py-3 text-sm">Buscando…</p>}
                    {!loading && !matches.length && (
                        <div className="px-3 py-3 text-sm">
                            <p className="text-muted-foreground">Nenhum carro com a placa {clean}.</p>
                            {auth.can.sensitive && (
                                <button
                                    type="button"
                                    onClick={() => router.visit(route('os.create', { placa: clean }))}
                                    className="text-primary mt-2 inline-flex h-11 items-center gap-1 font-semibold"
                                >
                                    <Plus className="size-4" /> Abrir OS para {clean}
                                </button>
                            )}
                        </div>
                    )}
                    {matches.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => go(m.id)}
                            className="hover:bg-muted flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                        >
                            <PlateBadge value={m.plate} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold">{m.title || 'Veículo'}</span>
                                <span className="text-muted-foreground block truncate text-xs">{m.client?.name}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
