import { BlankLines, Box, Line, PrintShell, Signatures } from '@/components/print-sheet';
import { FUEL, km, plate } from '@/lib/os';
import type { OsFull, Shop } from '@/types';

/** Ficha do mecânico: sem dados sensíveis do cliente nem valores. */
export default function PrintDiagnostico({ os, shop }: { os: OsFull; shop: Shop }) {
    const v = os.vehicle;
    const rows = Math.max(7, os.items.length + 2);
    const firstName = os.client?.name?.split(' ')[0];

    return (
        <PrintShell title="Ficha de Diagnóstico" os={os} shop={shop}>
            <Box label="Dados do Veículo">
                <div className="grid gap-2">
                    <div className="grid grid-cols-[2fr_2fr_1fr] gap-4">
                        <Line label="Veículo" value={v?.model} />
                        <Line label="Marca" value={v?.brand} />
                        <Line label="Ano" value={v?.year} />
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                        <Line label="Placa" value={<b className="font-mono tracking-wider">{plate(v?.plate)}</b>} />
                        <Line label="Cor" value={v?.color} />
                        <Line label="Km" value={os.km_in ? km(os.km_in) : ''} />
                        <Line label="Comb." value={os.fuel_level !== null ? FUEL[os.fuel_level] : ''} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Line label="Cliente" value={firstName} />
                        <Line label="Mecânico" value={os.mechanic?.name} />
                    </div>
                </div>
            </Box>

            <Box label="Solicitação do cliente">
                <BlankLines n={os.complaint ? 2 : 4} text={os.complaint} />
            </Box>

            <Box label="Diagnóstico">
                <BlankLines n={os.diagnosis ? 3 : 5} text={os.diagnosis} />
            </Box>

            <section className="overflow-hidden rounded-[12px] border-[2.5px] border-black">
                <table className="w-full border-collapse text-[12.5px]">
                    <thead>
                        <tr className="border-b-[1.5px] border-black text-[13px] font-bold">
                            <th className="w-[14%] border-r-[1.5px] border-black py-1.5">Qtd.</th>
                            <th className="border-r-[1.5px] border-black py-1.5">Descrição Produto / Serviço</th>
                            <th className="w-[12%] py-1.5">Feito</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }).map((_, i) => {
                            const it = os.items[i];
                            return (
                                <tr key={i} className="h-[7.5mm] border-b border-black last:border-b-0">
                                    <td className="border-r-[1.5px] border-black text-center tabular-nums">{it ? it.quantity.toLocaleString('pt-BR') : ''}</td>
                                    <td className="border-r-[1.5px] border-black px-2">
                                        {it && (
                                            <>
                                                <span className="mr-1.5 text-[10px] font-bold uppercase">{it.type === 'peca' ? 'Peça' : 'Serv.'}</span>
                                                {it.description}
                                            </>
                                        )}
                                    </td>
                                    <td className="text-center">
                                        <span className="inline-block size-[13px] rounded-[3px] border-[1.5px] border-black align-middle" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>

            <Signatures left="Mecânico Responsável" />
        </PrintShell>
    );
}
