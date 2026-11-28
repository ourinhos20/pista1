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
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { STATUS, money, since } from '@/lib/os';
import { cn } from '@/lib/utils';
import type { OsCard, OsStatus, Role, SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarDays,
    ChevronDown,
    ClipboardList,
    LayoutDashboard,
    Lock,
    LogOut,
    Menu,
    Search,
    UserCog,
    Users,
    X,
} from 'lucide-react';
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
            <DropdownMenuTrigger className="flex h-full shrink-0 items-center gap-2 px-3 text-[13px] text-zinc-300 hover:bg-white/10 hover:text-white">
                <span className="grid size-8 place-items-center rounded-lg bg-[#d42a2a] text-[14px] font-bold text-white md:size-6 md:rounded-md md:text-[11px]">
                    {auth.user.name.slice(0, 1)}
                </span>
                <span className="hidden max-w-32 truncate lg:inline">{auth.user.name}</span>
                <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-lg">
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

/** Item ativo: a própria tela ou uma tela "filha" (ex.: /os/12 dentro de Ordens). */
function isActive(current: string, href: string, dash: string) {
    const base = href.split('?')[0];
    return current === base || (base !== dash && current.startsWith(base + '/'));
}

function MenuBar({ onSearch, onMore }: { onSearch: () => void; onMore: () => void }) {
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

    return (
        <div className="no-print sticky top-0 z-40 flex h-14 items-stretch bg-[#0f1012] text-white md:h-10">
            <Link href={home} className="flex shrink-0 items-center px-4 md:border-r md:border-white/10 md:px-3">
                <img src="/images/pista1-logo.png" alt="Pista 1" className="h-8 md:h-6" />
            </Link>

            {/* tablet: a fileira de menus não cabe; um botão abre a lista completa */}
            <button
                type="button"
                onClick={onMore}
                className="hidden shrink-0 items-center gap-1.5 px-3 text-[13px] font-semibold text-zinc-200 hover:bg-white/10 md:flex lg:hidden"
            >
                <Menu className="size-4" /> Menu
                <Badge n={preNew} />
            </button>
            <span className="hidden flex-1 md:block lg:hidden" />
            <nav className="hidden min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden">
                {groups.map((g) => {
                    const active = g.items.some((i) => !i.newTab && isActive(current, i.href, dash));
                    return (
                        <DropdownMenu key={g.label}>
                            <DropdownMenuTrigger
                                className={cn(
                                    'flex shrink-0 items-center gap-1 px-2.5 text-[13px] font-medium outline-none hover:bg-white/10 data-[state=open]:bg-white/10 lg:px-3.5',
                                    active ? 'text-white shadow-[inset_0_-3px_0_#d42a2a]' : 'text-zinc-300',
                                )}
                            >
                                {g.label}
                                <Badge n={g.items.reduce((s, i) => s + (i.badge ?? 0), 0)} />
                                <ChevronDown className="size-3 opacity-60" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" sideOffset={0} className="min-w-64 rounded-none rounded-b-lg p-1">
                                {g.items.map((i) => (
                                    <DropdownMenuItem key={i.href} asChild className="h-9 rounded-md text-[13px]">
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
                                                    <kbd className="text-muted-foreground ml-4 rounded-[3px] border px-1 font-mono text-[10px]">
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

            <div className="hidden shrink-0 items-center px-2 md:flex lg:px-3">
                <PlateSearch compact className="sm:w-32 lg:w-56" />
            </div>
            {/* celular: a busca abre numa faixa larga logo abaixo */}
            <button
                type="button"
                onClick={onSearch}
                aria-label="Buscar placa"
                className="ml-auto grid w-12 place-items-center text-zinc-200 hover:bg-white/10 md:hidden"
            >
                <Search className="size-[22px]" />
            </button>
            <UserMenu />
        </div>
    );
}

/** Busca por placa no celular: faixa larga embaixo do cabeçalho. */
function MobileSearch({ onClose }: { onClose: () => void }) {
    return (
        <div className="no-print sticky top-14 z-30 flex items-center gap-2 bg-[#0f1012] px-3 pb-3 md:hidden">
            <PlateSearch compact autoFocus inputId="plate-search-mobile" className="w-full sm:w-full" />
            <button
                type="button"
                onClick={onClose}
                aria-label="Fechar busca"
                className="grid size-11 shrink-0 place-items-center rounded-lg text-zinc-300"
            >
                <X className="size-5" />
            </button>
        </div>
    );
}

type NavItem = { label: string; icon: ReactNode; href?: string; onClick?: () => void; badge?: number };

/** Barra de navegação no rodapé (só no celular): as telas do dia a dia ao alcance do polegar. */
function BottomNav({ onSearch, onMore }: { onSearch: () => void; onMore: () => void }) {
    const { auth, onlineNew: preNew } = usePage<SharedData>().props;
    const current = usePage().url.split('?')[0];
    const dash = path('dashboard');
    const items: NavItem[] =
        auth.user.role === 'mecanico'
            ? [
                  { label: 'Agenda', icon: <CalendarDays />, href: path('mecanico.index') },
                  { label: 'Buscar placa', icon: <Search />, onClick: onSearch },
                  { label: 'Mais', icon: <Menu />, onClick: onMore },
              ]
            : [
                  { label: 'Painel', icon: <LayoutDashboard />, href: dash },
                  { label: 'Ordens', icon: <ClipboardList />, href: path('os.index'), badge: preNew },
                  { label: 'Agenda', icon: <CalendarDays />, href: path('mecanico.index') },
                  { label: 'Clientes', icon: <Users />, href: path('clientes.index') },
                  { label: 'Mais', icon: <Menu />, onClick: onMore },
              ];

    return (
        <nav
            aria-label="Navegação principal"
            className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-[#e4e6ea] bg-white/95 px-1.5 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
        >
            {items.map((i) => {
                const active = !!i.href && isActive(current, i.href, dash);
                const cls = cn(
                    'relative flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold [&_svg]:size-6',
                    active ? 'text-zinc-900 dark:text-white [&_svg]:text-[#d42a2a]' : 'text-zinc-500',
                );
                const body = (
                    <>
                        {active && <span className="absolute top-0 h-[3px] w-7 rounded-b-[3px] bg-[#d42a2a]" />}
                        <span className="relative">
                            {i.icon}
                            {!!i.badge && (
                                <span className="absolute -top-1.5 -right-2.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#d42a2a] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                                    {i.badge}
                                </span>
                            )}
                        </span>
                        {i.label}
                    </>
                );
                return i.href ? (
                    <Link key={i.label} href={i.href} className={cls} aria-current={active ? 'page' : undefined}>
                        {body}
                    </Link>
                ) : (
                    <button key={i.label} type="button" onClick={i.onClick} className={cls}>
                        {body}
                    </button>
                );
            })}
        </nav>
    );
}

/** "Mais": todas as telas do menu, agrupadas, numa gaveta que sobe do rodapé. */
function MoreSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
    const { auth, onlineNew: preNew } = usePage<SharedData>().props;
    const fullUrl = usePage().url;
    const current = fullUrl.split('?')[0];
    const groups = menusFor(auth.user.role, preNew);
    const close = () => onOpenChange(false);
    const row = 'flex min-h-12 items-center gap-3 border-t border-[#eceef1] px-4 text-[15px] font-semibold first:border-t-0 dark:border-zinc-800';

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="max-h-[88svh] overflow-y-auto rounded-t-2xl border-0 bg-[#f4f5f7] p-0 dark:bg-zinc-950">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-zinc-300" />
                <div className="grid gap-5 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                    <div className="flex items-center gap-3 rounded-xl border border-[#e4e6ea] bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900">
                        <span className="grid size-11 place-items-center rounded-xl bg-[#d42a2a] text-lg font-extrabold text-white">
                            {auth.user.name.slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[16px] font-bold">{auth.user.name}</span>
                            <span className="text-muted-foreground block text-[13px]">{ROLE_LABEL[auth.user.role]}</span>
                        </span>
                    </div>
                    {groups.map((g) => (
                        <section key={g.label}>
                            <h2 className="mb-2 ml-1 text-[12px] font-bold tracking-wider text-zinc-600 uppercase">{g.label}</h2>
                            <div className="overflow-hidden rounded-xl border border-[#e4e6ea] bg-white dark:border-zinc-800 dark:bg-zinc-900">
                                {g.items.map((i) => {
                                    const inner = (
                                        <>
                                            <span className="flex-1">{i.label}</span>
                                            {!!i.badge && (
                                                <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-[#d42a2a] px-1.5 text-[12px] font-bold text-white">
                                                    {i.badge}
                                                </span>
                                            )}
                                            <span className="font-mono text-[11px] font-semibold text-zinc-500">{i.code}</span>
                                        </>
                                    );
                                    return i.newTab ? (
                                        <a key={i.href} href={i.href} onClick={close} className={row}>
                                            {inner}
                                        </a>
                                    ) : (
                                        <Link
                                            key={i.href}
                                            href={i.href}
                                            onClick={close}
                                            className={cn(row, (i.href.includes('?') ? fullUrl === i.href : current === i.href) && 'text-[#b51f1f]')}
                                        >
                                            {inner}
                                        </Link>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#e4e6ea] bg-white text-[15px] font-semibold text-[#b51f1f] dark:border-zinc-800 dark:bg-zinc-900"
                    >
                        <LogOut className="size-5" /> Sair do sistema
                    </Link>
                </div>
            </SheetContent>
        </Sheet>
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
    const [search, setSearch] = useState(false);
    const [more, setMore] = useState(false);

    return (
        <div className="bg-background flex min-h-svh flex-col">
            <MenuBar onSearch={() => setSearch((s) => !s)} onMore={() => setMore(true)} />
            {search && <MobileSearch onClose={() => setSearch(false)} />}
            <div className="no-print md:sticky md:top-10 md:z-20 md:border-b md:border-[#d7dade] md:bg-[#f6f7f8] dark:md:border-zinc-800 dark:md:bg-zinc-900">
                <div className="flex flex-col gap-3 px-4 pt-5 pb-3 md:min-h-11 md:flex-row md:flex-wrap md:items-center md:gap-x-4 md:gap-y-2 md:px-4 md:py-1.5">
                    <h1 className="flex min-w-0 items-center gap-2.5">
                        <span className="hidden h-5 w-1 shrink-0 rounded-full bg-[#d42a2a] md:block" />
                        {code && <span className="text-muted-foreground hidden font-mono text-[11px] md:inline">{code}</span>}
                        <span className="text-[22px] leading-tight font-extrabold tracking-tight md:truncate md:text-[15px] md:font-bold">
                            {title}
                        </span>
                    </h1>
                    {toolbar && (
                        // celular: as ferramentas ficam numa linha que desliza para o lado (nada de botões quebrando em várias linhas)
                        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 *:shrink-0 md:mx-0 md:ml-auto md:flex-wrap md:gap-1.5 md:overflow-visible md:px-0 md:pb-0">
                            {toolbar}
                        </div>
                    )}
                </div>
            </div>
            <main className="flex-1 px-4 pt-1 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-3 md:pb-10">{children}</main>
            <StatusBar />
            <BottomNav
                onSearch={() => {
                    setSearch(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onMore={() => setMore(true)}
            />
            <MoreSheet open={more} onOpenChange={setMore} />
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
        'inline-flex h-11 items-center gap-1.5 rounded-xl border px-3.5 text-[14px] font-semibold whitespace-nowrap transition select-none md:h-8 md:rounded-md md:px-2.5 md:text-[13px]',
        primary
            ? 'border-[#c42525] bg-[#d42a2a] text-white shadow-sm hover:bg-[#c02424]'
            : danger
              ? 'border-[#dfe2e6] bg-white text-[#b51f1f] hover:bg-red-50 md:border-[#c9cdd3]'
              : 'border-[#dfe2e6] bg-white text-zinc-800 hover:bg-zinc-50 md:border-[#c9cdd3] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100',
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
        <section
            className={cn(
                'bg-card @container overflow-hidden rounded-xl border border-[#e4e6ea] shadow-[0_1px_2px_rgba(15,16,18,0.04)] md:rounded-lg md:border-[#d7dade] dark:border-zinc-800',
                className,
            )}
        >
            {(title || actions) && (
                <header className="flex min-h-11 items-center justify-between gap-2 border-b border-[#eceef1] px-4 md:min-h-9 md:bg-[#f7f8f9] md:px-3 dark:border-zinc-800 dark:md:bg-zinc-800/60">
                    <h2 className="text-[12px] font-bold tracking-wider text-zinc-700 uppercase dark:text-zinc-200">{title}</h2>
                    {actions && <div className="flex items-center gap-1.5">{actions}</div>}
                </header>
            )}
            <div className={cn('p-4 md:p-3', bodyClassName)}>{children}</div>
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
                'flex min-h-11 min-w-0 items-center rounded-lg border border-[#e4e6ea] bg-[#f6f7f8] px-3 text-[15px] md:min-h-8 md:rounded-md md:border-[#d7dade] md:px-2.5 md:text-[13px] dark:border-zinc-700 dark:bg-zinc-800',
                className,
            )}
        >
            <span className="truncate">{children ?? <span className="text-zinc-400">—</span>}</span>
        </div>
    );
}

export const selectCls =
    'h-11 w-full rounded-lg border border-input bg-card px-2.5 text-base md:h-8 md:rounded-md md:px-2 md:text-[13px] focus-visible:border-[#d42a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d42a2a]/20';
export const textareaCls =
    'w-full rounded-lg border border-input bg-card px-3 py-2 text-base leading-relaxed md:rounded-md md:px-2.5 md:text-[13px] focus-visible:border-[#d42a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d42a2a]/20';

export function Tabs<T extends string>({
    tabs,
    value,
    onChange,
}: {
    /** locked: etapa ainda não liberada (fica apagada e não abre) */
    tabs: { value: T; label: string; badge?: ReactNode; locked?: boolean }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="flex gap-1 overflow-x-auto border-b border-[#e4e6ea] dark:border-zinc-800">
            {tabs.map((t) => (
                <button
                    key={t.value}
                    type="button"
                    onClick={() => !t.locked && onChange(t.value)}
                    disabled={t.locked}
                    title={t.locked ? 'Conclua a etapa anterior para liberar' : undefined}
                    aria-current={value === t.value ? 'true' : undefined}
                    className={cn(
                        'relative flex h-12 shrink-0 items-center gap-1.5 px-3 text-[14px] font-semibold whitespace-nowrap md:h-9 md:text-[13px]',
                        t.locked
                            ? 'cursor-not-allowed text-zinc-400 opacity-40'
                            : value === t.value
                              ? 'text-zinc-900 after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t-[3px] after:bg-[#d42a2a] dark:text-white'
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white',
                    )}
                >
                    {t.locked && <Lock className="size-3.5" />}
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
                'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold whitespace-nowrap ring-1 ring-inset md:h-5 md:px-2 md:text-[11px]',
                s.badge,
                className,
            )}
        >
            <span className={cn('size-1.5 rounded-full', s.dot)} />
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

/**
 * Linha da grade no celular quando a tela não define a sua: a 1ª coluna vira o título e as
 * demais (só as que não estão marcadas para sumir em telas médias) viram pares "rótulo: valor".
 */
function AutoMobileRow<T>({ cols, row }: { cols: Col<T>[]; row: T }) {
    const shown = cols.filter((c) => c.hide !== 'md' && c.hide !== 'lg');
    const [head, ...rest] = shown;
    const labeled = rest.filter((c) => c.label);
    const actions = rest.filter((c) => !c.label);
    return (
        <div className="grid gap-2">
            {head && <div className="text-[15px] font-semibold">{head.render(row)}</div>}
            {labeled.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {labeled.map((c, i) => (
                        <div key={i} className="min-w-0">
                            <dt className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase">{c.label}</dt>
                            <dd className={cn('min-w-0 truncate text-[14px]', c.align === 'right' && 'tabular-nums')}>{c.render(row)}</dd>
                        </div>
                    ))}
                </dl>
            )}
            {actions.map((c, i) => (
                <div key={i} className="flex flex-wrap gap-2">
                    {c.render(row)}
                </div>
            ))}
        </div>
    );
}

export function Grid<T>({
    cols,
    rows,
    rowKey,
    onRowClick,
    empty = 'Nenhum registro encontrado.',
    footer,
    mobile,
}: {
    cols: Col<T>[];
    rows: T[];
    rowKey: (r: T) => string | number;
    onRowClick?: (r: T) => void;
    empty?: string;
    footer?: ReactNode;
    /** Como cada linha aparece no celular (senão, monta sozinho a partir das colunas). */
    mobile?: (r: T) => ReactNode;
}) {
    return (
        <div>
            {/* celular: lista no lugar da tabela espremida */}
            <ul className="md:hidden">
                {rows.length === 0 && <li className="text-muted-foreground px-4 py-8 text-center text-[15px]">{empty}</li>}
                {rows.map((r) => (
                    <li
                        key={rowKey(r)}
                        onClick={onRowClick ? () => onRowClick(r) : undefined}
                        className={cn(
                            'border-b border-[#eceef1] px-4 py-3 last:border-b-0 dark:border-zinc-800',
                            onRowClick && 'cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800',
                        )}
                    >
                        {mobile ? mobile(r) : <AutoMobileRow cols={cols} row={r} />}
                    </li>
                ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                        <tr className="border-b border-[#d7dade] bg-[#f3f4f6] dark:border-zinc-700 dark:bg-zinc-800">
                            {cols.map((c, i) => (
                                <th
                                    key={i}
                                    className={cn(
                                        'h-8 border-r border-[#e3e5e8] px-2.5 text-left text-[11px] font-bold tracking-wide whitespace-nowrap text-zinc-600 uppercase last:border-r-0 dark:border-zinc-700 dark:text-zinc-300',
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
                                    'border-b border-[#eceef1] even:bg-[#fafafb] dark:border-zinc-800 dark:even:bg-zinc-900/60',
                                    onRowClick && 'cursor-pointer hover:bg-[#fdf0f0] dark:hover:bg-red-950/30',
                                )}
                            >
                                {cols.map((c, i) => (
                                    <td
                                        key={i}
                                        className={cn(
                                            'h-9 border-r border-[#f0f1f3] px-2.5 align-middle last:border-r-0 dark:border-zinc-800',
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
            </div>
            {footer && (
                <div className="flex items-center justify-between gap-2 border-t border-[#eceef1] bg-[#fafafb] px-4 py-2 text-[12px] text-zinc-600 md:px-3 md:py-1.5 dark:border-zinc-700 dark:bg-zinc-800">
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
            className={cn(
                'inline-flex items-center gap-1 text-[12px] whitespace-nowrap tabular-nums md:text-[11px]',
                s.stale ? 'font-bold text-[#b51f1f]' : 'text-zinc-500',
                className,
            )}
            title="Tempo nesta etapa"
        >
            {s.stale && <AlertTriangle className="size-3.5 shrink-0" aria-label="parado demais" />}
            {s.text}
        </span>
    );
}

export function OriginTag({ origin }: { origin: string }) {
    if (origin === 'balcao') return null;
    return (
        <span
            className="rounded-[5px] bg-emerald-50 px-1.5 py-px text-[10px] font-extrabold tracking-wide text-emerald-800 uppercase ring-1 ring-emerald-200 ring-inset"
            title="Agendamento feito pelo cliente"
        >
            {origin === 'bot' ? 'bot' : 'site'}
        </span>
    );
}

/** Placa em fonte mono, com a faixa azul do padrão Mercosul. */
export function Placa({ value, big = false }: { value?: string | null; big?: boolean }) {
    const v = value && /^[A-Z]{3}\d{4}$/.test(value) ? `${value.slice(0, 3)}-${value.slice(3)}` : value;
    return (
        <span
            className={cn(
                'inline-flex shrink-0 flex-col overflow-hidden border-zinc-900 bg-white align-middle font-mono leading-none font-bold tracking-wider text-zinc-900 dark:border-zinc-300',
                big ? 'rounded-md border-2' : 'rounded-[5px] border-[1.5px]',
            )}
        >
            <span className={cn('bg-[#1f4fa3]', big ? 'h-1.5' : 'h-[3px]')} />
            <span className={big ? 'px-2.5 py-1 text-[20px]' : 'px-1.5 py-[3px] text-[12px]'}>{v || '—'}</span>
        </span>
    );
}

/**
 * Linha de OS para as listas do celular: placa, nº e etiquetas em cima; carro e cliente;
 * à direita a etapa, o valor (quando houver) e há quanto tempo está parada.
 */
export function OsMobileRow({ os, when }: { os: OsCard; when?: ReactNode }) {
    return (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
            <span className="flex min-w-0 items-center gap-2">
                {os.vehicle?.plate ? <Placa value={os.vehicle.plate} /> : <span className="text-[12px] font-semibold text-zinc-500">sem placa</span>}
                <b className="text-[12px] text-zinc-600 tabular-nums">{os.number}</b>
                <OriginTag origin={os.origin} />
                {os.online_new && <span className="rounded-[5px] bg-[#d42a2a] px-1.5 py-px text-[10px] font-extrabold text-white">NOVO</span>}
            </span>
            <span className="justify-self-end">
                <Situacao status={os.status} short />
            </span>
            <span className="min-w-0">
                <span className="block truncate text-[15px] font-bold">{os.vehicle?.title || 'Veículo'}</span>
                <span className="block truncate text-[13px] text-zinc-600 dark:text-zinc-400">
                    {os.client?.name}
                    {os.mechanic ? ` · ${os.mechanic.name}` : ''}
                </span>
            </span>
            <span className="flex flex-col items-end gap-0.5">
                {!!os.total && <span className="text-[14px] font-bold tabular-nums">{money(os.total)}</span>}
                {when ?? <Since iso={os.status_since} status={os.status} />}
            </span>
        </div>
    );
}
