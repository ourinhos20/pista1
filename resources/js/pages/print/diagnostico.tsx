import { BlankLines, Box, CheckBox, Line, PrintShell, Signatures } from '@/components/print-sheet';
import { FUEL, km, plate } from '@/lib/os';
import type { OsFull, Shop } from '@/types';

/**
 * Ficha do mecânico para defeito/conserto: o que o cliente relatou, o que o mecânico
 * testou e achou, e a lista de peças/serviços que o balcão vai orçar.
 * Impressa depois da aprovação, mostra o que o cliente autorizou (e o que NÃO fazer).
 * Sem dados sensíveis do cliente nem valores.
 */
export default function PrintDiagnostico({ os, shop }: { os: OsFull; shop: Shop }) {
    const v = os.vehicle;
    const rows = Math.max(7, os.items.length + 1);
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

            <Box label="O que o cliente relatou">
                <BlankLines n={os.complaint ? 1 : 3} text={os.complaint} />
            </Box>

            <Box label="Testes e diagnóstico">
                <div className="mb-1.5 grid grid-cols-[1.3fr_1fr] gap-4 text-[12px]">
                    <Line label="Códigos do scanner" />
                    <span className="flex items-end gap-3 font-semibold">
                        Defeito confirmado?
                        <span className="flex items-center gap-1 font-normal">
                            <CheckBox /> Sim
                        </span>
                        <span className="flex items-center gap-1 font-normal">
                            <CheckBox /> Não
                        </span>
                    </span>
                </div>
                <BlankLines n={os.diagnosis ? 2 : 4} text={os.diagnosis} />
            </Box>

            <section className="overflow-hidden rounded-[12px] border-[2.5px] border-black">
                <p className="border-b-[1.5px] border-black px-3 py-1 text-[12px] font-extrabold">Peças e serviços necessários</p>
                <table className="w-full border-collapse text-[12.5px]">
                    <thead>
                        <tr className="border-b-[1.5px] border-black text-[11.5px] font-bold">
                            <th className="w-[11%] border-r-[1.5px] border-black py-1">Qtd.</th>
                            <th className="border-r-[1.5px] border-black py-1">Descrição da peça / serviço</th>
                            <th className="w-[17%] border-r-[1.5px] border-black py-1">Cliente aprovou</th>
                            <th className="w-[10%] py-1">Feito</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }).map((_, i) => {
                            const it = os.items[i];
                            const no = it?.approval === 'recusado';
                            return (
                                <tr key={i} className="h-[7mm] border-b border-black last:border-b-0">
                                    <td className="border-r-[1.5px] border-black text-center tabular-nums">
                                        {it ? it.quantity.toLocaleString('pt-BR') : ''}
                                    </td>
                                    <td className={`border-r-[1.5px] border-black px-2 ${no ? 'text-zinc-400 line-through' : ''}`}>
                                        {it && (
                                            <>
                                                <span className="mr-1.5 text-[10px] font-bold uppercase">
                                                    {it.type === 'peca' ? 'Peça' : 'Serv.'}
                                                </span>
                                                {it.description}
                                            </>
                                        )}
                                    </td>
                                    <td className="border-r-[1.5px] border-black text-center text-[11px] font-bold">
                                        {it?.approval === 'aprovado' ? '✓ SIM' : no ? 'NÃO FAZER' : <CheckBox />}
                                    </td>
                                    <td className="text-center">{!no && <CheckBox />}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>

            <div className="flex items-center gap-4 text-[12px]">
                <span className="font-semibold">Teste de rodagem depois do serviço:</span>
                <span className="flex items-center gap-1">
                    <CheckBox /> OK
                </span>
                <span className="flex items-center gap-1">
                    <CheckBox /> Precisa voltar
                </span>
            </div>

            <Signatures left="Mecânico Responsável" />
        </PrintShell>
    );
}
