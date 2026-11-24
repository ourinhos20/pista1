import { Input } from '@/components/ui/input';
import { money } from '@/lib/os';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

export type PartHit = {
    id: number;
    code: string | null;
    description: string;
    brand: string | null;
    unit: string;
    sale_price?: number;
    cost_price?: number;
    stock: number;
    low: boolean;
    supplier: string | null;
};

/**
 * Campo de descrição com busca no catálogo de peças.
 * Digitar livremente continua valendo (peça fora do catálogo).
 */
export function PartPicker({
    value,
    onChange,
    onPick,
    placeholder,
    showPrice = true,
    className,
}: {
    value: string;
    onChange: (v: string) => void;
    onPick: (p: PartHit) => void;
    placeholder?: string;
    showPrice?: boolean;
    className?: string;
}) {
    const [hits, setHits] = useState<PartHit[]>([]);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const box = useRef<HTMLDivElement>(null);
    const picked = useRef(false);

    useEffect(() => {
        if (picked.current) {
            picked.current = false;
            return;
        }
        if (value.trim().length < 2) {
            setHits([]);
            return;
        }
        const ctrl = new AbortController();
        const t = setTimeout(() => {
            fetch(route('pecas.search', { q: value.trim() }), { headers: { Accept: 'application/json' }, signal: ctrl.signal })
                .then((r) => r.json())
                .then((d: PartHit[]) => {
                    setHits(d);
                    setActive(0);
                    setOpen(true);
                })
                .catch(() => {});
        }, 200);
        return () => {
            clearTimeout(t);
            ctrl.abort();
        };
    }, [value]);

    useEffect(() => {
        const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const pick = (p: PartHit) => {
        picked.current = true;
        onPick(p);
        setOpen(false);
    };

    return (
        <div ref={box} className={cn('relative', className)}>
            <Input
                value={value}
                placeholder={placeholder}
                autoComplete="off"
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => hits.length && setOpen(true)}
                onKeyDown={(e) => {
                    if (!open || !hits.length) return;
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setActive((a) => Math.min(hits.length - 1, a + 1));
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActive((a) => Math.max(0, a - 1));
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        pick(hits[active]);
                    } else if (e.key === 'Escape') setOpen(false);
                }}
            />
            {open && hits.length > 0 && (
                <ul className="bg-popover absolute top-full right-0 left-0 z-50 mt-1 max-h-72 overflow-auto rounded-[4px] border border-[#c9cdd3] py-1 shadow-xl">
                    {hits.map((h, i) => (
                        <li key={h.id}>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pick(h)}
                                className={cn('flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13px]', i === active ? 'bg-[#fdecec]' : 'hover:bg-zinc-50')}
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-semibold">{h.description}</span>
                                    <span className="text-muted-foreground block truncate text-[11px]">
                                        {[h.code, h.brand, h.supplier].filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                                <span className={cn('shrink-0 text-[11px] font-semibold tabular-nums', h.stock <= 0 ? 'text-zinc-400' : h.low ? 'text-amber-700' : 'text-green-700')}>
                                    {h.stock} {h.unit}
                                </span>
                                {showPrice && h.sale_price !== undefined && <span className="w-20 shrink-0 text-right font-semibold tabular-nums">{money(h.sale_price)}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
