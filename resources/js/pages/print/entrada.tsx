import { CarDiagramSvg, DamageLegend } from '@/components/car-diagram';
import { BlankLines, Box, CheckBox, Line, PrintShell, Signatures } from '@/components/print-sheet';
import { DAMAGE, ENTRY_CHECKLIST, FUEL, date, km, phone, plate } from '@/lib/os';
import type { OsFull, Shop } from '@/types';

/** Vistoria de entrada: prova das avarias que o carro já tinha ao chegar. */
export default function PrintEntrada({ os, shop }: { os: OsFull; shop: Shop }) {
    const v = os.vehicle;
    return (
        <PrintShell title="Vistoria de Entrada" os={os} shop={shop}>
            <Box label="Cliente e Veículo">
                <div className="grid gap-2">
                    <div className="grid grid-cols-[3fr_2fr] gap-4">
                        <Line label="Cliente" value={os.client?.name} />
                        <Line label="Fone" value={phone(os.client?.phone)} />
                    </div>
                    <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
                        <Line label="Veículo" value={v?.title} />
                        <Line label="Placa" value={<b className="font-mono tracking-wider">{plate(v?.plate)}</b>} />
                        <Line label="Cor" value={v?.color} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Line label="Km" value={km(os.km_in)} />
                        <Line label="Entrada" value={date(os.created_at, true)} />
                    </div>
                </div>
            </Box>

            <div className="grid grid-cols-[1fr_1.4fr] gap-3">
                <Box label="Combustível">
                    <div className="mt-1 flex items-center justify-between gap-1">
                        {FUEL.map((f, i) => (
                            <span key={f} className="flex flex-col items-center gap-1 text-[11px] font-semibold">
                                <CheckBox checked={os.fuel_level === i} />
                                {f}
                            </span>
                        ))}
                    </div>
                </Box>
                <Box label="Itens no veículo">
                    <div className="mt-1 grid grid-cols-3 gap-x-3 gap-y-1.5 text-[11.5px]">
                        {ENTRY_CHECKLIST.map((c) => (
                            <span key={c.key} className="flex items-center gap-1.5">
                                <CheckBox checked={!!os.checklist?.[c.key]} />
                                {c.label}
                            </span>
                        ))}
                    </div>
                </Box>
            </div>

            <Box label="Avarias na lataria">
                <div className="mb-2 flex flex-wrap gap-4 text-[11px] font-semibold">
                    {Object.values(DAMAGE).map((d) => (
                        <span key={d.letter} className="flex items-center gap-1.5">
                            <span className="grid size-4 place-items-center rounded-full text-[9px] font-black text-white" style={{ background: d.color }}>
                                {d.letter}
                            </span>
                            {d.label}
                        </span>
                    ))}
                </div>
                <div className="text-black">
                    <CarDiagramSvg damages={os.damages} className="mx-auto max-h-[60mm]" />
                </div>
                <div className="mt-2 text-[12px]">
                    <DamageLegend damages={os.damages} />
                </div>
            </Box>

            <Box label="Observações da vistoria">
                <BlankLines n={2} />
            </Box>

            <p className="text-[10.5px] text-zinc-700">
                Declaro que conferi as condições do veículo descritas acima no momento da entrega à oficina, inclusive avarias já existentes na lataria, para-choques,
                vidros e acessórios.
            </p>

            <Signatures left={['Assinatura do Cliente', 'Atendente Pista 1']} />
        </PrintShell>
    );
}
