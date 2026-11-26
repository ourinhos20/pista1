import { Field, selectCls } from '@/components/erp';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Marca e modelo pelo catálogo FIPE: escolhe a marca e aparecem só os modelos dela,
 * já com versão e motor (ex.: "Tucson 2.0 16V Flex Aut." x "Tucson GLS 2.7 V6").
 * Se o carro não estiver no catálogo, dá para digitar livre.
 */
type Brand = { name: string; popular: boolean };

let brandsReq: Promise<Brand[]> | null = null;
const modelsReq = new Map<string, Promise<string[]>>();

const getJson = <T,>(url: string, fallback: T): Promise<T> =>
    fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : fallback))
        .catch(() => fallback);

const loadBrands = () => (brandsReq ??= getJson<Brand[]>(route('catalogo.marcas'), []));
const loadModels = (brand: string) => {
    if (!modelsReq.has(brand)) modelsReq.set(brand, getJson<string[]>(route('catalogo.modelos', { marca: brand }), []));
    return modelsReq.get(brand)!;
};

/** "Tucson 2.0" acha "TUCSON GLS 2.0 16V": todas as palavras, sem acento e sem maiúscula. */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function VehiclePicker({
    brand,
    model,
    onBrand,
    onModel,
    errors = {},
    brandClassName,
    modelClassName,
}: {
    brand: string;
    model: string;
    onBrand: (v: string) => void;
    onModel: (v: string) => void;
    errors?: { brand?: string; model?: string };
    brandClassName?: string;
    modelClassName?: string;
}) {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [models, setModels] = useState<string[]>([]);
    const [other, setOther] = useState(false);
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    // a lista abre por cima da tela (os blocos cortam o que passa da borda)
    const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
    useEffect(() => {
        // dentro de uma janela (ex.: "Cliente chegou") a lista fica no lugar normal
        if (!open || box.current?.closest('[role="dialog"]')) return setPos(null);
        const place = () => {
            const r = box.current?.getBoundingClientRect();
            if (r) setPos({ left: r.left, top: r.bottom + 4, width: r.width });
        };
        place();
        window.addEventListener('scroll', place, true);
        window.addEventListener('resize', place);
        return () => {
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, [open]);

    useEffect(() => {
        loadBrands().then(setBrands);
    }, []);
    const known = brands.some((b) => b.name === brand);
    // marca que não está no catálogo (cadastro antigo ou digitada): campo livre
    const free = other || (!!brand && brands.length > 0 && !known);

    useEffect(() => {
        if (known) loadModels(brand).then(setModels);
        else setModels([]);
    }, [brand, known]);

    const hits = useMemo(() => {
        const words = norm(model).split(/\s+/).filter(Boolean);
        const list = words.length ? models.filter((m) => words.every((w) => norm(m).includes(w))) : models;
        return list.slice(0, 80);
    }, [model, models]);

    useEffect(() => {
        const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const popular = brands.filter((b) => b.popular);
    const rest = brands.filter((b) => !b.popular);

    return (
        <>
            <Field label="Marca" error={errors.brand} className={brandClassName}>
                {free ? (
                    <div className="flex gap-1.5">
                        <Input value={brand} onChange={(e) => onBrand(e.target.value)} autoFocus={other} />
                        {brands.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setOther(false);
                                    onBrand('');
                                }}
                                className="shrink-0 px-1 text-[12px] font-semibold text-[#b51f1f] hover:underline"
                            >
                                lista
                            </button>
                        )}
                    </div>
                ) : (
                    <select
                        className={selectCls}
                        value={brand}
                        onChange={(e) => {
                            if (e.target.value === '__outra') {
                                setOther(true);
                                onBrand('');
                                return;
                            }
                            onBrand(e.target.value);
                            onModel('');
                        }}
                    >
                        <option value="">Escolha…</option>
                        {popular.length > 0 && (
                            <optgroup label="Mais comuns">
                                {popular.map((b) => (
                                    <option key={b.name} value={b.name}>
                                        {b.name}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        <optgroup label="Todas">
                            {rest.map((b) => (
                                <option key={b.name} value={b.name}>
                                    {b.name}
                                </option>
                            ))}
                        </optgroup>
                        <option value="__outra">Outra marca…</option>
                    </select>
                )}
            </Field>
            <Field label="Modelo" error={errors.model} className={modelClassName}>
                <div ref={box} className="relative">
                    <Input
                        value={model}
                        onChange={(e) => {
                            onModel(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
                        placeholder={known ? 'Digite para filtrar' : undefined}
                        autoComplete="off"
                    />
                    {open && known && hits.length > 0 && !(hits.length === 1 && hits[0] === model) && (
                        <ul
                            style={pos ? { position: 'fixed', left: pos.left, top: pos.top, width: pos.width } : undefined}
                            className="bg-popover absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-[4px] border border-[#c9cdd3] py-1 shadow-lg"
                        >
                            {hits.map((m) => (
                                <li key={m}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onModel(m);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            'block w-full px-3 py-2 text-left text-[14px] hover:bg-zinc-100 md:py-1.5 md:text-[13px] dark:hover:bg-zinc-800',
                                            m === model && 'font-semibold',
                                        )}
                                    >
                                        {m}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Field>
        </>
    );
}
