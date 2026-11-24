<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('usuarios/index', [
            'users' => User::orderBy('role')->orderBy('name')->get(['id', 'name', 'email', 'role', 'active']),
            'roles' => collect(User::ROLES)->map(fn ($label, $value) => compact('value', 'label'))->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', Rule::in(array_keys(User::ROLES))],
            'password' => ['required', Password::min(8)],
        ]);
        User::create([...$data, 'active' => true]);

        return back()->with('success', 'Usuário criado.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['required', Rule::in(array_keys(User::ROLES))],
            'active' => ['required', 'boolean'],
            'password' => ['nullable', Password::min(8)],
        ]);

        if ($user->id === $request->user()->id && ($data['role'] !== 'master' || ! $data['active'])) {
            return back()->with('error', 'Você não pode tirar o seu próprio acesso master.');
        }

        if (empty($data['password'])) {
            unset($data['password']);
        }
        $user->update($data);

        return back()->with('success', 'Usuário atualizado.');
    }
}
