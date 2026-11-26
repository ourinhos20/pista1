/**
 * Componentes de interface no estilo ERP (barra de menus, barra de título,
 * barra de ferramentas com teclas de atalho, grades de dados e formulários densos).
 */
import { FlashToast } from '@/components/flash-toast';
import { PlateSearch } from '@/components/plate-search';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { STATUS, since } from '@/lib/os';
import { cn } from '@/lib/utils';
import type { OsStatus, Role, SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { ChevronDown, LogOut, Menu, UserCog } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

/* ------------------------------------------------------------------ menus */

type MenuItem = { label: string; href: string; key?: string; code: string; badge?: number; newTab?: boolean };
type MenuGroup = { label: string; items: MenuItem[] };

/** Caminho relativo da rota (o sistema fica num prefixo escondido, ex.: /sistema). */
const path = (name: string) => route(name, undefined, false);
const item = (label: string, name: string, code: string, key?: string): MenuItem => ({ label, href: path(name), code, key });

/** Fichas em branco para imprimir e preencher à mão (abrem em outra aba). */
function fichasFor(role: Role): MenuGroup {
    const ficha = (label: string, tipo: string, code: string): MenuItem => ({ label, href: route('fichas.branco', tipo, false), code, newTab: true });
    const items = [
        ficha('Vistoria de entrada', 'entrada', 'FIC010'),
        ficha('Diagnóstico (defeito)', 'diagnostico', 'FIC020'),
        ficha('Checklist de revisão / preventiva', 'revisao', 'FIC030'),
    ];
    if (role !== 'mecanico') items.push(ficha('Orçamento / via do cliente', 'cliente', 'FIC040'));
    return { label: 'Fichas', items };
}

export function menusFor(role: Role, preNew = 0): MenuGroup[] {
    const oficina: MenuGroup = { label: 'Oficina', items: [item('Agenda da oficina', 'mecanico.index', 'OFI010', 'F9')] };
    const conta: MenuGroup = { label: 'Sistema', items: [item('Minha conta', 'profile.edit', 'SIS020')] };
    if (role === 'mecanico') return [oficina, fichasFor(role), conta];

    // "Nova OS" não fica no menu: é o botão + na tela de Ordens de serviço (ou a tecla F2)
    const groups: MenuGroup[] = [
        {
            label: 'Atendimento',
            items: [
                item('Painel de atendimento', 'dashboard', 'ATD001', 'F1'),
                item('Ordens de serviço', 'os.index', 'ATD020', 'F4'),
                { label: 'Agendamentos online', href: path('os.index') + '?origem=online&status=aguardando', code: 'ATD005', badge: preNew },
            ],
        },
        oficina,
        fichasFor(role),
        {
            label: 'Cadastros',
            items: [item('Clientes e veículos', 'clientes.index', 'CAD010', 'F6'), item('Fornecedores', 'fornecedores.index', 'CAD020')],
        },
        { label: 'Compras', items: [item('Compras de peças', 'compras.index', 'COM010'), item('Fornecedores', 'fornecedores.index', 'CAD020')] },
    ];
    if (role === 'master') {
        groups.push({
            label: 'Financeiro',
            items: [
                item('Painel financeiro', 'financeiro.index', 'FIN001', 'F7'),
                item('Lançamentos e contas', 'financeiro.entries', 'FIN010'),
                item('Sócios: aportes e retiradas', 'financeiro.partners', 'FIN020'),
            ],
        });
        conta.items.unshift(item('Usuários e permissões', 'usuarios.index', 'SIS010'));
    }
    groups.push(conta);
    return groups;
}

const ROLE_LABEL: Record<Role, string> = { master: 'Master', balcao: 'Balcão', mecanico: 'Mecânico' };

function useShortcuts(role: Role) {
    useEffect(() => {
        const map: Record<string, string> = {};
        menusFor(role).forEach((g) => g.items.forEach((i) => i.key && (map[i.key] = i.href)));
        if (role !== 'mecanico') map.F2 = path('os.create');
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'F3') {
                e.preventDefault();
                document.getElementById('plate-search')?.focus();
                return;
            }
            const href = map[e.key];
            if (href) {
                e.preventDefault();
                router.visit(href);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [role]);
}

function UserMenu() {
    const { auth } = usePage<SharedData>().props;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex h-full items-center gap-2 px-3 text-[13px] text-zinc-300 hover:bg-white/10 hover:text-white">
                <span className="grid size-6 place-items-center rounded-[3px] bg-[#d42a2a] text-[11px] font-bold text-white">
                    {auth.user.name.slice(0, 1)}
                </span>
                <span className="hidden max-w-32 truncate lg:inline">{auth.user.name}</span>
                <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-[4px]">
                <DropdownMenuLabel className="text-[12px]">
                    {auth.user.name}
                    <span className="text-muted-foreground block font-normal">{ROLE_LABEL[auth.user.role]}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={route('profile.edit')}>
                        <UserCog className="size-4" /> Minha conta
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={route('logout')} method="post" as="button" className="w-full">
                        <LogOut className="size-4" /> Sair do sistema
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function MenuBar() {
    const { auth, onlineNew: preNew } = usePage<SharedData>().props;
    const page = usePage();
    const current = page.url.split('?')[0];
    const groups = menusFor(auth.user.role, preNew);
    const Badge = ({ n }: { n?: number }) =>
        n ? (
            <span className="ml-2 grid h-5 min-w-5 place-items-center rounded-full bg-[#d42a2a] px-1 text-[11px] font-bold text-white">{n}</span>
        ) : null;
    const home = path(auth.user.role === 'mecanico' ? 'mecanico.index' : 'dashboard');
    const dash = path('dashboard');
    const [open, setOpen] = useState(false);

    return (
        <div className="no-print sticky top-0 z-40 flex h-12 items-stretch bg-[#0f1012] text-white md:h-10">
            {/* celular: menu lateral */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger className="relative grid w-12 place-items-center hover:bg-white/10 md:hidden" aria-label="Abrir menu">
                    <Menu className="size-5" />
                    {preNew > 0 && <span className="absolute top-2.5 right-2.5 size-2.5 rounded-full bg-[#d42a2a]" />}
                </SheetTrigger>
                <SheetContent side="left" className="w-72 border-r-0 bg-[#0f1012] p-0 text-white">
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <div className="border-b border-white/10 p-4">
                        <img src="/images/pista1-logo.png" alt="Pista 1" className="h-10" />
                    </div>
                    <nav className="p-2">
                        {groups.map((g) => (
                            <div key={g.label} className="mb-2">
                                <p className="px-3 py-2 text-[11px] font-bold tracking-wider text-zinc-500 uppercase">{g.label}</p>
                                {g.items.map((i) =>
                                    i.newTab ? (
                                        <a
                                            key={i.href}
                                            href={i.href}
                                            onClick={() => setOpen(false)}
                                            className="flex h-12 items-center rounded-[4px] px-3 text-[15px] text-zinc-300"
                                        >
                                            {i.label}
                                        </a>
                                    ) : (
                                        <Link
                                            key={i.href}
                                            href={i.href}
                                            onClick={() => setOpen(false)}
                                            className={cn(
                                                'flex h-12 items-center rounded-[4px] px-3 text-[15px]',
                                                current === i.href ? 'bg-white/10 font-semibold' : 'text-zinc-300',
                                            )}
                                        >
                                            {i.label}
                                            <Badge n={i.badge} />
                                        </Link>
                                    ),
                                )}
                            </div>
                        ))}
                    </nav>
                </SheetContent>
            </Sheet>

            <Link href={home} className="flex items-center border-r border-white/10 px-3">
                <img src="/images/pista1-logo.png" alt="Pista 1" className="h-7 md:h-6" />
            </Link>

            <nav className="hidden items-stretch md:flex">
                {groups.map((g) => {
                    const active = g.items.some((i) => !i.newTab && (current === i.href || (i.href !== dash && current.startsWith(i.href + '/'))));
                    return (
                        <DropdownMenu key={g.label}>
                            <DropdownMenuTrigger
                                className={cn(
                                    'flex items-center gap-1 px-3.5 text-[13px] font-medium outline-none hover:bg-white/10 data-[state=open]:bg-white/10',
                                    active ? 'text-white shadow-[inset_0_-3px_0_#d42a2a]' : 'text-zinc-300',
                                )}
                            >
                                {g.label}
                                <Badge n={g.items.reduce((s, i) => s + (i.badge ?? 0), 0)} />
                                <ChevronDown className="size-3 opacity-60" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" sideOffset={0} className="min-w-64 rounded-none rounded-b-[4px] p-1">
                                {g.items.map((i) => (
                                    <DropdownMenuItem key={i.href} asChild className="h-9 rounded-[3px] text-[13px]">
                                        {i.newTab ? (
                                            <a href={i.href} className="flex w-full items-center">
                                                <span className="text-muted-foreground w-14 font-mono text-[11px]">{i.code}</span>
                                                <span className="flex-1">{i.label}</span>
                                                <span className="text-muted-foreground ml-4 text-[10px]">em branco</span>
                                            </a>
                                        ) : (
                                            <Link href={i.href} className="flex w-full items-center">
                                                <span className="text-muted-foreground w-14 font-mono text-[11px]">{i.code}</span>
                                                <span className="flex-1">{i.label}</span>
                                                <Badge n={i.badge} />
                                                {i.key && (
                                                    <kbd className="text-muted-foreground ml-4 rounded-[2px] border px-1 font-mono text-[10px]">
                                                        {i.key}
                                                    </kbd>
                                                )}
                                            </Link>
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                })}
            </nav>

            <div className="ml-auto flex items-center px-2 md:px-3">
                <PlateSearch compact />
            </div>
            <UserMenu />
        </div>
    );
}

function StatusBar() {
    const { auth } = usePage<SharedData>().props;
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(t);
    }, []);
    const keys =
        auth.user.role === 'mecanico'
            ? 'F3 Buscar placa · F9 Agenda'
            : `F1 Painel · F2 Nova OS · F3 Buscar placa · F4 Ordens · F6 Clientes${auth.user.role === 'master' ? ' · F7 Financeiro' : ''} · F9 Agenda`;

    return (
        <footer className="no-print fixed inset-x-0 bottom-0 z-30 hidden h-6 items-center gap-0 border-t border-black bg-[#1a1b1e] text-[11px] text-zinc-400 md:flex">
            <span className="border-r border-white/10 px-3 font-semibold text-zinc-200">Pista 1 Mecânica Automotiva</span>
            <span className="border-r border-white/10 px-3">
                Usuário: <b className="text-zinc-200">{auth.user.name}</b> ({ROLE_LABEL[auth.user.role]})
            </span>
            <span className="border-r border-white/10 px-3">{keys}</span>
            <span className="ml-auto border-l border-white/10 px-3">
                {now.toLocaleDateString('pt-BR')} {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="flex items-center gap-1.5 border-l border-white/10 px-3">
                <span className="size-1.5 rounded-full bg-green-500" /> Conectado
            </span>
        </footer>
    );
}

/* ----------------------------------------------------------- layout base */

export function ErpLayout({ title, code, toolbar, children }: { title: string; code?: string; toolbar?: ReactNode; children: ReactNode }) {
    const { auth } = usePage<SharedData>().props;
    useShortcuts(auth.user.role);

    return (
        <div className="bg-background flex min-h-svh flex-col">
            <MenuBar />
            <div className="no-print sticky top-12 z-20 border-b border-[#c9cdd3] bg-[#f6f7f8] md:top-10">
                <div className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2 px-3 py-1.5 md:px-4">
                    <h1 className="flex min-w-0 items-center gap-2.5">
                        <span className="h-5 w-1 shrink-0 bg-[#d42a2a]" />
                        {code && <span className="text-muted-foreground hidden font-mono text-[11px] md:inline">{code}</span>}
                        <span className="truncate text-[15px] font-bold tracking-tight">{title}</span>
                    </h1>
                    {toolbar && <div className="ml-auto flex flex-wrap items-center gap-1.5">{toolbar}</div>}
                </div>
            </div>
            <main className="flex-1 p-2 pb-24 md:p-3 md:pb-10">{children}</main>
            <StatusBar />
            <FlashToast />
        </div>
    );
}

/* ---------------------------------------------------------- ferramentas */

type ToolProps = {
    icon?: ReactNode;
    label: string;
    fkey?: string;
    href?: string;
    onClick?: () => void;
    primary?: boolean;
    danger?: boolean;
    disabled?: boolean;
    external?: boolean;
    className?: string;
};

export function Tool({ icon, label, fkey, href, onClick, primary, danger, disabled, external, className }: ToolProps) {
    const cls = cn(
        'inline-flex h-11 items-center gap-1.5 rounded-[3px] border px-3 text-[13px] font-semibold whitespace-nowrap transition select-none md:h-8 md:px-2.5',
        primary
            ? 'border-[#b51f1f] bg-[#d42a2a] text-white hover:bg-[#c02424]'
            : danger
              ? 'border-[#c9cdd3] bg-white text-[#b51f1f] hover:bg-red-50'
              : 'border-[#c9cdd3] bg-white text-zinc-800 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100',
        disabled && 'pointer-events-none opacity-50',
        '[&_svg]:size-4',
        className,
    );
    const body = (
        <>
            {icon}
            <span>{label}</span>
            {fkey && (
                <kbd
                    className={cn(
                        'hidden rounded-[2px] border px-1 font-mono text-[10px] font-normal md:inline',
                        primary ? 'border-white/40 text-white/80' : 'text-zinc-500',
                    )}
                >
                    {fkey}
                </kbd>
            )}
        </>
    );
    if (href && external)
        return (
            <a href={href} target="_blank" rel="noreferrer" className={cls} onClick={onClick}>
                {body}
            </a>
        );
    if (href)
        return (
            <Link href={href} className={cls}>
                {body}
            </Link>
        );
    return (
        <button type="button" onClick={onClick} disabled={disabled} className={cls}>
            {body}
        </button>
    );
}

/* ------------------------------------------------------- blocos de tela */

export function Block({
    title,
    actions,
    children,
    className,
    bodyClassName,
}: {
    title?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    bodyClassName?: string;
}) {
    return (
        <section className={cn('bg-card @container overflow-hidden rounded-[4px] border border-[#c9cdd3] dark:border-zinc-700', className)}>
            {(title || actions) && (
                <header className="flex min-h-9 items-center justify-between gap-2 border-b border-[#d7dade] bg-[#f3f4f6] px-3 dark:border-zinc-700 dark:bg-zinc-800">
                    <h2 className="text-[12px] font-bold tracking-wide text-zinc-700 uppercase dark:text-zinc-200">{title}</h2>
                    {actions && <div className="flex items-center gap-1.5">{actions}</div>}
                </header>
            )}
            <div className={cn('p-3', bodyClassName)}>{children}</div>
        </section>
    );
}

export function Field({ label, children, className, error }: { label: string; children: ReactNode; className?: string; error?: string }) {
    return (
        <label className={cn('grid min-w-0 content-start gap-1', className)}>
            <span className="text-[11px] font-semibold tracking-wide text-zinc-600 uppercase dark:text-zinc-400">{label}</span>
            {children}
            {error && <span className="text-[12px] font-medium text-red-600">{error}</span>}
        </label>
    );
}

/** Valor somente leitura com aparência de campo. */
export function ReadOnly({ children, className }: { children?: ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                'flex min-h-11 min-w-0 items-center rounded-[3px] border border-[#d7dade] bg-[#f7f8f9] px-2.5 text-[15px] md:min-h-8 md:text-[13px] dark:border-zinc-700 dark:bg-zinc-800',
                className,
            )}
        >
            <span className="truncate">{children ?? <span className="text-zinc-400">—</span>}</span>
        </div>
    );
}

export const selectCls =
    'h-11 w-full rounded-[3px] border border-input bg-card px-2 text-base md:h-8 md:text-[13px] focus-visible:border-[#d42a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d42a2a]/20';
export const textareaCls =
    'w-full rounded-[3px] border border-input bg-card px-2.5 py-2 text-base leading-relaxed md:text-[13px] focus-visible:border-[#d42a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d42a2a]/20';

export function Tabs<T extends string>({
    tabs,
    value,
    onChange,
}: {
    tabs: { value: T; label: string; badge?: ReactNode }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="flex overflow-x-auto border-b border-[#c9cdd3]">
            {tabs.map((t) => (
                <button
                    key={t.value}
                    type="button"
                    onClick={() => onChange(t.value)}
                    className={cn(
                        '-mb-px flex h-11 shrink-0 items-center gap-1.5 border border-transparent px-4 text-[13px] font-semibold md:h-9',
                        value === t.value
                            ? 'bg-card rounded-t-[4px] border-[#c9cdd3] border-b-white text-zinc-900 shadow-[inset_0_2px_0_#d42a2a] dark:border-b-zinc-900 dark:text-white'
                            : 'text-zinc-600 hover:text-zinc-900',
                    )}
                >
                    {t.label}
                    {t.badge}
                </button>
            ))}
        </div>
    );
}

export function Situacao({ status, className, short = false }: { status: OsStatus; className?: string; short?: boolean }) {
    const s = STATUS[status];
    return (
        <span
            className={cn(
                'inline-flex h-6 items-center gap-1.5 rounded-[3px] px-2 text-[11px] font-bold whitespace-nowrap uppercase ring-1 ring-inset md:h-5 md:px-1.5',
                s.badge,
                className,
            )}
        >
            <span className={cn('size-2 rounded-[1px]', s.dot)} />
            {short ? s.short : s.label}
        </span>
    );
}

/* --------------------------------------------------------- grade de dados */

export type Col<T> = {
    label: string;
    render: (row: T) => ReactNode;
    className?: string;
    align?: 'left' | 'right' | 'center';
    hide?: 'sm' | 'md' | 'lg';
};

const hideCls = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };

export function Grid<T>({
    cols,
    rows,
    rowKey,
    onRowClick,
    empty = 'Nenhum registro encontrado.',
    footer,
}: {
    cols: Col<T>[];
    rows: T[];
    rowKey: (r: T) => string | number;
    onRowClick?: (r: T) => void;
    empty?: string;
    footer?: ReactNode;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[14px] md:text-[13px]">
                <thead>
                    <tr className="border-b border-[#c9cdd3] bg-[#eceef1] dark:border-zinc-700 dark:bg-zinc-800">
                        {cols.map((c, i) => (
                            <th
                                key={i}
                                className={cn(
                                    'h-8 border-r border-[#d7dade] px-2.5 text-left text-[11px] font-bold tracking-wide whitespace-nowrap text-zinc-600 uppercase last:border-r-0 dark:border-zinc-700 dark:text-zinc-300',
                                    c.align === 'right' && 'text-right',
                                    c.align === 'center' && 'text-center',
                                    c.hide && hideCls[c.hide],
                                    c.className,
                                )}
                            >
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={cols.length} className="text-muted-foreground px-3 py-8 text-center">
                                {empty}
                            </td>
                        </tr>
                    )}
                    {rows.map((r) => (
                        <tr
                            key={rowKey(r)}
                            onClick={onRowClick ? () => onRowClick(r) : undefined}
                            className={cn(
                                'border-b border-[#e3e5e8] even:bg-[#f8f9fa] dark:border-zinc-800 dark:even:bg-zinc-900/60',
                                onRowClick && 'cursor-pointer hover:bg-[#fdecec] dark:hover:bg-red-950/30',
                            )}
                        >
                            {cols.map((c, i) => (
                                <td
                                    key={i}
                                    className={cn(
                                        'h-11 border-r border-[#eceef1] px-2.5 align-middle last:border-r-0 md:h-8 dark:border-zinc-800',
                                        c.align === 'right' && 'text-right tabular-nums',
                                        c.align === 'center' && 'text-center',
                                        c.hide && hideCls[c.hide],
                                        c.className,
                                    )}
                                >
                                    {c.render(r)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {footer && (
                <div className="flex items-center justify-between border-t border-[#d7dade] bg-[#f3f4f6] px-3 py-1.5 text-[12px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800">
                    {footer}
                </div>
            )}
        </div>
    );
}

/** Há quanto tempo a OS está na etapa atual; vermelho quando passou do limite (gargalo). */
export function Since({ iso, status, className }: { iso?: string | null; status: OsStatus; className?: string }) {
    const s = since(iso, status);
    if (!s.text || ['entregue', 'cancelada'].includes(status)) return null;
    return (
        <span
            className={cn('text-[11px] whitespace-nowrap tabular-nums', s.stale ? 'font-bold text-[#b51f1f]' : 'text-zinc-500', className)}
            title="Tempo nesta etapa"
        >
            {s.stale ? '⚠ ' : ''}
            {s.text}
        </span>
    );
}

export function OriginTag({ origin }: { origin: string }) {
    if (origin === 'balcao') return null;
    return (
        <span className="rounded-[2px] bg-emerald-600 px-1 py-px text-[10px] font-bold text-white uppercase" title="Agendamento feito pelo cliente">
            {origin === 'bot' ? 'bot' : 'site'}
        </span>
    );
}

/** Placa em fonte mono, estilo etiqueta. */
export function Placa({ value, big = false }: { value?: string | null; big?: boolean }) {
    const v = value && /^[A-Z]{3}\d{4}$/.test(value) ? `${value.slice(0, 3)}-${value.slice(3)}` : value;
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-[3px] border border-zinc-800 bg-white font-mono font-bold tracking-wider text-zinc-900 dark:border-zinc-300',
                big ? 'h-9 px-2.5 text-[20px]' : 'h-6 px-1.5 text-[12px] md:h-5',
            )}
        >
            {v || '—'}
        </span>
    );
}
