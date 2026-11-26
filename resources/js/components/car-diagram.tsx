import { DAMAGE } from '@/lib/os';
import { cn } from '@/lib/utils';
import type { Damage, DamageType } from '@/types';
import { Undo2 } from 'lucide-react';
import { useRef, useState } from 'react';

const W = 440;
const H = 250;

/** Desenho do carro visto de cima, frente para a esquerda. */
function CarShape() {
    return (
        <g transform="translate(25 25)" fill="none" stroke="currentColor" strokeLinejoin="round" strokeLinecap="round">
            {/* rodas */}
            <g fill="currentColor" stroke="none" opacity="0.85">
                <rect x="58" y="-6" width="46" height="14" rx="5" />
                <rect x="58" y="192" width="46" height="14" rx="5" />
                <rect x="290" y="-6" width="46" height="14" rx="5" />
                <rect x="290" y="192" width="46" height="14" rx="5" />
            </g>
            {/* carroceria */}
            <path
                d="M 22 52 Q 24 8 78 4 L 318 4 Q 372 8 376 52 L 376 148 Q 372 192 318 196 L 78 196 Q 24 192 22 148 Z"
                fill="var(--card, #fff)"
                strokeWidth="2.5"
            />
            {/* para-choques */}
            <path d="M 14 46 Q 10 100 14 154" strokeWidth="5" />
            <path d="M 384 46 Q 388 100 384 154" strokeWidth="5" />
            {/* faróis e lanternas */}
            <path d="M 28 26 Q 36 14 54 12" strokeWidth="4" stroke="#f59e0b" />
            <path d="M 28 174 Q 36 186 54 188" strokeWidth="4" stroke="#f59e0b" />
            <path d="M 372 30 Q 366 16 350 12" strokeWidth="4" stroke="#ee3c3a" />
            <path d="M 372 170 Q 366 184 350 188" strokeWidth="4" stroke="#ee3c3a" />
            {/* capô */}
            <path d="M 40 60 Q 70 100 40 140" strokeWidth="1.2" opacity="0.5" />
            {/* para-brisa */}
            <path d="M 118 30 L 152 46 L 152 154 L 118 170 Q 104 100 118 30 Z" strokeWidth="2" fill="currentColor" fillOpacity="0.08" />
            {/* teto */}
            <rect x="152" y="46" width="118" height="108" rx="10" strokeWidth="1.5" />
            {/* vidro traseiro */}
            <path d="M 270 46 L 300 34 Q 312 100 300 166 L 270 154 Z" strokeWidth="2" fill="currentColor" fillOpacity="0.08" />
            {/* tampa traseira */}
            <path d="M 342 56 Q 334 100 342 144" strokeWidth="1.2" opacity="0.5" />
            {/* portas */}
            <path d="M 112 4 L 112 30 M 112 170 L 112 196" strokeWidth="1.5" />
            <path d="M 204 4 L 204 46 M 204 154 L 204 196" strokeWidth="1.5" />
            <path d="M 290 4 L 290 38 M 290 162 L 290 196" strokeWidth="1.5" />
            {/* retrovisores */}
            <path d="M 124 4 L 116 -10 L 134 -10 Z" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
            <path d="M 124 196 L 116 210 L 134 210 Z" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
        </g>
    );
}

function Labels() {
    return (
        <g fill="currentColor" fontSize="10" fontWeight="600" letterSpacing="1.5" opacity="0.55" textAnchor="middle">
            <text x="8" y={H / 2} transform={`rotate(-90 8 ${H / 2})`}>
                FRENTE
            </text>
            <text x={W - 14} y={H / 2} transform={`rotate(90 ${W - 14} ${H / 2})`}>
                TRASEIRA
            </text>
            <text x={W / 2} y="11">
                LADO DIREITO (PASSAGEIRO)
            </text>
            <text x={W / 2} y={H - 3}>
                LADO ESQUERDO (MOTORISTA)
            </text>
        </g>
    );
}

