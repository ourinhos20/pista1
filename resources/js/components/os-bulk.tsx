import { ask } from '@/components/ask-dialog';
import type { Selection } from '@/components/erp';
import type { SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Trash2, X } from 'lucide-react';
import { useState } from 'react';

/**
 * Marcar várias linhas numa lista e excluir de uma vez (só sócios).
 * Devolve `selection` para passar ao <Grid> (undefined para quem não pode excluir) e a barra de ações.
 */
export function useBulkDelete(routeName: string, words: { title: string; one: string; many: (n: number) => string; note?: string }) {
    const { auth } = usePage<SharedData>().props;
    const [selected, setSelected] = useState<Array<string | number>>([]);
    const selection: Selection | undefined = auth.can.master ? { selected, onChange: setSelected } : undefined;

    const remove = async () => {
        const n = selected.length;
        const ok = await ask(`Excluir ${n === 1 ? words.one : words.many(n)}? Não pode ser desfeito.${words.note ? `\n${words.note}` : ''}`, {
            title: words.title,
            danger: true,
            okLabel: 'Excluir',
        });
        if (ok) router.delete(route(routeName), { data: { ids: selected }, preserveScroll: true, onSuccess: () => setSelected([]) });
    };

    const bar =
        selection && selected.length > 0 ? (
            <div className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-3 md:bottom-9">
                <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-zinc-900 py-2 pr-2 pl-4 text-[14px] text-white shadow-2xl">
                    <b className="tabular-nums">{selected.length}</b> selecionado{selected.length > 1 ? 's' : ''}
                    <button
                        type="button"
                        onClick={() => setSelected([])}
                        className="ml-2 inline-flex h-10 items-center gap-1 rounded-lg px-3 text-zinc-300 hover:bg-white/10 md:h-8"
                    >
                        <X className="size-4" /> Limpar
                    </button>
                    <button
                        type="button"
                        onClick={remove}
                        className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#d42a2a] px-3.5 font-semibold hover:bg-[#b51f1f] md:h-8"
                    >
                        <Trash2 className="size-4" /> Excluir
                    </button>
                </div>
            </div>
        ) : null;

    return { selection, bar };
}

/** Ordens de serviço: excluir várias. */
export const useOsBulkDelete = () =>
    useBulkDelete('os.destroy_many', { title: 'Excluir ordens de serviço', one: 'a OS selecionada', many: (n) => `as ${n} OS selecionadas` });
