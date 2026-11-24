import { Box, Line, PrintShell, Signatures } from '@/components/print-sheet';
import { PAYMENT, documentFmt, km, money, phone, plate } from '@/lib/os';
import type { OsFull, Shop } from '@/types';

/** Ficha que o cliente leva: orçamento / OS com valores. */
export default function PrintCliente({ os, shop }: { os: OsFull; shop: Shop }) {
    const c = os.client;
    const v = os.vehicle;
    const rows = Math.max(9, os.items.length);
    // Pagamentos reais registrados na OS (financeiro)
    const paid = os.paid_total ?? 0;
    const remaining = Math.max(0, (os.total ?? 0) - paid);
    const methods = [...new Set((os.payments ?? []).map((p) => (p.payment_method ? PAYMENT[p.payment_method] : '')).filter(Boolean))].join(', ');
    const parcelas = (os.payments ?? []).find((p) => p.installments)?.installments;

    return (
        <PrintShell title={os.approved_at ? 'Ordem de Serviço' : 'Orçamento'} os={os} shop={shop}>
            <Box label="Dados Pessoais">
                <div className="grid gap-2">
                    <div className="grid grid-cols-[3fr_2fr] gap-4">
                        <Line label="Nome" value={c?.name} />
                        <Line label="Fone" value={phone(c?.phone)} />
                    </div>
                    <Line label="End" value={c?.address} />
                    <div className="grid grid-cols-2 gap-4">
                        <Line label="Cidade" value={c?.city} />
                        <Line label="CPF/CNPJ" value={documentFmt(c?.document)} />
                    </div>
                </div>
            </Box>

            <Box label="Dados do Veículo">
                <div className="grid gap-2">
                    <div className="grid grid-cols-[2fr_2fr_1fr] gap-4">
                        <Line label="Veículo" value={v?.model} />
                        <Line label="Marca" value={v?.brand} />
                        <Line label="Ano" value={v?.year} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Line label="Cor" value={v?.color} />
                        <Line label="Placa" value={<b className="font-mono tracking-wider">{plate(v?.plate)}</b>} />
                        <Line label="Km" value={km(os.km_in)} />
                    </div>
                </div>
            </Box>

            <section className="overflow-hidden rounded-[12px] border-[2.5px] border-black">
                <table className="w-full border-collapse text-[12.5px]">
                    <thead>
                        <tr className="border-b-[1.5px] border-black text-[13px] font-bold">
                            <th className="w-[14%] border-r-[1.5px] border-black py-1.5">Qtd.</th>
                            <th className="border-r-[1.5px] border-black py-1.5">Descrição Produto / Serviço</th>
                            <th className="w-[16%] border-r-[1.5px] border-black py-1.5">Valor un.</th>
                            <th className="w-[16%] py-1.5">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }).map((_, i) => {
                            const it = os.items[i];
                            return (
                                <tr key={i} className="h-[7.5mm] border-b border-black">
                                    <td className="border-r-[1.5px] border-black text-center tabular-nums">{it ? it.quantity.toLocaleString('pt-BR') : ''}</td>
                                    <td className="border-r-[1.5px] border-black px-2">{it?.description}</td>
                                    <td className="border-r-[1.5px] border-black px-2 text-right tabular-nums">{it ? money(it.unit_price) : ''}</td>
                                    <td className="px-2 text-right tabular-nums">{it ? money(it.total) : ''}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div className="flex items-center justify-end gap-6 px-4 py-2">
                    {!!os.discount && <span className="text-[12.5px]">Desconto: {money(os.discount)}</span>}
                    <span className="text-[16px] font-extrabold">Valor Total: {money(os.total)}</span>
                </div>
            </section>

            <Box>
                <div className="grid grid-cols-3 gap-6">
                    <Line label="Pago" value={paid ? money(paid) : ''} />
                    <Line label="Restante" value={paid ? money(remaining) : ''} />
                    <Line label="Pagamento" value={methods ? `${methods}${parcelas ? ` (${parcelas}x)` : ''}` : ''} />
                </div>
            </Box>

            <Box>
                <Line label="Observações" value={os.notes} />
                <div className="mt-2 h-[7mm] border-b border-black" />
            </Box>

            <Signatures left="Assinatura Cliente" />
        </PrintShell>
    );
}
