import type { DamageType, OsStatus } from '@/types';

export const STATUS: Record<OsStatus, { label: string; short: string; badge: string; dot: string }> = {
    aguardando: {
        label: 'Agendado',
        short: 'Agendado',
        badge: 'bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-600',
        dot: 'bg-zinc-400',
    },
    recebido: {
        label: 'Recebido (aguardando mecânico)',
        short: 'Recebido',
        badge: 'bg-cyan-50 text-cyan-900 ring-cyan-300 dark:bg-cyan-950 dark:text-cyan-200 dark:ring-cyan-700',
        dot: 'bg-cyan-500',
    },
    diagnostico: {
        label: 'Em diagnóstico',
        short: 'Diagnóstico',
        badge: 'bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-800',
        dot: 'bg-blue-500',
    },
    orcamento: {
        label: 'Aguardando orçamento',
        short: 'Orçamento',
        badge: 'bg-violet-50 text-violet-800 ring-violet-300 dark:bg-violet-950 dark:text-violet-200 dark:ring-violet-700',
        dot: 'bg-violet-500',
    },
    aprovacao: {
        label: 'Aguardando aprovação',
        short: 'Aprovação',
        badge: 'bg-amber-50 text-amber-900 ring-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-700',
        dot: 'bg-amber-400',
    },
    pecas: {
        label: 'Aguardando peças',
        short: 'Peças',
        badge: 'bg-fuchsia-50 text-fuchsia-900 ring-fuchsia-300 dark:bg-fuchsia-950 dark:text-fuchsia-200 dark:ring-fuchsia-700',
        dot: 'bg-fuchsia-500',
    },
    execucao: {
        label: 'Em execução',
        short: 'Execução',
        badge: 'bg-orange-50 text-orange-900 ring-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:ring-orange-700',
        dot: 'bg-orange-500',
    },
    pronto: {
        label: 'Pronto',
        short: 'Pronto',
        badge: 'bg-green-50 text-green-800 ring-green-300 dark:bg-green-950 dark:text-green-200 dark:ring-green-700',
        dot: 'bg-green-500',
    },
    entregue: {
        label: 'Entregue',
        short: 'Entregue',
        badge: 'bg-zinc-800 text-white ring-zinc-800 dark:bg-zinc-200 dark:text-zinc-900 dark:ring-zinc-200',
        dot: 'bg-zinc-800 dark:bg-zinc-300',
    },
    cancelada: {
        label: 'Cancelada',
        short: 'Cancelada',
        badge: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-800',
        dot: 'bg-red-500',
    },
};

/** Fluxo da OS, na ordem. "Aguardando peças" só acontece quando precisa comprar. */
export const FLOW: OsStatus[] = ['aguardando', 'recebido', 'diagnostico', 'orcamento', 'aprovacao', 'pecas', 'execucao', 'pronto', 'entregue'];
export const OPEN_STATUSES: OsStatus[] = ['aguardando', 'recebido', 'diagnostico', 'orcamento', 'aprovacao', 'pecas', 'execucao', 'pronto'];

/** Quem faz cada etapa (botão principal da OS). */
const STEPS: Partial<Record<OsStatus, { to: OsStatus; label: string; who: 'todos' | 'balcao' }>> = {
    aguardando: { to: 'recebido', label: 'Cliente chegou', who: 'balcao' },
    recebido: { to: 'diagnostico', label: 'Iniciar atendimento', who: 'todos' },
    diagnostico: { to: 'orcamento', label: 'Enviar para o balcão', who: 'todos' },
    orcamento: { to: 'aprovacao', label: 'Orçamento enviado ao cliente', who: 'balcao' },
    aprovacao: { to: 'execucao', label: 'Cliente aprovou tudo', who: 'balcao' },
    pecas: { to: 'execucao', label: 'Peças chegaram', who: 'balcao' },
    execucao: { to: 'pronto', label: 'Serviço concluído', who: 'todos' },
    pronto: { to: 'entregue', label: 'Entregar ao cliente', who: 'balcao' },
};

export function nextStep(status: OsStatus, role: string) {
    const s = STEPS[status];
    if (!s) return null;
    if (s.who === 'balcao' && role === 'mecanico') return null;
    return s;
}

/** Texto para o mecânico quando a etapa é com o balcão. */
export const WAITING_FOR: Partial<Record<OsStatus, string>> = {
    aguardando: 'Carro ainda não chegou. O balcão libera quando o cliente chegar.',
    orcamento: 'Com o balcão: lançando os valores do orçamento.',
    aprovacao: 'Aguardando o cliente aprovar o orçamento.',
    pecas: 'Aguardando a chegada das peças. Volta para você quando chegarem.',
    pronto: 'Pronto. Aguardando o cliente retirar.',
};

