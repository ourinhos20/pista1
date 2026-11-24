<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_tela_de_login_fica_no_endereco_escondido(): void
    {
        $this->get('/'.config('oficina.panel_path').'/login')->assertOk();
        $this->get('/login')->assertNotFound();
        $this->get('/dashboard')->assertNotFound();
        $this->get('/register')->assertNotFound();
        $this->get('/forgot-password')->assertNotFound();
    }

    public function test_usuario_entra_pelo_login(): void
    {
        $user = User::factory()->create();

        $response = $this->post(route('login'), ['email' => $user->email, 'password' => 'password']);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_senha_errada_nao_entra(): void
    {
        $user = User::factory()->create();
        $this->post(route('login'), ['email' => $user->email, 'password' => 'wrong-password']);
        $this->assertGuest();
    }

    public function test_sair_volta_para_o_site(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->post(route('logout'));
        $this->assertGuest();
        $response->assertRedirect('/');
    }

    public function test_usuario_desativado_logado_e_desconectado(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->update(['active' => false]);

        $this->get(route('dashboard'))->assertRedirect(route('login'));
        $this->assertGuest();
    }
}
