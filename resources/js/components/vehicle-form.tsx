import { Field } from '@/components/erp';
import { Input } from '@/components/ui/input';
import { VehiclePicker } from '@/components/vehicle-picker';
import type { VehicleData } from '@/types';
import { useForm } from '@inertiajs/react';
import { Save } from 'lucide-react';

/** Cadastro / alteração de veículo (ficha do cliente e ficha do veículo). */
export function VehicleForm({ clientId, vehicle, onDone }: { clientId?: number; vehicle?: VehicleData; onDone?: () => void }) {
    const { data, setData, post, put, processing, errors } = useForm({
        client_id: clientId ?? vehicle?.client_id,
        plate: vehicle?.plate ?? '',
        brand: vehicle?.brand ?? '',
        model: vehicle?.model ?? '',
        year: vehicle?.year ?? '',
        color: vehicle?.color ?? '',
        chassis: vehicle?.chassis ?? '',
        km: vehicle?.km ? String(vehicle.km) : '',
    });
    const fields: [Exclude<keyof typeof data, 'client_id' | 'brand' | 'model'>, string][] = [
        ['year', 'Ano'],
        ['color', 'Cor'],
        ['chassis', 'Chassi'],
        ['km', 'Km atual'],
    ];
    return (
        <form
            className="grid gap-3"
            onSubmit={(e) => {
                e.preventDefault();
                const opts = { preserveScroll: true, onSuccess: () => onDone?.() };
                if (vehicle) put(route('veiculos.update', vehicle.id), opts);
                else post(route('veiculos.store'), opts);
            }}
        >
            <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Placa *" error={errors.plate}>
                    <Input
                        value={data.plate}
                        onChange={(e) => setData('plate', e.target.value.toUpperCase())}
                        className="font-mono font-bold tracking-widest uppercase"
                    />
                </Field>
                <VehiclePicker
                    brand={data.brand}
                    model={data.model}
                    onBrand={(v) => setData('brand', v)}
                    onModel={(v) => setData('model', v)}
                    errors={{ brand: errors.brand, model: errors.model }}
                    modelClassName="sm:col-span-2"
                />
                {fields.map(([k, label]) => (
                    <Field key={k} label={label} error={errors[k]}>
                        <Input
                            value={data[k]}
                            onChange={(e) =>
                                setData(
                                    k,
                                    k === 'chassis' ? e.target.value.toUpperCase() : k === 'km' ? e.target.value.replace(/\D/g, '') : e.target.value,
                                )
                            }
                            className={k === 'chassis' ? 'font-mono uppercase' : ''}
                            maxLength={k === 'chassis' ? 17 : undefined}
                            inputMode={k === 'km' ? 'numeric' : undefined}
                        />
                    </Field>
                ))}
            </div>
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={processing}
                    className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white md:h-8"
                >
                    <Save className="size-4" /> Gravar veículo
                </button>
            </div>
        </form>
    );
}
