import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar, navFor } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { FlashToast } from '@/components/flash-toast';
import { isActive } from '@/components/nav-main';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';

/** Barra inferior no celular: ações principais ao alcance do polegar. */
function MobileTabBar() {
    const { auth } = usePage<SharedData>().props;
    const page = usePage();
    const items = navFor(auth.user.role).slice(0, 4);
    if (items.length < 2) return null;

    return (
        <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b0b0d] pb-[env(safe-area-inset-bottom)] md:hidden">
            <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
                {items.map((item) => {
                    const active = isActive(item.url, page.url);
                    return (
                        <li key={item.url}>
                            <Link
                                href={item.url}
                                className={cn('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium', active ? 'text-white' : 'text-zinc-400')}
                            >
                                {item.icon && <item.icon className={cn('size-6', active && 'text-[#ee3c3a]')} />}
                                <span className="truncate">{item.title.replace(' (mecânicos)', '')}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

export default function AppSidebarLayout({ children, breadcrumbs = [] }: { children: React.ReactNode; breadcrumbs?: BreadcrumbItem[] }) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
            <MobileTabBar />
            <FlashToast />
        </AppShell>
    );
}
