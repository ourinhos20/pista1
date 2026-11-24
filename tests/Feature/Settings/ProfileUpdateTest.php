<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_minha_conta_abre(): void
    {
        $this->actingAs(User::factory()->create())->get(route('profile.edit'))->assertOk();
    }

    public function test_nome_e_email_podem_ser_alterados(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('profile.update'), ['name' => 'Novo Nome', 'email' => 'novo@pista1.test'])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $user->refresh();
        $this->assertSame('Novo Nome', $user->name);
        $this->assertSame('novo@pista1.test', $user->email);
    }

    public function test_nao_existe_rota_para_excluir_a_propria_conta(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user)->delete(route('profile.update'))->assertStatus(405);
        $this->assertNotNull($user->fresh());
    }
}
