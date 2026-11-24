<?php

namespace Tests;

use Illuminate\Contracts\Auth\Authenticatable as UserContract;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /** Caminho dentro do sistema (que fica no endereço escondido PAINEL_PATH). */
    protected function p(string $path): string
    {
        return '/'.config('oficina.panel_path').$path;
    }

    /**
     * Trocar de usuário no meio do teste: limpa a sessão, como faria um login
     * de verdade (a proteção auth.session derruba sessão de outro usuário).
     */
    public function actingAs(UserContract $user, $guard = null)
    {
        if ($this->app->bound('session')) {
            $this->flushSession();
        }

        return parent::actingAs($user, $guard);
    }
}
