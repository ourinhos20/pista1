export type RevisionValue = 'ok' | 'atencao' | 'trocar';

export const REVISION_VALUES: { value: RevisionValue; label: string; short: string; cls: string }[] = [
    { value: 'ok', label: 'OK', short: 'OK', cls: 'bg-green-600 text-white border-green-700' },
    { value: 'atencao', label: 'Atenção', short: 'ATN', cls: 'bg-amber-400 text-black border-amber-500' },
    { value: 'trocar', label: 'Trocar', short: 'TRC', cls: 'bg-red-600 text-white border-red-700' },
];

/** Itens do checklist de revisão completa (mesma lista no celular e na ficha impressa). */
export const REVISION_GROUPS: { title: string; items: { key: string; label: string }[] }[] = [
    {
        title: 'Motor',
        items: [
            { key: 'oleo_motor', label: 'Óleo do motor' },
            { key: 'filtro_oleo', label: 'Filtro de óleo' },
            { key: 'filtro_ar', label: 'Filtro de ar' },
            { key: 'filtro_comb', label: 'Filtro de combustível' },
            { key: 'velas', label: 'Velas de ignição' },
            { key: 'bobinas', label: 'Cabos / bobinas' },
            { key: 'correia_dentada', label: 'Correia dentada' },
            { key: 'correia_acess', label: 'Correia de acessórios' },
            { key: 'vazamentos', label: 'Vazamentos' },
        ],
    },
    {
        title: 'Arrefecimento',
        items: [
            { key: 'liquido_arref', label: 'Nível do líquido' },
            { key: 'mangueiras', label: 'Mangueiras' },
            { key: 'radiador', label: 'Radiador' },
            { key: 'ventoinha', label: 'Ventoinha' },
            { key: 'bomba_agua', label: 'Bomba d’água' },
        ],
    },
    {
        title: 'Freios',
        items: [
            { key: 'pastilhas_diant', label: 'Pastilhas dianteiras' },
            { key: 'discos_diant', label: 'Discos dianteiros' },
            { key: 'lonas_tras', label: 'Lonas / pastilhas traseiras' },
            { key: 'tambores_tras', label: 'Tambores / discos traseiros' },
            { key: 'fluido_freio', label: 'Fluido de freio' },
            { key: 'freio_mao', label: 'Freio de mão' },
        ],
    },
    {
        title: 'Suspensão e direção',
        items: [
            { key: 'amort_diant', label: 'Amortecedores dianteiros' },
            { key: 'amort_tras', label: 'Amortecedores traseiros' },
            { key: 'bandejas', label: 'Bandejas / buchas' },
            { key: 'pivos', label: 'Pivôs' },
            { key: 'terminais', label: 'Terminais de direção' },
            { key: 'bieletas', label: 'Bieletas' },
            { key: 'coifas', label: 'Coifas / homocinéticas' },
            { key: 'caixa_direcao', label: 'Caixa de direção' },
        ],
    },
    {
        title: 'Elétrica',
        items: [
            { key: 'bateria', label: 'Bateria' },
            { key: 'alternador', label: 'Alternador / carga' },
            { key: 'motor_partida', label: 'Motor de partida' },
            { key: 'farois', label: 'Faróis' },
            { key: 'lanternas', label: 'Lanternas / luz de freio' },
            { key: 'setas', label: 'Setas / pisca-alerta' },
            { key: 'painel', label: 'Painel / luzes de alerta' },
        ],
    },
    {
        title: 'Pneus e rodas',
        items: [
            { key: 'calibragem', label: 'Calibragem' },
            { key: 'desgaste_pneus', label: 'Desgaste dos pneus' },
            { key: 'estepe', label: 'Estepe' },
            { key: 'alinhamento', label: 'Alinhamento / balanceamento' },
        ],
    },
    {
        title: 'Outros',
        items: [
            { key: 'embreagem', label: 'Embreagem' },
            { key: 'oleo_cambio', label: 'Câmbio (óleo)' },
            { key: 'escapamento', label: 'Escapamento' },
            { key: 'ar_cond', label: 'Ar-condicionado' },
            { key: 'filtro_cabine', label: 'Filtro de cabine' },
            { key: 'palhetas', label: 'Palhetas do limpador' },
            { key: 'agua_limpador', label: 'Água do limpador' },
        ],
    },
];

export const REVISION_TOTAL = REVISION_GROUPS.reduce((s, g) => s + g.items.length, 0);
