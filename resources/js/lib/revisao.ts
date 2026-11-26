export type RevisionValue = 'ok' | 'atencao' | 'trocar';

/**
 * Critério de marcação (o mesmo no celular e na ficha impressa).
 * Item em branco = não verificado ou não se aplica a este carro.
 */
export const REVISION_VALUES: { value: RevisionValue; label: string; short: string; cls: string; rule: string }[] = [
    { value: 'ok', label: 'OK', short: 'OK', cls: 'bg-green-600 text-white border-green-700', rule: 'verificado e em bom estado' },
    {
        value: 'atencao',
        label: 'Atenção',
        short: 'ATN',
        cls: 'bg-amber-400 text-black border-amber-500',
        rule: 'ainda funciona, mas está perto do limite: avisar o cliente e trocar na próxima (ex.: pastilha abaixo de 30%, pneu perto do TWI, bateria fraca)',
    },
    {
        value: 'trocar',
        label: 'Trocar',
        short: 'TRC',
        cls: 'bg-red-600 text-white border-red-700',
        rule: 'gasto, vazando, com defeito ou vencido pelo km/tempo do fabricante: entra no orçamento',
    },
];

/**
 * Itens do checklist de revisão / preventiva (mesma lista no celular e na ficha impressa).
 * As chaves antigas foram mantidas para não perder o que já foi marcado nas OS.
 */
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
            { key: 'correia_acess', label: 'Correia acessórios' },
            { key: 'tbi', label: 'Corpo borboleta (TBI)' },
            { key: 'coxins', label: 'Coxins do motor' },
            { key: 'vazamentos', label: 'Vazamentos de óleo' },
            { key: 'scanner', label: 'Scanner (falhas)' },
        ],
    },
    {
        title: 'Arrefecimento',
        items: [
            { key: 'liquido_arref', label: 'Líquido / aditivo' },
            { key: 'mangueiras', label: 'Mangueiras / reserv.' },
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
            { key: 'lonas_tras', label: 'Lonas/pastilhas tras.' },
            { key: 'tambores_tras', label: 'Tambores/discos tras.' },
            { key: 'fluido_freio', label: 'Fluido de freio' },
            { key: 'flexiveis', label: 'Flexíveis / tubos' },
            { key: 'freio_mao', label: 'Freio de mão' },
        ],
    },
    {
        title: 'Suspensão e direção',
        items: [
            { key: 'amort_diant', label: 'Amortec. dianteiros' },
            { key: 'amort_tras', label: 'Amortec. traseiros' },
            { key: 'bandejas', label: 'Bandejas / buchas' },
            { key: 'pivos', label: 'Pivôs' },
            { key: 'terminais', label: 'Terminais e axiais' },
            { key: 'bieletas', label: 'Bieletas' },
            { key: 'rolamentos', label: 'Rolamentos de roda' },
            { key: 'caixa_direcao', label: 'Caixa de direção' },
            { key: 'fluido_direcao', label: 'Fluido direção hidr.' },
        ],
    },
    {
        title: 'Elétrica',
        items: [
            { key: 'bateria', label: 'Bateria (teste)' },
            { key: 'alternador', label: 'Alternador / carga' },
            { key: 'farois', label: 'Faróis (baixo e alto)' },
            { key: 'lanternas', label: 'Lanternas, freio e ré' },
            { key: 'setas', label: 'Setas / pisca-alerta' },
            { key: 'buzina', label: 'Buzina' },
            { key: 'painel', label: 'Luzes do painel' },
        ],
    },
    {
        title: 'Pneus e rodas',
        items: [
            { key: 'calibragem', label: 'Calibragem + estepe' },
            { key: 'desgaste_pneus', label: 'Desgaste dos pneus' },
            { key: 'estepe', label: 'Estado do estepe' },
            { key: 'alinhamento', label: 'Alinham. / balanc.' },
        ],
    },
    {
        title: 'Transmissão e escape',
        items: [
            { key: 'embreagem', label: 'Embreagem' },
            { key: 'oleo_cambio', label: 'Óleo do câmbio' },
            { key: 'coifas', label: 'Coifas e juntas' },
            { key: 'escapamento', label: 'Escapamento' },
        ],
    },
    {
        title: 'Conforto e visibilidade',
        items: [
            { key: 'ar_cond', label: 'Ar-condicionado' },
            { key: 'filtro_cabine', label: 'Filtro de cabine' },
            { key: 'palhetas', label: 'Palhetas do limpador' },
            { key: 'agua_limpador', label: 'Água do limpador' },
        ],
    },
];

export const REVISION_TOTAL = REVISION_GROUPS.reduce((s, g) => s + g.items.length, 0);
