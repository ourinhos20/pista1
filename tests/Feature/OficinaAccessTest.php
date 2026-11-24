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
        $this->get('/clientes')->assertForbidden();
        $this->get('/os')->assertForbidden();
        $this->get('/usuarios')->assertForbidden();
        $this->get('/dashboard')->assertRedirect('/mecanico');
    }

    public function test_mecanico_ve_a_os_dele_sem_dados_sensiveis_nem_valores(): void
    {
        $this->actingAs($this->carlos)
            ->get("/os/{$this->osCarlos->id}")
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

    public function test_mecanico_nao_abre_os_de_outro_mecanico(): void
    {
        $this->actingAs($this->carlos)->get("/os/{$this->osRafael->id}")->assertForbidden();
    }

    public function test_mecanico_so_imprime_fichas_sem_dados_sensiveis(): void
    {
        $this->actingAs($this->carlos);
        $this->get("/os/{$this->osCarlos->id}/imprimir/diagnostico")->assertOk();
        $this->get("/os/{$this->osCarlos->id}/imprimir/revisao")->assertOk();
        $this->get("/os/{$this->osCarlos->id}/imprimir/cliente")->assertForbidden();
        $this->get("/os/{$this->osCarlos->id}/imprimir/entrada")->assertForbidden();
    }

    public function test_mecanico_nao_define_preco_nem_marca_como_entregue(): void
    {
        $this->actingAs($this->carlos);
        $this->post("/os/{$this->osCarlos->id}/itens", ['type' => 'peca', 'description' => 'Pastilha', 'quantity' => 1, 'unit_price' => 999])->assertRedirect();
        $this->assertSame(0.0, $this->osCarlos->items()->where('description', 'Pastilha')->first()->unit_price);

        $this->patch("/os/{$this->osCarlos->id}/status", ['status' => 'entregue'])->assertSessionHasErrors('status');
    }

    public function test_balcao_ve_dados_completos_e_valores(): void
    {
        $this->actingAs($this->balcao)
            ->get("/os/{$this->osCarlos->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('os.client.phone', '11987654321')
                ->has('os.total')
            );
    }

    public function test_balcao_abre_os_para_carro_novo_criando_cliente_e_veiculo(): void
    {
        $this->actingAs($this->balcao)->post('/os', [
            'plate' => 'xyz-9a87',
            'client' => ['name' => 'Cliente Novo', 'phone' => '(11) 91111-2222'],
            'vehicle' => ['brand' => 'Honda', 'model' => 'Civic'],
            'km_in' => 45000,
            'complaint' => 'Barulho no motor',
            'damages' => [['x' => 10, 'y' => 20, 'type' => 'amassado']],
        ])->assertRedirect();

        $v = Vehicle::where('plate', 'XYZ9A87')->first();
        $this->assertNotNull($v);
        $this->assertSame(45000, $v->km);
        $this->assertSame('11911112222', $v->client->phone);
        $this->assertCount(1, ServiceOrder::where('vehicle_id', $v->id)->first()->damages);
    }

    public function test_so_master_acessa_usuarios_e_exclui_os(): void
    {
        $this->actingAs($this->balcao)->get('/usuarios')->assertForbidden();
        $this->actingAs($this->balcao)->delete("/os/{$this->osCarlos->id}")->assertForbidden();
        $this->actingAs($this->master)->get('/usuarios')->assertOk();
    }

    public function test_usuario_desativado_nao_consegue_entrar(): void
    {
        $this->balcao->update(['active' => false]);
        $this->post('/login', ['email' => 'balcao@pista1.test', 'password' => 'pista1234']);
        $this->assertGuest();
    }
}
