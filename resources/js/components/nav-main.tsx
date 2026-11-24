import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export function isActive(url: string, current: string) {
    const path = current.split('?')[0];
    if (url === '/os') return path === '/os' || (/^\/os\/\d+/.test(path));
    return path === url || path.startsWith(url + '/');
}

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarMenu className="gap-1">
                {items.map((item) => {
                    const active = isActive(item.url, page.url);
                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={active}
                                tooltip={item.title}
                                className="h-11 rounded-xl text-[15px] data-[active=true]:bg-white/10 data-[active=true]:font-semibold data-[active=true]:text-white"
                            >
                                <Link href={item.url} prefetch>
                                    {item.icon && <item.icon className={active ? 'text-[#ee3c3a]' : ''} />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
