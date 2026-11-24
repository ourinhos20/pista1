import { cn } from '@/lib/utils';
import { STATUS, km, plate, relative, time } from '@/lib/os';
import type { OsCard, OsStatus } from '@/types';
import { Link } from '@inertiajs/react';
import { CalendarClock, ChevronRight, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';

export function StatusBadge({ status, className }: { status: OsStatus; className?: string }) {
    const s = STATUS[status];
    return (
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap', s.badge, className)}>
            <span className={cn('size-1.5 rounded-full', s.dot)} />
            {s.label}
        </span>
    );
}

/** Placa em destaque, estilo Mercosul. */
export function PlateBadge({ value, size = 'md', className }: { value?: string | null; size?: 'sm' | 'md' | 'lg'; className?: string }) {
    return (
        <span
            className={cn(
                'tabular inline-flex items-center rounded-md border-2 border-zinc-900 bg-white font-mono font-bold tracking-wider text-zinc-900 uppercase dark:border-zinc-300',
                size === 'sm' && 'px-1.5 py-0 text-xs',
                size === 'md' && 'px-2 py-0.5 text-sm',
                size === 'lg' && 'px-3 py-1 text-2xl md:text-3xl',
                className,
            )}
        >
            {plate(value) || '—'}
        </span>
    );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
    return (
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
                {subtitle && <p className="text-muted-foreground mt-1 text-[15px]">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={cn('bg-card @container rounded-2xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10', className)}>
            {(title || action) && (
                <div className="mb-4 flex items-center justify-between gap-3">
                    {title && <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>}
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 pb-28 md:p-8', className)}>{children}</div>;
}

export function Empty({ icon, title, text }: { icon?: ReactNode; title: string; text?: string }) {
    return (
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-10 text-center">
            {icon ?? <Wrench className="size-8 opacity-40" />}
            <p className="text-foreground font-semibold">{title}</p>
            {text && <p className="max-w-sm text-sm">{text}</p>}
        </div>
    );
}

export function Info({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
    return (
        <div className={cn('min-w-0', className)}>
            <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</dt>
            <dd className="mt-0.5 truncate text-[15px] font-medium">{children || '—'}</dd>
        </div>
    );
}

/** Linha de OS usada em listas (dashboard, lista de OS, cliente). */
export function OsRow({ os, showMoney = false }: { os: OsCard; showMoney?: boolean }) {
    return (
        <Link
            href={route('os.show', os.id)}
            className="hover:bg-muted/70 -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors md:gap-4"
        >
            <PlateBadge value={os.vehicle?.plate} className="shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{os.vehicle?.title || 'Veículo'}</p>
                <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-sm">
                    <span className="truncate">{os.client?.name}</span>
                    <span className="tabular shrink-0">· OS {os.number}</span>
                    {os.scheduled_at ? (
                        <span className="inline-flex shrink-0 items-center gap-1">
                            · <CalendarClock className="size-3.5" /> {time(os.scheduled_at)}
                        </span>
                    ) : (
                        <span className="hidden shrink-0 @xl:inline">· {relative(os.created_at)}</span>
                    )}
                    {os.mechanic && <span className="hidden truncate @2xl:inline">· {os.mechanic.name}</span>}
                </p>
            </div>
            {showMoney && os.total !== undefined && (
                <span className="tabular hidden shrink-0 text-right font-semibold @xl:block">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(os.total)}
                </span>
            )}
            <StatusBadge status={os.status} className="hidden shrink-0 @lg:inline-flex" />
            <span title={STATUS[os.status].label} className={cn('size-2.5 shrink-0 rounded-full @lg:hidden', STATUS[os.status].dot)} />
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        </Link>
    );
}

export function KmText({ value }: { value?: number | null }) {
    return <span className="tabular">{km(value)}</span>;
}
