import { Field, textareaCls } from '@/components/erp';
import { Input } from '@/components/ui/input';
import { useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';

export type Sup = {
    id: number;
    name: string;
    document: string | null;
    phone: string | null;
    contact: string | null;
    email: string | null;
    notes: string | null;
    active: boolean;
    purchases_count: number;
    purchases_total: number;
    open_total: number;
};

/** Cadastro / alteração de fornecedor (lista, ficha e cadastro rápido na compra). */
export function SupplierForm({ s, onDone }: { s?: Sup; onDone: () => void }) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: s?.name ?? '',
        document: s?.document ?? '',
        phone: s?.phone ?? '',
        contact: s?.contact ?? '',
        email: s?.email ?? '',
        notes: s?.notes ?? '',
        active: s?.active ?? true,
    });
    return (
        <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
                e.preventDefault();
                // preserveState: a tela que abriu este formulário (ex.: a compra) continua como estava
                const opts = { preserveScroll: true, preserveState: true, onSuccess: onDone };
                if (s) put(route('fornecedores.update', s.id), opts);
                else post(route('fornecedores.store'), opts);
            }}
        >
            <Field label="Nome *" className="sm:col-span-2" error={errors.name}>
                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} autoFocus />
            </Field>
            <Field label="CNPJ / CPF" error={errors.document}>
                <Input value={data.document} onChange={(e) => setData('document', e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Telefone">
                <Input value={data.phone} onChange={(e) => setData('phone', e.target.value)} inputMode="tel" />
            </Field>
            <Field label="Vendedor">
                <Input value={data.contact} onChange={(e) => setData('contact', e.target.value)} />
            </Field>
            <Field label="E-mail" error={errors.email}>
                <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
            </Field>
            <Field label="Observações" className="sm:col-span-2">
                <textarea rows={2} className={textareaCls} value={data.notes} onChange={(e) => setData('notes', e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-[13px] font-medium">
                <input
                    type="checkbox"
                    className="size-4 accent-[#d42a2a]"
                    checked={data.active}
                    onChange={(e) => setData('active', e.target.checked)}
                />
                Ativo
            </label>
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={processing}
                    className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white md:h-8"
                >
                    <Save className="size-4" /> Gravar
                </button>
            </div>
        </form>
    );
}
