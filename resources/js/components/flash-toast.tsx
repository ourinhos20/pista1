import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Confirmação imediata de toda ação (briefing: feedback imediato). */
export function FlashToast() {
    const { flash } = usePage<SharedData>().props;
    const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

    useEffect(() => {
        const text = flash?.error || flash?.success;
        if (!text) return;
        setMsg({ text, error: !!flash?.error });
        const t = setTimeout(() => setMsg(null), 3500);
        return () => clearTimeout(t);
    }, [flash]);

    if (!msg) return null;

    return (
        <div className="no-print pointer-events-none fixed inset-x-0 top-[4.5rem] z-[60] flex justify-center px-4 md:top-5">
            <div
                role="status"
                className="animate-in fade-in slide-in-from-top-2 pointer-events-auto flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-[15px] font-medium text-white shadow-2xl dark:bg-zinc-100 dark:text-zinc-900"
            >
                {msg.error ? <CircleAlert className="size-5 text-red-400" /> : <CircleCheck className="size-5 text-green-400 dark:text-green-600" />}
                {msg.text}
            </div>
        </div>
    );
}
