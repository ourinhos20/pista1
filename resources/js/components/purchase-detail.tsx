import { Tool } from '@/components/erp';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dateBr } from '@/lib/finance';
import { money } from '@/lib/os';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';

export type PurchaseRow = {
    id: number;
    date: string;
    invoice: string | null;
    supplier: string;
    service_order_id: number | null;
    os_number: string | null;
    total: number;
    notes: string | null;
    items: { description: string; quantity: number; unit_cost: number }[];
    entries: { amount: number; due_date: string; paid_at: string | null }[];
    paid: boolean;
    open_amount: number;
};

export function PaidTag({ r }: { r: PurchaseRow }) {
    if (!r.entries.length) return <span className="text-zinc-400">—</span>;
    const overdue = !r.paid && r.entries.some((e) => !e.paid_at && e.due_date < new Date().toISOString().slice(0, 10));
    return (
        <span
            className={cn(
                'rounded-[3px] px-1.5 py-0.5 text-[11px] font-bold uppercase ring-1 ring-inset',
                r.paid ? 'bg-green-50 text-green-800 ring-green-300' : overdue ? 'bg-red-50 text-red-800 ring-red-300' : 'bg-amber-50 text-amber-900 ring-amber-300',
            )}
        >
            {r.paid ? 'Pago' : overdue ? 'Vencido' : 'A pagar'}
        </span>
    );
}

/** Detalhe de uma compra: itens, contas a pagar e exclusão. */
export function PurchaseDetailDialog({ row, onClose }: { row: PurchaseRow | null; onClose: () => void }) {
    return (
        <Dialog open={row !== null} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[92svh] overflow-y-auto rounded-[4px] sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        Compra {row?.invoice ? `NF ${row.invoice}` : ''} · {row?.supplier}
                    </DialogTitle>
                </DialogHeader>
                {row && (
                    <div className="grid gap-3 text-[13px]">
                        <p>
                            {dateBr(row.date)}
                            {row.service_order_id && (
                                <>
                                    {' · '}
                                    <Link href={route('os.show', row.service_order_id)} className="font-semibold text-[#b51f1f] hover:underline">
                                        OS {row.os_number}
                                    </Link>
                                </>
                            )}
                        </p>
                        <table className="w-full">
                            <tbody>
                                {row.items.map((i, k) => (
                                    <tr key={k} className="border-b border-[#e3e5e8]">
                                        <td className="py-1">{i.description}</td>
                                        <td className="py-1 text-right tabular-nums">
                                            {i.quantity.toLocaleString('pt-BR')} × {money(i.unit_cost)}
                                        </td>
                                        <td className="w-28 py-1 text-right font-semibold tabular-nums">{money(i.quantity * i.unit_cost)}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={2} className="py-1.5 font-bold">
                                        Total
                                    </td>
                                    <td className="py-1.5 text-right text-[15px] font-bold tabular-nums">{money(row.total)}</td>
                                </tr>
                            </tbody>
                        </table>
                        <div>
                            <p className="text-[11px] font-bold text-zinc-600 uppercase">Pagamento</p>
                            {row.entries.map((e, k) => (
                                <p key={k} className="flex justify-between border-b border-[#eceef1] py-1">
                                    <span>Vence {dateBr(e.due_date)}</span>
                                    <span className={e.paid_at ? 'text-green-700' : 'text-amber-700'}>{e.paid_at ? `Pago ${dateBr(e.paid_at)}` : 'Em aberto'}</span>
                                    <b className="tabular-nums">{money(e.amount)}</b>
                                </p>
                            ))}
                        </div>
                        {row.notes && <p className="text-muted-foreground">{row.notes}</p>}
                        <div className="flex justify-end">
                            <Tool
                                danger
                                icon={<Trash2 />}
                                label="Excluir compra"
                                onClick={() => confirm('Excluir esta compra e as contas a pagar dela?') && router.delete(route('compras.destroy', row.id), { preserveScroll: true, onSuccess: onClose })}
                            />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
