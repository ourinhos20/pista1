import { ErpLayout } from '@/components/erp';
import { type BreadcrumbItem } from '@/types';
import type { ReactNode } from 'react';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    title?: string;
    code?: string;
    toolbar?: ReactNode;
}

/** Layout padrão do sistema (estilo ERP). */
export default function AppLayout({ children, breadcrumbs, title, code, toolbar }: AppLayoutProps) {
    return (
        <ErpLayout title={title ?? breadcrumbs?.[breadcrumbs.length - 1]?.title ?? 'Pista 1'} code={code} toolbar={toolbar}>
            {children}
        </ErpLayout>
    );
}
