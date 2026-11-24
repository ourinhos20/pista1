<?php

namespace App\Console\Commands;

use App\Models\Partner;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

/**
 * Cria o primeiro acesso de sócio (master) no servidor, sem dados de exemplo.
 * Uso: php artisan pista1:criar-master
 */
class CriarMaster extends Command
{
    protected $signature = 'pista1:criar-master {--nome=} {--email=}';

    protected $description = 'Cria um usuário Master (sócio) e o cadastro dele em Sócios';

    public function handle(): int
    {
        $name = $this->option('nome') ?: $this->ask('Nome do sócio');
        $email = $this->option('email') ?: $this->ask('E-mail (login)');
        $password = $this->secret('Senha (mín. 8, com letras e números)');
        $confirm = $this->secret('Repita a senha');

        $v = Validator::make(
            ['name' => $name, 'email' => $email, 'password' => $password, 'password_confirmation' => $confirm],
            ['name' => ['required', 'max:255'], 'email' => ['required', 'email', 'unique:users,email'], 'password' => ['required', 'confirmed', Password::defaults()]],
        );
        if ($v->fails()) {
            foreach ($v->errors()->all() as $e) {
                $this->error($e);
            }

            return self::FAILURE;
        }

        $user = User::create(['name' => $name, 'email' => $email, 'password' => $password, 'role' => 'master', 'active' => true]);
        $user->forceFill(['email_verified_at' => now()])->save();

        if ($this->confirm('Cadastrar também como sócio no financeiro?', true)) {
            Partner::create(['name' => $name, 'user_id' => $user->id, 'share' => (float) $this->ask('Participação (%)', '33.33')]);
        }

        $this->info("Master criado: {$email}. Entre em /".config('oficina.panel_path').'/login');

        return self::SUCCESS;
    }
}
