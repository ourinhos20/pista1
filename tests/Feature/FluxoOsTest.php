<?php

namespace Tests\Feature;

use App\Enums\OsStatus;
use App\Models\Client;
use App\Models\ServiceOrder;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Vehicle;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Fluxo da OS sem gargalos: agendamento → chegada → vistoria → diagnóstico → orçamento → execução. */
class FluxoOsTest extends TestCase
{
    use RefreshDatabase;

    private User $balcao;
    private User $carlos;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->balcao = User::where('email', 'balcao@pista1.test')->first();
        $this->carlos = User::where('email', 'carlos@pista1.test')->first();
    }

    /* ------------------------------------------------------ abertura */

    public function test_agendamento_so_com_dados_basicos_sem_placa(): void
    {
        $this->actingAs($this->balcao)->post($this->p('/os'), [
            'name' => 'Marcos Teles', 'phone' => '(14) 99876-5432', 'vehicle_model' => 'Fiat Uno', 'vehicle_year' => '2012',
            'service_type' => 'revisao', 'complaint' => 'Revisão dos 100 mil', 'scheduled_at' => now()->addDay()->format('Y-m-d H:i'),
        ])->assertSessionHasNoErrors()->assertRedirect();

        $client = Client::where('phone', '14998765432')->first();
        $this->assertNotNull($client);
        $os = $client->serviceOrders()->first();
        $this->assertSame(OsStatus::Aguardando, $os->status);
        $this->assertNull($os->vehicle->plate);
        $this->assertSame('revisao', $os->service_type);
    }

    public function test_cliente_presente_exige_placa(): void
    {
        $this->actingAs($this->balcao)->post($this->p('/os'), [
            'name' => 'Sem Placa', 'phone' => '11900001111', 'complaint' => 'Barulho', 'arrived' => true,
        ])->assertSessionHasErrors('plate');
    }

    public function test_cliente_que_ja_veio_e_reaproveitado(): void
    {
        $antigo = Client::with('vehicles')->whereHas('vehicles', fn ($v) => $v->whereNotNull('plate'))->first();
        $carro = $antigo->vehicles->first();
        $clientes = Client::count();

        // a busca acha pelo CPF, pelo telefone ou pela placa
        $this->actingAs($this->balcao);
        if ($antigo->document) {
            $this->getJson($this->p('/clientes/buscar?q='.substr($antigo->document, 0, 6)))->assertOk()->assertJsonFragment(['id' => $antigo->id]);
        }
        $this->getJson($this->p('/clientes/buscar?q='.$carro->plate))->assertOk()->assertJsonFragment(['id' => $antigo->id]);

        $this->post($this->p('/os'), ['client_id' => $antigo->id, 'vehicle_id' => $carro->id, 'complaint' => 'Voltou com barulho', 'arrived' => true])
            ->assertSessionHasNoErrors();
        $this->assertSame($clientes, Client::count());
        $this->assertSame(OsStatus::Recebido, ServiceOrder::latest('id')->first()->status);
    }

    /* ------------------------------------------------------ chegada */

    public function test_cliente_chegou_completa_cadastro_e_libera_para_o_mecanico(): void
    {
        $os = ServiceOrder::where('origin', 'site')->first(); // agendou pelo site, sem placa
        $this->assertNull($os->vehicle->plate);

        $this->actingAs($this->balcao)->post($this->p("/os/{$os->id}/chegou"), ['vehicle' => ['plate' => '']])->assertSessionHasErrors('vehicle.plate');
        $this->assertSame(OsStatus::Aguardando, $os->fresh()->status);

        $this->post($this->p("/os/{$os->id}/chegou"), [
            'client' => ['name' => 'Ricardo Lima', 'document' => '123.456.789-09', 'address' => 'Rua A, 10', 'city' => 'Ourinhos'],
            'vehicle' => ['plate' => 'pol-1a23', 'color' => 'Prata'],
        ])->assertSessionHasNoErrors();

        $os->refresh();
        $this->assertSame(OsStatus::Recebido, $os->status);
        $this->assertNotNull($os->checked_in_at);
        $this->assertSame('POL1A23', $os->vehicle->plate);
        $this->assertSame('12345678909', $os->client->document);

        // o mecânico vê na fila
        $this->actingAs($this->carlos)->get($this->p('/mecanico'))
            ->assertInertia(fn (Assert $page) => $page->where('fila', fn ($fila) => collect($fila)->contains('id', $os->id)));
    }

    public function test_placa_que_ja_existe_junta_com_o_carro_cadastrado(): void
    {
        $existente = Vehicle::whereNotNull('plate')->first();
        $os = ServiceOrder::where('origin', 'site')->first();
        $provisorio = $os->vehicle_id;

        $this->actingAs($this->balcao)->put($this->p("/os/{$os->id}/cadastro"), ['vehicle' => ['plate' => $existente->plate]])->assertSessionHasNoErrors();

        $this->assertSame($existente->id, $os->fresh()->vehicle_id);
        $this->assertNull(Vehicle::find($provisorio));
    }

    public function test_cadastro_pode_ser_editado_depois_de_aberta(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Execucao)->first();
        $this->actingAs($this->balcao)->put($this->p("/os/{$os->id}/cadastro"), ['client' => ['email' => 'novo@cliente.com', 'city' => 'Marília']])
            ->assertSessionHasNoErrors();
        $this->assertSame('Marília', $os->client->fresh()->city);

        // mecânico não mexe no cadastro
        $this->actingAs($this->carlos)->put($this->p("/os/{$os->id}/cadastro"), ['client' => ['city' => 'X']])->assertForbidden();
    }

    /* ------------------------------------------------------ vistoria */

    public function test_mecanico_faz_vistoria_antes_de_enviar_o_diagnostico(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Recebido)->first();
        $this->actingAs($this->carlos);

        $this->patch($this->p("/os/{$os->id}/status"), ['status' => 'diagnostico'])->assertSessionHasNoErrors();
        $this->patch($this->p("/os/{$os->id}/status"), ['status' => 'orcamento'])->assertSessionHasErrors('status');
        $this->assertSame(OsStatus::Diagnostico, $os->fresh()->status);

        $this->patch($this->p("/os/{$os->id}/vistoria"), ['fuel_level' => 2])->assertSessionHasErrors('km_in');
        $this->patch($this->p("/os/{$os->id}/vistoria"), [
            'km_in' => 118000, 'fuel_level' => 2, 'checklist' => ['estepe' => true],
            'damages' => [['x' => 10, 'y' => 20, 'type' => 'risco']],
        ])->assertSessionHasNoErrors();

        $os->refresh();
        $this->assertNotNull($os->inspected_at);
        $this->assertSame($this->carlos->id, $os->inspected_by);
        $this->assertCount(1, $os->damages);
        $this->assertSame(118000, $os->vehicle->fresh()->km);

        $this->patch($this->p("/os/{$os->id}/status"), ['status' => 'orcamento'])->assertSessionHasNoErrors();
        $this->assertSame(OsStatus::Orcamento, $os->fresh()->status);
    }

    public function test_agendado_ainda_nao_tem_vistoria(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Aguardando)->first();
        $this->actingAs($this->carlos)->patch($this->p("/os/{$os->id}/vistoria"), ['km_in' => 1, 'fuel_level' => 1])->assertStatus(422);
    }

    /* ------------------------------------------------- execução / peças */

    public function test_item_complementar_na_execucao_vai_para_o_cliente_sem_parar_o_servico(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Execucao)->first();

        $this->actingAs($this->carlos)->post($this->p("/os/{$os->id}/itens"), ['type' => 'peca', 'description' => 'Correia do alternador', 'quantity' => 1])->assertSessionHasNoErrors();
        $item = $os->items()->latest('id')->first();
        $this->assertTrue($item->extra);
        $this->assertNull($item->approval);

        // sem preço, o link ainda não pede nada ao cliente
        $this->get(route('orcamento.show', $os->public_token))->assertDontSee('Correia do alternador');

        $this->actingAs($this->balcao)->put($this->p("/os/{$os->id}/itens/{$item->id}"), ['unit_price' => 150, 'quantity' => 1, 'description' => 'Correia do alternador', 'type' => 'peca'])->assertSessionHasNoErrors();
        $this->get(route('orcamento.show', $os->public_token))->assertSee('Correia do alternador');

        $this->post(route('orcamento.decide', $os->public_token), ['decision' => 'aprovar', 'items' => [$item->id], 'name' => 'João', 'agree' => '1']);
        $this->assertSame('aprovado', $item->fresh()->approval);
        $this->assertSame(OsStatus::Execucao, $os->fresh()->status);
    }

    public function test_aguardando_pecas_volta_para_execucao_quando_a_compra_e_lancada(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Execucao)->first();
        $this->actingAs($this->balcao)->patch($this->p("/os/{$os->id}/status"), ['status' => 'pecas'])->assertSessionHasNoErrors();
        $this->assertSame(OsStatus::Pecas, $os->fresh()->status);

        $sup = Supplier::first() ?? Supplier::create(['name' => 'Fornecedor Teste']);
        $this->post($this->p('/compras'), [
            'supplier_id' => $sup->id, 'date' => now()->format('Y-m-d'), 'service_order_id' => $os->id,
            'items' => [['description' => 'Bomba de água', 'quantity' => '1', 'unit_cost' => '90,00']],
            'payment_method' => 'pix', 'installments' => 1, 'first_due' => now()->format('Y-m-d'), 'paid' => true,
        ])->assertSessionHasNoErrors();

        $this->assertSame(OsStatus::Execucao, $os->fresh()->status);
    }

    public function test_balcao_marca_aprovacao_por_item(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Execucao)->first();
        $item = $os->items()->first();

        $this->actingAs($this->balcao)->patch($this->p("/os/{$os->id}/itens/{$item->id}/aprovacao"), ['approval' => 'recusado'])->assertSessionHasNoErrors();
        $this->assertSame('recusado', $item->fresh()->approval);

        $this->actingAs($this->carlos)->patch($this->p("/os/{$os->id}/itens/{$item->id}/aprovacao"), ['approval' => 'aprovado'])->assertForbidden();
    }

    public function test_tempo_na_etapa_e_registrado(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Recebido)->first();
        $os->forceFill(['status_changed_at' => now()->subHours(3)])->saveQuietly();

        $this->actingAs($this->carlos)->patch($this->p("/os/{$os->id}/status"), ['status' => 'diagnostico']);
        $this->assertTrue($os->fresh()->status_changed_at->greaterThan(now()->subMinute()));
    }

    public function test_painel_mostra_etapas_e_a_espera_mais_antiga(): void
    {
        $master = User::where('email', 'socio1@pista1.test')->first();
        foreach ([$this->balcao, $master] as $u) {
            $this->actingAs($u)->get($this->p('/dashboard'))->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('dashboard')
                    ->where('counts.recebido', 1)
                    ->has('oldest.recebido')
                );
        }
    }

    public function test_fichas_em_branco_para_imprimir(): void
    {
        $this->actingAs($this->carlos);
        foreach (['entrada', 'diagnostico', 'revisao'] as $tipo) {
            $this->get($this->p("/fichas/{$tipo}"))->assertOk()
                ->assertInertia(fn (Assert $page) => $page->component("print/{$tipo}")->where('os.number', '')->where('os.client', null)->where('blank', true));
        }
        // a via do cliente (com valores) é só do balcão
        $this->get($this->p('/fichas/cliente'))->assertForbidden();
        $this->get($this->p('/fichas/qualquer'))->assertNotFound();

        $this->actingAs($this->balcao)->get($this->p('/fichas/cliente'))->assertOk();
    }

    /* ------------------------------------------------------------ bot */

    public function test_bot_sem_token_configurado_fica_desligado(): void
    {
        config(['oficina.bot_token' => '']);
        $this->postJson('/api/bot/agendamento', ['nome' => 'X'])->assertNotFound();
    }

    public function test_bot_com_token_errado_e_recusado(): void
    {
        config(['oficina.bot_token' => 'segredo-do-bot-123']);
        $this->postJson('/api/bot/agendamento', ['nome' => 'X'], ['Authorization' => 'Bearer errado'])->assertStatus(401);
    }

    public function test_bot_agenda_e_a_os_aparece_para_o_balcao(): void
    {
        config(['oficina.bot_token' => 'segredo-do-bot-123']);

        $this->postJson('/api/bot/agendamento', [
            'nome' => 'Paula Mendes', 'telefone' => '(14) 99111-2233', 'carro' => 'Hyundai HB20', 'ano' => '2022',
            'tipo' => 'Revisão', 'descricao' => 'Quero fazer a revisão dos 30 mil', 'data_hora' => '10/12/2026 09:00',
        ], ['Authorization' => 'Bearer segredo-do-bot-123'])
            ->assertCreated()
            ->assertJson(['ok' => true, 'agendado_para' => '10/12/2026 09:00']);

        $os = ServiceOrder::latest('id')->first();
        $this->assertSame('bot', $os->origin);
        $this->assertSame('revisao', $os->service_type);
        $this->assertSame(OsStatus::Aguardando, $os->status);
        $this->assertSame('14991112233', $os->client->phone);

        // telefone sem DDD é recusado
        $this->postJson('/api/bot/agendamento', ['nome' => 'Y', 'telefone' => '9911', 'descricao' => 'x'], ['X-Bot-Token' => 'segredo-do-bot-123'])->assertStatus(422);
    }
}
