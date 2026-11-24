import InputError from '@/components/input-error';
import { Page, PageHeader, Panel } from '@/components/oficina';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Pencil, UserPlus } from 'lucide-react';
import { useState } from 'react';

type U = { id: number; name: string; email: string; role: Role; active: boolean };
type R = { value: Role; label: string };

const ROLE_HELP: Record<Role, string> = {
    master: 'Vê tudo, inclusive valores, finanças e usuários.',
    balcao: 'Clientes, OS, orçamentos, pagamentos e impressão.',
    mecanico: 'Só os carros dele. Não vê CPF, telefone nem valores.',
};

function UserForm({ user, roles, onDone }: { user?: U; roles: R[]; onDone: () => void }) {
    const { data, setData, post, put, processing, errors } = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        role: user?.role ?? ('balcao' as Role),
        active: user?.active ?? true,
        password: '',
    });
    return (
        <form
            className="grid gap-4"
            onSubmit={(e) => {
                e.preventDefault();
                const opts = { preserveScroll: true, onSuccess: onDone };
                if (user) put(route('usuarios.update', user.id), opts);
                else post(route('usuarios.store'), opts);
            }}
        >
            <div className="grid gap-2">
                <Label htmlFor="u-name">Nome</Label>
                <Input id="u-name" className="h-12 text-base" value={data.name} onChange={(e) => setData('name', e.target.value)} />
                <InputError message={errors.name} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="u-email">E-mail (login)</Label>
                <Input id="u-email" type="email" className="h-12 text-base" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                <InputError message={errors.email} />
            </div>
            <div className="grid gap-2">
                <Label>Perfil</Label>
                <div className="grid gap-2">
                    {roles.map((r) => (
                        <button
                            key={r.value}
                            type="button"
                            onClick={() => setData('role', r.value)}
                            className={cn('rounded-xl p-3 text-left ring-1 transition', data.role === r.value ? 'ring-primary bg-primary/5 ring-2' : 'ring-border hover:bg-muted')}
                        >
                            <p className="font-semibold">{r.label}</p>
                            <p className="text-muted-foreground text-sm">{ROLE_HELP[r.value]}</p>
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="u-pass">{user ? 'Nova senha (deixe vazio para manter)' : 'Senha'}</Label>
                <Input id="u-pass" type="password" autoComplete="new-password" className="h-12 text-base" value={data.password} onChange={(e) => setData('password', e.target.value)} />
                <InputError message={errors.password} />
            </div>
            {user && (
                <label className="flex items-center gap-3 text-[15px] font-medium">
                    <input type="checkbox" className="size-5 accent-[#d42a2a]" checked={data.active} onChange={(e) => setData('active', e.target.checked)} />
                    Acesso ativo
                </label>
            )}
            <Button type="submit" size="lg" disabled={processing}>
                {user ? 'Salvar' : 'Criar usuário'}
            </Button>
        </form>
    );
}

export default function Usuarios({ users, roles }: { users: U[]; roles: R[] }) {
    const [open, setOpen] = useState<number | 'new' | null>(null);
    const label = (r: Role) => roles.find((x) => x.value === r)?.label ?? r;

    return (
        <AppLayout breadcrumbs={[{ title: 'Usuários', href: '/usuarios' }]}>
            <Head title="Usuários" />
            <Page className="max-w-4xl">
                <PageHeader
                    title="Usuários e permissões"
                    subtitle="Quem acessa o sistema e o que cada um vê."
                    actions={
                        <Dialog open={open === 'new'} onOpenChange={(o) => setOpen(o ? 'new' : null)}>
                            <DialogTrigger asChild>
                                <Button size="lg">
                                    <UserPlus className="size-5" /> Novo usuário
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90svh] overflow-y-auto rounded-2xl">
                                <DialogHeader>
                                    <DialogTitle>Novo usuário</DialogTitle>
                                </DialogHeader>
                                <UserForm roles={roles} onDone={() => setOpen(null)} />
                            </DialogContent>
                        </Dialog>
                    }
                />
                <Panel>
                    <ul className="divide-y">
                        {users.map((u) => (
                            <li key={u.id} className="flex items-center gap-4 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className={cn('truncate font-semibold', !u.active && 'text-muted-foreground line-through')}>{u.name}</p>
                                    <p className="text-muted-foreground truncate text-sm">{u.email}</p>
                                </div>
                                <span
                                    className={cn(
                                        'rounded-full px-3 py-1 text-xs font-bold',
                                        u.role === 'master' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-muted',
                                    )}
                                >
                                    {label(u.role)}
                                </span>
                                <Dialog open={open === u.id} onOpenChange={(o) => setOpen(o ? u.id : null)}>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" aria-label={`Editar ${u.name}`}>
                                            <Pencil className="size-4" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-h-[90svh] overflow-y-auto rounded-2xl">
                                        <DialogHeader>
                                            <DialogTitle>Editar {u.name}</DialogTitle>
                                        </DialogHeader>
                                        <UserForm user={u} roles={roles} onDone={() => setOpen(null)} />
                                    </DialogContent>
                                </Dialog>
                            </li>
                        ))}
                    </ul>
                </Panel>
            </Page>
        </AppLayout>
    );
}
