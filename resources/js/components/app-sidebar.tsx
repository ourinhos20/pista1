import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type Role, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ClipboardList, LayoutGrid, PlusCircle, UserCog, Users, Wrench } from 'lucide-react';
import AppLogo from './app-logo';

export function navFor(role: Role): NavItem[] {
    if (role === 'mecanico') {
        return [{ title: 'Minhas OS', url: '/mecanico', icon: Wrench }];
    }
    const items: NavItem[] = [
        { title: 'Painel', url: '/dashboard', icon: LayoutGrid },
        { title: 'Nova OS', url: '/os/nova', icon: PlusCircle },
        { title: 'Ordens de serviço', url: '/os', icon: ClipboardList },
        { title: 'Clientes', url: '/clientes', icon: Users },
        { title: 'Oficina (mecânicos)', url: '/mecanico', icon: Wrench },
    ];
    if (role === 'master') {
        items.push({ title: 'Usuários', url: '/usuarios', icon: UserCog });
    }
    return items;
}

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const home = auth.user.role === 'mecanico' ? '/mecanico' : '/dashboard';

    return (
        <Sidebar collapsible="icon" variant="sidebar" className="dark">
            <SidebarHeader className="px-3 pt-4 pb-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild className="h-14 hover:bg-transparent">
                            <Link href={home} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="pt-2">
                <NavMain items={navFor(auth.user.role)} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