export function CarDiagramSvg({
    damages,
    className,
    onAdd,
    onRemove,
}: {
    damages: Damage[];
    className?: string;
    onAdd?: (x: number, y: number) => void;
    onRemove?: (index: number) => void;
}) {
    const ref = useRef<SVGSVGElement>(null);

    const click = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!onAdd || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        onAdd(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
    };

    return (
        <svg
            ref={ref}
            viewBox={`0 0 ${W} ${H}`}
            className={cn('w-full select-none', onAdd && 'cursor-crosshair touch-manipulation', className)}
            onClick={click}
            role="img"
            aria-label="Diagrama do veículo para marcar avarias"
        >
            <Labels />
            <CarShape />
            {damages.map((d, i) => {
                const cx = (d.x / 100) * W;
                const cy = (d.y / 100) * H;
                const meta = DAMAGE[d.type];
                return (
                    <g
                        key={i}
                        onClick={(e) => {
                            if (!onRemove) return;
                            e.stopPropagation();
                            onRemove(i);
                        }}
                        className={onRemove ? 'cursor-pointer' : undefined}
                    >
                        <circle cx={cx} cy={cy} r="11" fill={meta.color} stroke="#fff" strokeWidth="2" />
                        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">
                            {meta.letter}
                            {i + 1}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

/** Editor de avarias: escolhe o tipo e toca no desenho. */
export function CarDiagramEditor({ value, onChange }: { value: Damage[]; onChange: (v: Damage[]) => void }) {
    const [type, setType] = useState<DamageType>('risco');

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de avaria">
                {(Object.keys(DAMAGE) as DamageType[]).map((t) => (
                    <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={type === t}
                        onClick={() => setType(t)}
                        className={cn(
                            'inline-flex h-11 items-center gap-2 rounded-[3px] px-3 text-[13px] font-semibold ring-1 transition md:h-8',
                            type === t ? 'bg-foreground text-background ring-foreground' : 'bg-card ring-border hover:bg-muted',
                        )}
                    >
                        <span
                            className="grid size-5 place-items-center rounded-full text-[11px] font-black text-white"
                            style={{ background: DAMAGE[t].color }}
                        >
                            {DAMAGE[t].letter}
                        </span>
                        {DAMAGE[t].label}
                    </button>
                ))}
            </div>

            <div className="rounded-[4px] border border-[#d7dade] bg-white p-2 text-zinc-900">
                <CarDiagramSvg
                    damages={value}
                    onAdd={(x, y) => onChange([...value, { x, y, type }])}
                    onRemove={(i) => onChange(value.filter((_, idx) => idx !== i))}
                />
            </div>

            <div className="text-muted-foreground flex items-center justify-between gap-2 text-sm">
                <span>Toque no desenho para marcar. Toque numa marca para apagar.</span>
                {value.length > 0 && (
                    <button
                        type="button"
                        className="text-foreground inline-flex h-11 items-center gap-1 px-2 font-semibold"
                        onClick={() => onChange(value.slice(0, -1))}
                    >
                        <Undo2 className="size-4" /> Desfazer
                    </button>
                )}
            </div>

            {value.length > 0 && (
                <ol className="grid gap-2 sm:grid-cols-2">
                    {value.map((d, i) => (
                        <li key={i} className="bg-card flex items-center gap-2 rounded-[3px] border border-[#d7dade] px-2.5 py-1.5">
                            <span
                                className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-black text-white"
                                style={{ background: DAMAGE[d.type].color }}
                            >
                                {DAMAGE[d.type].letter}
                                {i + 1}
                            </span>
                            <input
                                className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                                placeholder={`${DAMAGE[d.type].label} — onde?`}
                                value={d.note ?? ''}
                                maxLength={120}
                                onChange={(e) => onChange(value.map((v, idx) => (idx === i ? { ...v, note: e.target.value } : v)))}
                            />
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

export function DamageLegend({ damages }: { damages: Damage[] }) {
    if (!damages.length) return <p className="text-muted-foreground text-sm">Nenhuma avaria marcada na entrada.</p>;
    return (
        <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
            {damages.map((d, i) => (
                <li key={i} className="flex items-center gap-2">
                    <span
                        className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-black text-white"
                        style={{ background: DAMAGE[d.type].color }}
                    >
                        {DAMAGE[d.type].letter}
                        {i + 1}
                    </span>
                    <span>
                        <b>{DAMAGE[d.type].label}</b>
                        {d.note ? ` — ${d.note}` : ''}
                    </span>
                </li>
            ))}
        </ol>
    );
}
