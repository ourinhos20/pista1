<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Nonce para os scripts (usado pela política de conteúdo em produção)
        Vite::useCspNonce();

        // Senhas: mínimo 8 caracteres com letras e números
        Password::defaults(fn () => Password::min(8)->letters()->numbers());

        // Em produção tudo roda em HTTPS
        if ($this->app->isProduction()) {
            URL::forceHttps();
        }
    }
}
