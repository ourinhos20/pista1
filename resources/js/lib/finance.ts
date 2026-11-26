export type EntryType = 'entrada' | 'saida';

export interface FinanceRow {
    id: number;
    type: EntryType;
    category: string;
    category_label: string;
    description: string;
    party: string | null;
    amount: number;
    due_date: string;
    paid_at: string | null;
    payment_method: string | null;
    installment: number | null;
    installments: number | null;
    service_order_id: number | null;
    os_number: string | null;
    purchase_id: number | null;
    paid_by: string | null;
    notes: string | null;
    overdue: boolean;
}

/** OS com valor a receber, para vincular a uma entrada. */
export interface OsToReceive {
    id: number;
    number: string;
    status: string;
    status_label: string;
    client: string | null;
    vehicle: string;
    total: number;
    billed: number;
    remaining: number;
}

export type Parties = Record<EntryType, string[]>;
export type PartnerOption = { id: number; name: string };

/** Listas usadas pelo formulário de lançamento (vêm do servidor em todas as telas do financeiro). */
export interface EntryOptions {
    categories: Categories;
    methods: Methods;
    parties: Parties;
    orders: OsToReceive[];
    partnerList: PartnerOption[];
}

export type Categories = Record<EntryType, Record<string, string>>;
export type Methods = Record<string, string>;

/** "2026-11-24" -> "24/11/2026" sem problema de fuso. */
export function dateBr(d?: string | null) {
    if (!d) return '—';
    const [y, m, day] = d.slice(0, 10).split('-');
    return `${day}/${m}/${y}`;
}

export function monthLabel(ym: string) {
    const [y, m] = ym.split('-').map(Number);
    const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
}

export function todayIso() {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 1234.5 -> "1234,50" para o campo de valor. */
export const moneyInput = (v: number) => v.toFixed(2).replace('.', ',');

export function situation(r: Pick<FinanceRow, 'paid_at' | 'overdue' | 'type'>) {
    if (r.paid_at) return { label: r.type === 'entrada' ? 'Recebido' : 'Pago', cls: 'bg-green-50 text-green-800 ring-green-300' };
    if (r.overdue) return { label: 'Vencido', cls: 'bg-red-50 text-red-800 ring-red-300' };
    return { label: r.type === 'entrada' ? 'A receber' : 'A pagar', cls: 'bg-amber-50 text-amber-900 ring-amber-300' };
}