export const ORIGIN: Record<string, string> = { balcao: 'Balcão', site: 'Site', bot: 'Bot WhatsApp' };
export const SERVICE_TYPE: Record<string, string> = { defeito: 'Defeito / conserto', revisao: 'Revisão', preventiva: 'Preventiva', outro: 'Outro' };

/** Minutos parados na etapa a partir dos quais vira alerta (gargalo). */
export const STALE_AFTER: Partial<Record<OsStatus, number>> = {
    recebido: 30,
    diagnostico: 180,
    orcamento: 60,
    aprovacao: 240,
    pecas: 24 * 60,
    pronto: 240,
};

/** "há 25 min", "há 3 h", "há 2 dias" + se passou do limite da etapa. */
export function since(iso: string | null | undefined, status?: OsStatus) {
    if (!iso) return { text: '', stale: false, minutes: 0 };
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    const text = minutes < 1 ? 'agora' : minutes < 60 ? `há ${minutes} min` : minutes < 60 * 24 ? `há ${Math.floor(minutes / 60)} h` : `há ${Math.floor(minutes / 1440)} dia(s)`;
    const limit = status ? STALE_AFTER[status] : undefined;
    return { text, stale: !!limit && minutes > limit, minutes };
}

export const FUEL = ['Reserva', '1/4', '1/2', '3/4', 'Cheio'];

export const DAMAGE: Record<DamageType, { label: string; letter: string; color: string }> = {
    risco: { label: 'Risco', letter: 'R', color: '#2563eb' },
    amassado: { label: 'Amassado', letter: 'A', color: '#ea580c' },
    quebrado: { label: 'Quebrado / trincado', letter: 'Q', color: '#dc2626' },
    falta: { label: 'Faltando peça', letter: 'F', color: '#7c3aed' },
};

export const ENTRY_CHECKLIST: { key: string; label: string }[] = [
    { key: 'documento', label: 'Documento' },
    { key: 'estepe', label: 'Estepe' },
    { key: 'macaco', label: 'Macaco' },
    { key: 'chave_roda', label: 'Chave de roda' },
    { key: 'triangulo', label: 'Triângulo' },
    { key: 'tapetes', label: 'Tapetes' },
    { key: 'som', label: 'Som / multimídia' },
    { key: 'calotas', label: 'Calotas' },
    { key: 'antena', label: 'Antena' },
    { key: 'objetos', label: 'Objetos de valor' },
];

export const PAYMENT: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'Pix',
    debito: 'Cartão de débito',
    credito: 'Cartão de crédito',
    boleto: 'Boleto',
    transferencia: 'Transferência',
    parcelado: 'Parcelado',
};

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const money = (v?: number | null) => brl.format(v ?? 0);

export const km = (v?: number | null) => (v || v === 0 ? `${new Intl.NumberFormat('pt-BR').format(v)} km` : '—');

export function plate(p?: string | null) {
    if (!p) return '';
    // Placa antiga ABC1234 -> ABC-1234; Mercosul ABC1D23 fica sem hífen
    return /^[A-Z]{3}\d{4}$/.test(p) ? `${p.slice(0, 3)}-${p.slice(3)}` : p;
}

export function phone(p?: string | null) {
    if (!p) return '';
    const d = p.replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return p;
}

export function documentFmt(p?: string | null) {
    if (!p) return '';
    const d = p.replace(/\D/g, '');
    if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return p;
}

export function date(iso?: string | null, withTime = false) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(
        'pt-BR',
        withTime ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit', year: 'numeric' },
    );
}

export function time(iso?: string | null) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function relative(iso?: string | null) {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 60000;
    if (diff < 1) return 'agora';
    if (diff < 60) return `há ${Math.round(diff)} min`;
    if (diff < 60 * 24) return `há ${Math.round(diff / 60)} h`;
    return date(iso);
}

/** Link do WhatsApp (wa.me) com mensagem pronta. */
export function whatsapp(phoneNumber: string | null | undefined, text: string) {
    const d = (phoneNumber ?? '').replace(/\D/g, '');
    if (!d) return null;
    const full = d.length <= 11 ? `55${d}` : d;
    return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

/** Para <input type="datetime-local"> */
export function toLocalInput(iso?: string | null) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
