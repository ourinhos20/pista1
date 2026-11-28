<?php

namespace Tests\Feature;

use App\Enums\OsStatus;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Models\Vehicle;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Regras de acesso do briefing: o mecânico nunca vê dados sensíveis nem valores. */
class OficinaAccessTest extends TestCase
{
    use RefreshDatabase;

    private User $master;
    private User $balcao;
    private User $carlos;
    private ServiceOrder $osCarlos;
    private ServiceOrder $osRafael;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->master = User::where('email', 'socio1@pista1.test')->first();
        $this->balcao = User::where('email', 'balcao@pista1.test')->first();
        $this->carlos = User::where('email', 'carlos@pista1.test')->first();
        $rafael = User::where('email', 'rafael@pista1.test')->first();
        $this->osCarlos = ServiceOrder::where('mechanic_id', $this->carlos->id)->where('status', OsStatus::Execucao)->first();
        $this->osRafael = ServiceOrder::where('mechanic_id', $rafael->id)->first();
    }

    public function test_mecanico_nao_acessa_clientes_lista_de_os_nem_usuarios(): void
    {
        $this->actingAs($this->carlos);
        $this->get($this->p('/clientes'))->assertForbidden();
        $this->get($this->p('/os'))->assertForbidden();
        $this->get($this->p('/usuarios'))->assertForbidden();
        $this->get($this->p('/dashboard'))->assertRedirect($this->p('/mecanico'));
    }

    public function test_mecanico_ve_a_os_dele_sem_dados_sensiveis_nem_valores(): void
    {
        $this->actingAs($this->carlos)
            ->get($this->p("/os/{$this->osCarlos->id}"))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('os/show')
                ->where('os.client.name', 'João')
                ->missing('os.client.phone')
                ->missing('os.client.document')
                ->missing('os.client.address')
                ->missing('os.total')
                ->missing('os.items.0.unit_price')
            );
    }

    public function test_mecanico_ve_agenda_inteira_sem_dados_sensiveis(): void
    {
        $this->actingAs($this->carlos)->get($this->p("/os/{$this->osRafael->id}"))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->missing('os.client.phone')->missing('os.total'));

        $agendados = ServiceOrder::where('status', OsStatus::Aguardando)->count();
        $this->get($this->p('/mecanico'))->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('mecanico/index')
                ->has('agenda', $agendados)
                ->has('fila', 1)
                ->missing('agenda.0.client.phone')
                ->missing('fila.0.client.phone')
            );
    }

    public function test_mecanico_preenche_revisao_e_envia_para_o_balcao(): void
    {
        $this->actingAs($this->carlos);
        $this->patch($this->p("/os/{$this->osRafael->id}/revisao"), ['revision' => ['oleo_motor' => 'trocar', 'bateria' => 'ok', 'velas' => null]])
            ->assertSessionHasNoErrors();
        $this->assertSame(['oleo_motor' => 'trocar', 'bateria' => 'ok'], $this->osRafael->fresh()->revision);

        $this->patch($this->p("/os/{$this->osRafael->id}/revisao"), ['revision' => ['oleo_motor' => 'qualquer']])->assertSessionHasErrors();

        // etapa 2 da sequência: conclui o checklist/diagnóstico antes de enviar
        $this->patch($this->p("/os/{$this->osRafael->id}/status"), ['status' => 'orcamento'])->assertSessionHasErrors('status');
        $this->patch($this->p("/os/{$this->osRafael->id}/concluir"), ['diagnosis' => 'Óleo vencido.'])->assertSessionHasNoErrors();
        $this->patch($this->p("/os/{$this->osRafael->id}/status"), ['status' => 'orcamento'])->assertSessionHasNoErrors();
        $this->assertSame(OsStatus::Orcamento, $this->osRafael->fresh()->status);
    }

    public function test_mecanico_so_imprime_fichas_sem_dados_sensiveis(): void
    {
        $this->actingAs($this->carlos);
        $this->get($this->p("/os/{$this->osCarlos->id}/imprimir/diagnostico"))->assertOk();
        $this->get($this->p("/os/{$this->osCarlos->id}/imprimir/revisao"))->assertOk();
        $this->get($this->p("/os/{$this->osCarlos->id}/imprimir/cliente"))->assertForbidden();
        // a vistoria de entrada é dele, mas sai sem telefone/CPF
        $this->get($this->p("/os/{$this->osCarlos->id}/imprimir/entrada"))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->missing('os.client.phone')->missing('os.client.document'));
    }

    public function test_mecanico_nao_define_preco_nem_marca_como_entregue(): void
    {
        $this->actingAs($this->carlos);
        $this->post($this->p("/os/{$this->osCarlos->id}/itens"), ['type' => 'peca', 'description' => 'Pastilha', 'quantity' => 1, 'unit_price' => 999])->assertRedirect();
        $this->assertSame(0.0, $this->osCarlos->items()->where('description', 'Pastilha')->first()->unit_price);

        $this->patch($this->p("/os/{$this->osCarlos->id}/status"), ['status' => 'entregue'])->assertSessionHasErrors('status');
    }

    public function test_balcao_ve_dados_completos_e_valores(): void
    {
        $this->actingAs($this->balcao)
            ->get($this->p("/os/{$this->osCarlos->id}"))
            ->assertInertia(fn (Assert $page) => $page
                ->where('os.client.phone', '11987654321')
                ->has('os.total')
            );
    }

    public function test_balcao_abre_os_para_carro_novo_criando_cliente_e_veiculo(): void
    {
        $this->actingAs($this->balcao)->post($this->p('/os'), [
            'name' => 'Cliente Novo', 'phone' => '(11) 91111-2222',
            'plate' => 'xyz-9a87', 'vehicle_model' => 'Honda Civic', 'vehicle_year' => '2018',
            'service_type' => 'defeito', 'complaint' => 'Barulho no motor', 'arrived' => true,
        ])->assertRedirect();

        $v = Vehicle::where('plate', 'XYZ9A87')->first();
        $this->assertNotNull($v);
        $this->assertSame('11911112222', $v->client->phone);
        $os = ServiceOrder::where('vehicle_id', $v->id)->first();
        $this->assertSame(OsStatus::Recebido, $os->status);
        $this->assertSame('balcao', $os->origin);
        $this->assertNotNull($os->checked_in_at);
    }

    public function test_so_master_acessa_usuarios_e_exclui_os(): void
    {
        $this->actingAs($this->balcao)->get($this->p('/usuarios'))->assertForbidden();
        $this->actingAs($this->balcao)->delete($this->p("/os/{$this->osCarlos->id}"))->assertForbidden();
        $this->actingAs($this->master)->get($this->p('/usuarios'))->assertOk();
    }

    public function test_usuario_desativado_nao_consegue_entrar(): void
    {
        $this->balcao->update(['active' => false]);
        $this->post($this->p('/login'), ['email' => 'balcao@pista1.test', 'password' => 'pista1234']);
        $this->assertGuest();
    }
}
