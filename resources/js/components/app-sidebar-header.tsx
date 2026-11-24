import { Breadcrumbs } from '@/components/breadcrumbs';
import { PlateSearch } from '@/components/plate-search';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    return (
        <header className="no-print bg-background/85 sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b px-4 backdrop-blur md:px-6">
            <SidebarTrigger className="-ml-1 size-11" />
            <div className="hidden min-w-0 flex-1 md:block">
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <PlateSearch className="ml-auto" />
        </header>
    );
}
