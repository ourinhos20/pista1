import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

/**
 * Confirmação e aviso dentro do próprio sistema.
 * Não usa confirm()/alert() do navegador: alguns navegadores e apps bloqueiam
 * essas janelas e a ação simplesmente não acontecia (ex.: excluir OS).
 */
type Request = {
    kind: 'confirm' | 'alert';
    message: string;
    title?: string;
    okLabel?: string;
    danger?: boolean;
    resolve: (ok: boolean) => void;
};

let open: ((r: Request) => void) | null = null;

/** Pergunta e espera a resposta: `if (await ask('Excluir?', { danger: true })) ...` */
export function ask(message: string, opts: { title?: string; okLabel?: string; danger?: boolean } = {}): Promise<boolean> {
    return new Promise((resolve) => {
        if (open) open({ kind: 'confirm', message, ...opts, resolve });
        else resolve(false);
    });
}

/** Aviso simples, com um botão OK. */
export function tell(message: string, title = 'Atenção'): Promise<void> {
    return new Promise((resolve) => {
        if (open) open({ kind: 'alert', message, title, resolve: () => resolve() });
        else resolve();
    });
}

/** Fica no layout do sistema e mostra as perguntas/avisos. */
export function AskDialogHost() {
    const [req, setReq] = useState<Request | null>(null);

    useEffect(() => {
        open = setReq;
        return () => {
            open = null;
        };
    }, []);

    const done = (ok: boolean) => {
        req?.resolve(ok);
        setReq(null);
    };

    return (
        <Dialog open={req !== null} onOpenChange={(o) => !o && done(false)}>
            <DialogContent className="rounded-lg sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{req?.title ?? (req?.kind === 'confirm' ? 'Confirmar' : 'Atenção')}</DialogTitle>
                    <DialogDescription className="text-[15px] whitespace-pre-line text-zinc-700 md:text-[14px] dark:text-zinc-300">
                        {req?.message}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2">
                    {req?.kind === 'confirm' && (
                        <button
                            type="button"
                            onClick={() => done(false)}
                            className="inline-flex h-11 items-center rounded-lg border border-[#c9cdd3] bg-white px-4 text-[14px] font-semibold md:h-9 md:text-[13px] dark:bg-zinc-900"
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        type="button"
                        autoFocus
                        onClick={() => done(true)}
                        className={cn(
                            'inline-flex h-11 items-center rounded-lg px-4 text-[14px] font-semibold text-white md:h-9 md:text-[13px]',
                            req?.danger ? 'bg-[#d42a2a] hover:bg-[#b51f1f]' : 'bg-zinc-900 hover:bg-zinc-800',
                        )}
                    >
                        {req?.okLabel ?? 'OK'}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
