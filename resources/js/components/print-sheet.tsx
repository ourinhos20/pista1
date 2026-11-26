import { plate } from '@/lib/os';
import { cn } from '@/lib/utils';
import type { OsFull, Shop } from '@/types';
import { Head } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import type { ReactNode } from 'react';

/** Folha A4 com cabeçalho preto da Pista 1 (como os modelos de papel). */
export function PrintShell({ title, os, shop, children }: { title: string; os: OsFull; shop: Shop; children: ReactNode }) {
    return (
        <div className="min-h-svh bg-zinc-200 py-6 text-black print:bg-white print:py-0" style={{ colorScheme: 'light', ['--card' as string]: '#fff' }}>
            <Head title={os.number ? `${title} · OS ${os.number} · ${plate(os.vehicle?.plate)}` : `${title} (em branco)`} />

            <div className="no-print mx-auto mb-4 flex w-[210mm] max-w-full items-center justify-between gap-2 px-2">
                {/* volta para a tela de onde veio (a ficha abre na mesma aba) */}
                <button
                    onClick={() => (window.history.length > 1 ? window.history.back() : window.location.assign(route('dashboard')))}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 font-semibold shadow-sm"
                >
                    <ArrowLeft className="size-4" /> Voltar
                </button>
                <button onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#d42a2a] px-5 font-semibold text-white shadow-sm">
                    <Printer className="size-5" /> Imprimir
                </button>
            </div>

            <div className="print-sheet mx-auto flex min-h-[297mm] w-[210mm] max-w-full flex-col gap-[4mm] bg-white p-[10mm] font-sans text-[12px] leading-snug shadow-xl">
                <header className="flex items-stretch justify-between gap-4 rounded-[14px] bg-[#0b0b0d] px-5 py-2.5 text-white">
                    <img src="/images/pista1-logo.png" alt="Pista 1" className="h-[17mm] w-auto object-contain" />
                    <div className="flex flex-col items-end justify-center text-right">
                        <p className="text-[18px] font-bold">{shop.phone}</p>
                        <p className="text-[14px] font-semibold">{shop.instagram}</p>
                        {shop.address && <p className="text-[10px] opacity-80">{shop.address}</p>}
                        {shop.document && <p className="text-[10px] opacity-80">CNPJ {shop.document}</p>}
                    </div>
                </header>

                <div className="flex items-end justify-between">
                    <h1 className="text-[22px] font-extrabold tracking-tight">{title}</h1>
                    <div className="text-right">
                        <p className="text-[11px] text-zinc-600">Ordem de serviço</p>
                        <p className="text-[20px] font-extrabold tabular-nums">Nº {os.number || '__________'}</p>
                    </div>
                </div>

                {children}

                <footer className="mt-auto border-t border-zinc-300 pt-2 text-center text-[9.5px] text-zinc-600">{shop.terms}</footer>
            </div>
        </div>
    );
}

/** Caixa arredondada com etiqueta preta, igual às fichas de papel. */
export function Box({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
    return (
        <section className={cn('relative rounded-[12px] border-[2.5px] border-black px-4 pt-4 pb-3', label && 'mt-2', className)}>
            {label && <span className="absolute -top-[11px] left-4 rounded-full bg-black px-3 py-[2px] text-[11px] font-bold text-white">{label}</span>}
            {children}
        </section>
    );
}

/** Campo "Rótulo: ______" com valor pré-preenchido. */
export function Line({ label, value, className }: { label: string; value?: ReactNode; className?: string }) {
    return (
        <div className={cn('flex min-w-0 items-end gap-1.5', className)}>
            <span className="shrink-0 text-[12.5px] font-semibold">{label}:</span>
            <span className="min-h-[18px] flex-1 truncate border-b border-black pb-[1px] text-[13px]">{value}</span>
        </div>
    );
}

export function BlankLines({ n, text }: { n: number; text?: string | null }) {
    return (
        <div className="grid">
            {text && <p className="mb-1 text-[13px] whitespace-pre-line">{text}</p>}
            {Array.from({ length: n }).map((_, i) => (
                <div key={i} className="h-[8mm] border-b border-black" />
            ))}
        </div>
    );
}

export function Signatures({ left, right = 'Data' }: { left: string | string[]; right?: string }) {
    const names = Array.isArray(left) ? left : [left];
    return (
        <div className={cn('mt-3 grid gap-8 text-center text-[12.5px] font-semibold', names.length > 1 ? 'grid-cols-[3fr_3fr_2fr]' : 'grid-cols-[2fr_1fr]')}>
            {names.map((n) => (
                <div key={n}>
                    <div className="h-[10mm] border-b border-black" />
                    <p className="mt-1">{n}</p>
                </div>
            ))}
            <div>
                <div className="flex h-[10mm] items-end justify-center gap-1 border-b border-black pb-1 text-zinc-400">/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/</div>
                <p className="mt-1">{right}</p>
            </div>
        </div>
    );
}

export function CheckBox({ checked }: { checked?: boolean }) {
    return <span className="inline-grid size-[13px] place-items-center rounded-[3px] border-[1.5px] border-black text-[10px] leading-none font-black">{checked ? '✓' : ''}</span>;
}
