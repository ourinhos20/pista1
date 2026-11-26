import { BlankLines, Box, Line, PrintShell, Signatures } from '@/components/print-sheet';
import { km, plate } from '@/lib/os';
import { REVISION_GROUPS, REVISION_VALUES, type RevisionValue } from '@/lib/revisao';
import type { OsFull, Shop } from '@/types';

const MARKS: RevisionValue[] = ['ok', 'atencao', 'trocar'];
const ROW = 'grid grid-cols-[1fr_repeat(3,24px)] items-center gap-1';

/** Cabeçalho das 3 marcações, uma vez por coluna. */
function Head3() {
    return (
        <div className={`${ROW} border-b-[1.5px] border-black pb-0.5 text-center text-[8.5px] font-bold uppercase`}>
            <span />
            <span>OK</span>
            <span>Aten.</span>
            <span>Troca</span>
        </div>
    );
}

/** Checklist de revisão / preventiva: sai em branco ou já marcado com o que foi lançado no sistema. */
export default function PrintRevisao({ os, shop }: { os: OsFull; shop: Shop }) {
    const v = os.vehicle;
    const values = os.revision ?? {};
    // 3 colunas equilibradas para caber numa folha A4
    const by = (...t: string[]) => t.map((title) => REVISION_GROUPS.find((g) => g.title === title)!);
    const cols = [
        by('Motor', 'Pneus e rodas'),
        by('Freios', 'Elétrica', 'Transmissão e escape'),
        by('Suspensão e direção', 'Arrefecimento', 'Conforto e visibilidade'),
    ];
    const preventiva = os.service_type === 'preventiva';

    return (
        <PrintShell title={preventiva ? 'Checklist Preventivo' : 'Checklist de Revisão'} os={os} shop={shop}>
            <Box label="Dados do Veículo">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4">
                    <Line label="Veículo" value={v?.title} />
                    <Line label="Placa" value={<b className="font-mono tracking-wider">{plate(v?.plate)}</b>} />
                    <Line label="Km" value={os.km_in ? km(os.km_in) : ''} />
                    <Line label="Mecânico" value={os.mechanic?.name?.split(' ')[0]} />
                </div>
            </Box>

            {/* critério de marcação: todos marcam do mesmo jeito */}
            <div className="grid grid-cols-3 gap-2 rounded-[8px] bg-zinc-100 px-3 py-1.5 text-[9.5px] leading-snug">
                {REVISION_VALUES.map((r) => (
                    <p key={r.value}>
                        <b className="uppercase">{r.label}:</b> {r.rule}.
                    </p>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
                {cols.map((groups, ci) => (
                    <div key={ci} className="flex flex-col gap-1.5 rounded-[10px] border-[2px] border-black px-2.5 pt-1.5 pb-2">
                        <Head3 />
                        {groups.map((g) => (
                            <section key={g.title}>
                                <h3 className="pt-0.5 text-[11.5px] font-extrabold uppercase">{g.title}</h3>
                                {g.items.map((it) => (
                                    <div key={it.key} className={`${ROW} border-b border-zinc-300 py-[1px] text-[11px] last:border-b-0`}>
                                        <span className="truncate">{it.label}</span>
                                        {MARKS.map((m) => (
                                            <span
                                                key={m}
                                                className="mx-auto inline-grid size-[13px] place-items-center rounded-[3px] border-[1.5px] border-black text-[10px] leading-none font-black"
                                            >
                                                {values[it.key] === m ? '✕' : ''}
                                            </span>
                                        ))}
                                    </div>
                                ))}
                            </section>
                        ))}
                    </div>
                ))}
            </div>

            <Box label="Observações / peças a trocar">
                <BlankLines n={os.diagnosis ? 1 : 2} text={os.diagnosis} />
                <div className="mt-2 grid grid-cols-[1fr_1fr] gap-4">
                    <Line label="Próxima revisão" value={<span className="float-right pr-1 text-zinc-500">km</span>} />
                    <Line label="Data" value={<span className="text-zinc-400">/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/</span>} />
                </div>
            </Box>

            <Signatures left="Mecânico Responsável" />
        </PrintShell>
    );
}
