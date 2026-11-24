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
    notes: string | null;
    overdue: boolean;
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

export function situation(r: Pick<FinanceRow, 'paid_at' | 'overdue' | 'type'>) {
    if (r.paid_at) return { label: r.type === 'entrada' ? 'Recebido' : 'Pago', cls: 'bg-green-50 text-green-800 ring-green-300' };
    if (r.overdue) return { label: 'Vencido', cls: 'bg-red-50 text-red-800 ring-red-300' };
    return { label: r.type === 'entrada' ? 'A receber' : 'A pagar', cls: 'bg-amber-50 text-amber-900 ring-amber-300' };
}
