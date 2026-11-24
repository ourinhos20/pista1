import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { date } from '@/lib/os';
import { compressImage } from '@/lib/photos';
import { cn } from '@/lib/utils';
import type { Photo } from '@/types';
import { router } from '@inertiajs/react';
import { Camera, ChevronLeft, ChevronRight, Eye, EyeOff, ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

/** Botão grande que abre a câmera no celular (ou escolhe arquivos no PC). */
export function PhotoUpload({ osId, className }: { osId: number; className?: string }) {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);

    const send = async (files: FileList | null) => {
        if (!files?.length) return;
        setBusy(true);
        const ready = await Promise.all([...files].slice(0, 10).map((f) => compressImage(f)));
        router.post(route('os.photos.store', osId), { photos: ready }, { forceFormData: true, preserveScroll: true, onFinish: () => setBusy(false) });
        if (input.current) input.current.value = '';
    };

    return (
        <>
            {/* sem "capture": no celular aparece a escolha entre Câmera e Galeria */}
            <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => send(e.target.files)} />
            <button
                type="button"
                disabled={busy}
                onClick={() => input.current?.click()}
                className={cn(
                    'inline-flex h-12 items-center justify-center gap-2 rounded-[3px] border border-zinc-800 bg-zinc-900 px-4 text-[14px] font-semibold text-white disabled:opacity-60 md:h-9 md:text-[13px]',
                    className,
                )}
            >
                {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Camera className="size-5 md:size-4" />}
                {busy ? 'Enviando…' : 'Tirar / anexar foto'}
            </button>
        </>
    );
}

export function PhotoGallery({ photos, osId, canManage, canDeleteAll }: { photos: Photo[]; osId?: number; canManage?: boolean; canDeleteAll?: boolean }) {
    const [open, setOpen] = useState<number | null>(null);
    const current = open !== null ? photos[open] : null;

    if (!photos.length) {
        return (
            <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-[4px] border border-dashed border-[#c9cdd3] py-10 text-[13px]">
                <ImagePlus className="size-8 opacity-40" />
                Nenhuma foto ainda.
            </div>
        );
    }

    const toggleClient = (p: Photo) => osId && router.patch(route('os.photos.update', [osId, p.id]), { show_to_client: !p.show_to_client }, { preserveScroll: true });
    const remove = (p: Photo) => osId && confirm('Excluir esta foto?') && router.delete(route('os.photos.destroy', [osId, p.id]), { preserveScroll: true, onSuccess: () => setOpen(null) });

    return (
        <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {photos.map((p, i) => (
                    <button key={p.id} type="button" onClick={() => setOpen(i)} className="group relative overflow-hidden rounded-[3px] border border-[#c9cdd3] bg-zinc-100">
                        <img src={p.thumb} alt={p.caption ?? 'Foto'} loading="lazy" className="aspect-square w-full object-cover transition group-hover:scale-105" />
                        {canManage && !p.show_to_client && (
                            <span className="absolute top-1 left-1 rounded-[2px] bg-black/70 px-1 text-[10px] font-semibold text-white">interna</span>
                        )}
                        {p.caption && <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-0.5 text-left text-[11px] text-white">{p.caption}</span>}
                    </button>
                ))}
            </div>

            <Dialog open={current !== null} onOpenChange={(o) => !o && setOpen(null)}>
                <DialogContent className="max-w-4xl gap-2 rounded-[4px] p-2 sm:p-3">
                    <DialogTitle className="sr-only">Foto</DialogTitle>
                    {current && (
                        <>
                            <div className="relative bg-black">
                                <img src={current.url} alt={current.caption ?? 'Foto'} className="mx-auto max-h-[75svh] w-auto object-contain" />
                                {open! > 0 && (
                                    <button aria-label="Anterior" onClick={() => setOpen(open! - 1)} className="absolute top-1/2 left-1 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white">
                                        <ChevronLeft />
                                    </button>
                                )}
                                {open! < photos.length - 1 && (
                                    <button aria-label="Próxima" onClick={() => setOpen(open! + 1)} className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white">
                                        <ChevronRight />
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 px-1 text-[12px]">
                                <span className="text-muted-foreground">
                                    {current.caption ? <b className="text-foreground">{current.caption} · </b> : null}
                                    {current.uploaded_by ?? 'Cliente'} · {date(current.created_at, true)}
                                </span>
                                <span className="ml-auto flex gap-1.5">
                                    {canManage && (
                                        <button onClick={() => toggleClient(current)} className="inline-flex h-9 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] px-2.5 font-semibold">
                                            {current.show_to_client ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                                            {current.show_to_client ? 'Cliente vê no orçamento' : 'Só interna'}
                                        </button>
                                    )}
                                    {(canDeleteAll || current.mine) && osId && (
                                        <button onClick={() => remove(current)} className="inline-flex h-9 items-center gap-1.5 rounded-[3px] border border-[#c9cdd3] px-2.5 font-semibold text-[#b51f1f]">
                                            <Trash2 className="size-4" /> Excluir
                                        </button>
                                    )}
                                </span>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
