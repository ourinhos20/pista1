import { Field, textareaCls } from '@/components/erp';
import { Input } from '@/components/ui/input';
import type { ClientData } from '@/types';
import { useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';

/** Cadastro / alteração de cliente (usado na lista e na ficha do cliente). */
export function ClientForm({ client, onDone }: { client?: ClientData; onDone?: () => void }) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: client?.name ?? '',
        phone: client?.phone ?? '',
        document: client?.document ?? '',
        email: client?.email ?? '',
        address: client?.address ?? '',
        city: client?.city ?? '',
        notes: client?.notes ?? '',
    });
    return (
        <form
            className="grid gap-3"
            onSubmit={(e) => {
                e.preventDefault();
                const opts = { preserveScroll: true, onSuccess: () => onDone?.() };
                if (client) put(route('clientes.update', client.id), opts);
                else post(route('clientes.store'), opts);
            }}
        >
            <div className="grid gap-3 sm:grid-cols-6">
                <Field label="Nome *" className="sm:col-span-6" error={errors.name}>
                    <Input value={data.name} onChange={(e) => setData('name', e.target.value)} autoFocus />
                </Field>
                <Field label="WhatsApp" className="sm:col-span-2" error={errors.phone}>
                    <Input inputMode="tel" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                </Field>
                <Field label="CPF / CNPJ" className="sm:col-span-2" error={errors.document}>
                    <Input inputMode="numeric" value={data.document} onChange={(e) => setData('document', e.target.value)} />
                </Field>
                <Field label="E-mail" className="sm:col-span-2" error={errors.email}>
                    <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                </Field>
                <Field label="Endereço" className="sm:col-span-4">
                    <Input value={data.address} onChange={(e) => setData('address', e.target.value)} />
                </Field>
                <Field label="Cidade" className="sm:col-span-2">
                    <Input value={data.city} onChange={(e) => setData('city', e.target.value)} />
                </Field>
                <Field label="Observações" className="sm:col-span-6">
                    <textarea rows={2} className={textareaCls} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
                </Field>
            </div>
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={processing}
                    className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white md:h-8"
                >
                    <Save className="size-4" /> {client ? 'Gravar alterações' : 'Gravar cliente'}
                </button>
            </div>
        </form>
    );
}
