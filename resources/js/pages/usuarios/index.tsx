import { Block, Field, Grid, Tool, selectCls, type Col } from '@/components/erp';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Save, UserPlus } from 'lucide-react';
import { useState } from 'react';

type U = { id: number; name: string; email: string; role: Role; active: boolean };
type R = { value: Role; label: string };

const ROLE_HELP: Record<Role, string> = {
    master: 'Vê tudo, inclusive valores e usuários.',
    balcao: 'Clientes, OS, valores, orçamentos e impressão.',
    mecanico: 'Agenda e fichas. Não vê CPF, telefone nem valores.',
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
            className="grid gap-3"
            onSubmit={(e) => {
                e.preventDefault();
                const opts = { preserveScroll: true, onSuccess: onDone };
                if (user) put(route('usuarios.update', user.id), opts);
                else post(route('usuarios.store'), opts);
            }}
        >
            <Field label="Nome *" error={errors.name}>
                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} />
            </Field>
            <Field label="E-mail (login) *" error={errors.email}>
                <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
            </Field>
            <Field label="Perfil *">
                <select className={selectCls} value={data.role} onChange={(e) => setData('role', e.target.value as Role)}>
                    {roles.map((r) => (
                        <option key={r.value} value={r.value}>
                            {r.label}
                        </option>
                    ))}
                </select>
                <span className="text-muted-foreground text-[12px]">{ROLE_HELP[data.role]}</span>
            </Field>
            <Field label={user ? 'Nova senha (vazio = manter)' : 'Senha *'} error={errors.password}>
                <Input type="password" autoComplete="new-password" value={data.password} onChange={(e) => setData('password', e.target.value)} />
            </Field>
            {user && (
                <label className="flex items-center gap-2 text-[13px] font-medium">
                    <input type="checkbox" className="size-4 accent-[#d42a2a]" checked={data.active} onChange={(e) => setData('active', e.target.checked)} />
                    Acesso ativo
                </label>
            )}
            <div className="flex justify-end">
                <button type="submit" disabled={processing} className="inline-flex h-11 items-center gap-1.5 rounded-[3px] border border-[#b51f1f] bg-[#d42a2a] px-4 text-[13px] font-semibold text-white md:h-8">
                    <Save className="size-4" /> Gravar
                </button>
            </div>
        </form>
    );
}

export default function Usuarios({ users, roles }: { users: U[]; roles: R[] }) {
    const [open, setOpen] = useState<U | 'new' | null>(null);
    const label = (r: Role) => roles.find((x) => x.value === r)?.label ?? r;

    const cols: Col<U>[] = [
        { label: 'Nome', render: (r) => <span className={cn('font-semibold', !r.active && 'text-zinc-400 line-through')}>{r.name}</span> },
        { label: 'E-mail (login)', render: (r) => r.email, hide: 'sm' },
        { label: 'Perfil', render: (r) => <span className={cn('rounded-[2px] px-1.5 py-0.5 text-[11px] font-bold uppercase', r.role === 'master' ? 'bg-zinc-900 text-white' : 'bg-zinc-200 dark:bg-zinc-700')}>{label(r.role)}</span>, className: 'w-40' },
        { label: 'Situação', render: (r) => (r.active ? <span className="font-semibold text-green-700">Ativo</span> : <span className="text-zinc-500">Inativo</span>), className: 'w-24' },
    ];

    return (
        <AppLayout title="Usuários e Permissões" code="SIS010" toolbar={<Tool primary icon={<UserPlus />} label="Novo usuário" onClick={() => setOpen('new')} />}>
            <Head title="Usuários" />
            <Block title="Usuários do sistema" bodyClassName="p-0">
                <Grid cols={cols} rows={users} rowKey={(r) => r.id} onRowClick={(r) => setOpen(r)} footer={<span>{users.length} usuário(s) · clique para alterar</span>} />
            </Block>
            <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
                <DialogContent className="rounded-[4px]">
                    <DialogHeader>
                        <DialogTitle>{open === 'new' ? 'Novo usuário' : `Alterar ${open?.name}`}</DialogTitle>
                    </DialogHeader>
                    {open && <UserForm key={open === 'new' ? 'new' : open.id} user={open === 'new' ? undefined : open} roles={roles} onDone={() => setOpen(null)} />}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
