<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteAndSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_site_publico_abre_e_nao_revela_o_sistema(): void
    {
        $panel = config('oficina.panel_path');
        $res = $this->get('/')->assertOk()->assertSee('Pista 1')->assertSee('wa.me/', false);

        $this->assertStringNotContainsString('/'.$panel, $res->getContent());
        $this->assertStringNotContainsString('login', strtolower($res->getContent()));
    }

    public function test_cabecalhos_de_seguranca(): void
    {
        $res = $this->get('/');
        $res->assertHeader('X-Content-Type-Options', 'nosniff');
        $res->assertHeader('X-Frame-Options', 'SAMEORIGIN');
        $res->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    public function test_sistema_nao_e_indexado_pelo_google(): void
    {
        $this->get(route('login'))->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }

    public function test_visitante_no_sistema_vai_para_o_login(): void
    {
        $this->get(route('dashboard'))->assertRedirect(route('login'));
        $this->get(route('financeiro.index'))->assertRedirect(route('login'));
    }

    public function test_login_tem_limite_de_tentativas(): void
    {
        $user = User::factory()->create();
        for ($i = 0; $i < 5; $i++) {
            $this->post(route('login'), ['email' => $user->email, 'password' => 'errada']);
        }
        $this->post(route('login'), ['email' => $user->email, 'password' => 'password'])->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_politica_de_conteudo_em_producao(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        $res = $this->get('/');
        $this->assertStringContainsString("default-src 'self'", (string) $res->headers->get('Content-Security-Policy'));
    }
}
