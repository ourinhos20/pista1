import { BlankLines, Box, Line, PrintShell, Signatures } from '@/components/print-sheet';
import { km, plate } from '@/lib/os';
import type { OsFull, Shop } from '@/types';

const GROUPS: { title: string; items: string[] }[] = [
    { title: 'Motor', items: ['Óleo do motor', 'Filtro de óleo', 'Filtro de ar', 'Filtro de combustível', 'Velas de ignição', 'Cabos / bobinas', 'Correia dentada', 'Correia de acessórios', 'Vazamentos'] },
    { title: 'Arrefecimento', items: ['Nível do líquido', 'Mangueiras', 'Radiador', 'Ventoinha', 'Bomba d’água'] },
    { title: 'Freios', items: ['Pastilhas dianteiras', 'Discos dianteiros', 'Lonas / pastilhas traseiras', 'Tambores / discos traseiros', 'Fluido de freio', 'Freio de mão'] },
    { title: 'Suspensão e direção', items: ['Amortecedores dianteiros', 'Amortecedores traseiros', 'Bandejas / buchas', 'Pivôs', 'Terminais de direção', 'Bieletas', 'Coifas / homocinéticas', 'Caixa de direção'] },
    { title: 'Elétrica', items: ['Bateria', 'Alternador / carga', 'Motor de partida', 'Faróis', 'Lanternas / luz de freio', 'Setas / pisca-alerta', 'Painel / luzes de alerta'] },
    { title: 'Pneus e rodas', items: ['Calibragem', 'Desgaste dos pneus', 'Estepe', 'Alinhamento / balanceamento'] },
    { title: 'Outros', items: ['Embreagem', 'Câmbio (óleo)', 'Escapamento', 'Ar-condicionado', 'Filtro de cabine', 'Palhetas do limpador', 'Água do limpador'] },
];

function Head3() {
    return (
        <div className="grid grid-cols-[1fr_repeat(3,28px)] items-end gap-1 border-b-[1.5px] border-black pb-0.5 text-center text-[8px] font-bold uppercase">
            <span />
            <span>OK</span>
            <span>Aten.</span>
            <span>Troca</span>
        </div>
    );
}

/** Checklist de revisão completa para o mecânico ir marcando. */
export default function PrintRevisao({ os, shop }: { os: OsFull; shop: Shop }) {
    const v = os.vehicle;
    // 3 colunas equilibradas para caber numa folha A4
    const by = (...t: string[]) => GROUPS.filter((g) => t.includes(g.title));
    const cols = [by('Motor', 'Arrefecimento', 'Pneus e rodas'), by('Freios', 'Suspensão e direção'), by('Elétrica', 'Outros')];

    return (
        <PrintShell title="Checklist de Revisão" os={os} shop={shop}>
            <Box label="Dados do Veículo">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4">
                    <Line label="Veículo" value={v?.title} />
                    <Line label="Placa" value={<b className="font-mono tracking-wider">{plate(v?.plate)}</b>} />
                    <Line label="Km" value={km(os.km_in)} />
                    <Line label="Mecânico" value={os.mechanic?.name?.split(' ')[0]} />
                </div>
            </Box>

            <div className="grid grid-cols-3 gap-2.5">
                {cols.map((groups, ci) => (
                    <div key={ci} className="grid content-start gap-3">
                        {groups.map((g) => (
                            <section key={g.title} className="rounded-[10px] border-[2px] border-black px-3 pt-1.5 pb-2">
                                <h3 className="text-[12.5px] font-extrabold">{g.title}</h3>
                                <Head3 />
                                {g.items.map((it) => (
                                    <div key={it} className="grid grid-cols-[1fr_repeat(3,28px)] items-center gap-1 border-b border-zinc-300 py-[2px] text-[11px] last:border-b-0">
                                        <span className="truncate">{it}</span>
                                        {[0, 1, 2].map((k) => (
                                            <span key={k} className="mx-auto inline-block size-[13px] rounded-[3px] border-[1.5px] border-black" />
                                        ))}
                                    </div>
                                ))}
                            </section>
                        ))}
                    </div>
                ))}
            </div>

            <Box label="Observações / peças a trocar">
                <BlankLines n={3} />
            </Box>

            <Signatures left="Mecânico Responsável" />
        </PrintShell>
    );
}
