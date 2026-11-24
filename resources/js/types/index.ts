import { LucideIcon } from 'lucide-react';

export type Role = 'master' | 'balcao' | 'mecanico';

export interface Auth {
    user: User;
    can: { sensitive: boolean; master: boolean };
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    auth: Auth;
    flash: { success?: string | null; error?: string | null };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: Role;
    avatar?: string;
    [key: string]: unknown; // This allows for additional properties...
}

export type OsStatus = 'aguardando' | 'diagnostico' | 'aprovacao' | 'execucao' | 'pronto' | 'entregue' | 'cancelada';

export interface ClientData {
    id: number;
    name: string;
    document?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    notes?: string | null;
}

export interface VehicleData {
    id: number;
    client_id: number;
    plate: string;
    brand?: string | null;
    model?: string | null;
    year?: string | null;
    engine?: string | null;
    color?: string | null;
    km?: number | null;
    title: string;
}

export type DamageType = 'risco' | 'amassado' | 'quebrado' | 'falta';

export type Damage = {
    x: number;
    y: number;
    type: DamageType;
    note?: string | null;
}

export interface OsItem {
    id: number;
    type: 'servico' | 'peca';
    description: string;
    quantity: number;
    unit_price?: number;
    total?: number;
}

export interface OsCard {
    id: number;
    number: string;
    status: OsStatus;
    scheduled_at: string | null;
    created_at: string | null;
    complaint: string | null;
    km_in: number | null;
    client: ClientData | null;
    vehicle: VehicleData | null;
    mechanic: { id: number; name: string } | null;
    total?: number;
}

export interface OsEvent {
    id: number;
    status: OsStatus | null;
    note: string | null;
    user: string | null;
    created_at: string;
}

export interface OsFull extends OsCard {
    fuel_level: number | null;
    diagnosis: string | null;
    notes: string | null;
    damages: Damage[];
    checklist: Record<string, boolean>;
    approved_at: string | null;
    delivered_at: string | null;
    items: OsItem[];
    events: OsEvent[];
    subtotal?: number;
    discount?: number;
    down_payment?: number;
    payment_method?: string | null;
}

export interface Shop {
    name: string;
    phone: string;
    instagram: string;
    address: string;
    document: string;
    terms: string;
}
