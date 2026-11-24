import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: true,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-[#0b0b0d] px-5 py-10 text-white">
            <Head title="Entrar" />
            <img src="/images/pista1-logo.png" alt="Pista 1 Mecânica Automotiva" className="mb-10 w-64 max-w-[80%] md:w-80" />

            <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6 text-zinc-900 shadow-2xl md:p-8" style={{ colorScheme: 'light' }}>
                <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
                <p className="mt-1 text-[15px] text-zinc-600">Sistema de gestão da oficina</p>

                <div className="mt-6 grid gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-[15px]">
                            E-mail
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className="h-12 border-zinc-300 bg-white text-base text-zinc-900"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password" className="text-[15px]">
                            Senha
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="h-12 border-zinc-300 bg-white text-base text-zinc-900"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <label className="flex items-center gap-3 text-[15px]">
                        <input type="checkbox" className="size-5 accent-[#d42a2a]" checked={data.remember} onChange={(e) => setData('remember', e.target.checked)} />
                        Manter conectado neste aparelho
                    </label>

                    <Button type="submit" size="lg" className="mt-2 w-full" disabled={processing}>
                        {processing && <LoaderCircle className="size-5 animate-spin" />}
                        Entrar
                    </Button>
                </div>

                {status && <div className="mt-4 text-center text-sm font-medium text-green-600">{status}</div>}
                <p className="mt-6 text-center text-sm text-zinc-500">Esqueceu a senha? Peça a um dos sócios para redefinir.</p>
            </form>
        </div>
    );
}
