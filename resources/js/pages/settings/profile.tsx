import { Block, Field } from '@/components/erp';
import { Input } from '@/components/ui/input';
import { useAppearance } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { KeyRound, Monitor, Moon, Save, Sun } from 'lucide-react';
import { useRef } from 'react';

const saveBtn =
    'inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white disabled:opacity-60 md:h-8';

/** Minha conta: dados, senha e tema (claro/escuro). */
export default function MinhaConta() {
    const { auth } = usePage<SharedData>().props;
    const { appearance, updateAppearance } = useAppearance();
    const passwordInput = useRef<HTMLInputElement>(null);

    const profile = useForm({ name: auth.user.name, email: auth.user.email });
    const pwd = useForm({ current_password: '', password: '', password_confirmation: '' });

    return (
        <AppLayout title="Minha Conta" code="SIS020">
            <Head title="Minha conta" />
            <div className="grid max-w-3xl gap-2 md:gap-3">
                <Block title="Dados de acesso">
                    <form
                        className="grid gap-3 sm:grid-cols-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            profile.patch(route('profile.update'), { preserveScroll: true });
                        }}
                    >
                        <Field label="Nome" error={profile.errors.name}>
                            <Input value={profile.data.name} onChange={(e) => profile.setData('name', e.target.value)} autoComplete="name" />
                        </Field>
                        <Field label="E-mail" error={profile.errors.email}>
                            <Input
                                type="email"
                                value={profile.data.email}
                                onChange={(e) => profile.setData('email', e.target.value)}
                                autoComplete="username"
                            />
                        </Field>
                        <div className="flex justify-end sm:col-span-2">
                            <button type="submit" disabled={profile.processing || !profile.isDirty} className={saveBtn}>
                                <Save className="size-4" /> Gravar
                            </button>
                        </div>
                    </form>
                </Block>

                <Block title="Trocar senha">
                    <form
                        className="grid gap-3 sm:grid-cols-3"
                        onSubmit={(e) => {
                            e.preventDefault();
                            pwd.put(route('password.update'), {
                                preserveScroll: true,
                                onSuccess: () => pwd.reset(),
                                onError: (errors) => {
                                    if (errors.password) {
                                        pwd.reset('password', 'password_confirmation');
                                        passwordInput.current?.focus();
                                    }
                                    if (errors.current_password) pwd.reset('current_password');
                                },
                            });
                        }}
                    >
                        <Field label="Senha atual" error={pwd.errors.current_password}>
                            <Input
                                type="password"
                                value={pwd.data.current_password}
                                onChange={(e) => pwd.setData('current_password', e.target.value)}
                                autoComplete="current-password"
                            />
                        </Field>
                        <Field label="Nova senha" error={pwd.errors.password}>
                            <Input
                                ref={passwordInput}
                                type="password"
                                value={pwd.data.password}
                                onChange={(e) => pwd.setData('password', e.target.value)}
                                autoComplete="new-password"
                            />
                        </Field>
                        <Field label="Repita a nova senha" error={pwd.errors.password_confirmation}>
                            <Input
                                type="password"
                                value={pwd.data.password_confirmation}
                                onChange={(e) => pwd.setData('password_confirmation', e.target.value)}
                                autoComplete="new-password"
                            />
                        </Field>
                        <p className="text-muted-foreground text-[12px] sm:col-span-2">Mínimo de 8 caracteres, com letras e números.</p>
                        <div className="flex justify-end">
                            <button type="submit" disabled={pwd.processing} className={saveBtn}>
                                <KeyRound className="size-4" /> Trocar senha
                            </button>
                        </div>
                    </form>
                </Block>

                <Block title="Aparência">
                    <div className="grid grid-cols-3 overflow-hidden rounded-[3px] border border-[#b9bec6] sm:w-96">
                        {(
                            [
                                ['light', 'Claro', Sun],
                                ['dark', 'Escuro', Moon],
                                ['system', 'Do aparelho', Monitor],
                            ] as const
                        ).map(([v, label, Icon]) => (
                            <button
                                key={v}
                                type="button"
                                onClick={() => updateAppearance(v)}
                                className={cn(
                                    'flex h-11 items-center justify-center gap-1.5 border-r border-[#d7dade] text-[13px] font-semibold last:border-r-0 md:h-8',
                                    appearance === v ? 'bg-zinc-900 text-white' : 'bg-card',
                                )}
                            >
                                <Icon className="size-4" /> {label}
                            </button>
                        ))}
                    </div>
                    <p className="text-muted-foreground mt-2 text-[12px]">O modo escuro ajuda no celular da oficina. Vale só para este aparelho.</p>
                </Block>
            </div>
        </AppLayout>
    );
}
