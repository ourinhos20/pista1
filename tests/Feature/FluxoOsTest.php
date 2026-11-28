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
            'km_in' => 118000, 'fuel_level' => 2, 'checklist' => ['estepe' => true], 'chassis' => '9bwzzz377vt004251',
            'damages' => [['x' => 10, 'y' => 20, 'type' => 'risco']],
        ])->assertSessionHasNoErrors();

        $os->refresh();
        $this->assertNotNull($os->inspected_at);
        $this->assertSame($this->carlos->id, $os->inspected_by);
        $this->assertCount(1, $os->damages);
        $this->assertSame(118000, $os->vehicle->fresh()->km);
        // o mecânico anota o chassi na vistoria
        $this->assertSame('9BWZZZ377VT004251', $os->vehicle->fresh()->chassis);

        // vistoria feita, mas o checklist ainda não foi concluído
        $this->patch($this->p("/os/{$os->id}/status"), ['status' => 'orcamento'])->assertSessionHasErrors('status');
        $this->patch($this->p("/os/{$os->id}/concluir"))->assertSessionHasErrors('work'); // revisão sem nada marcado
        $this->patch($this->p("/os/{$os->id}/revisao"), ['revision' => ['oleo_motor' => 'trocar']]);
        $this->patch($this->p("/os/{$os->id}/concluir"))->assertSessionHasNoErrors();
        $this->assertNotNull($os->fresh()->work_done_at);

        $this->patch($this->p("/os/{$os->id}/status"), ['status' => 'orcamento'])->assertSessionHasNoErrors();
        $this->assertSame(OsStatus::Orcamento, $os->fresh()->status);
    }

    public function test_sequencia_do_mecanico_defeito_pede_diagnostico_escrito(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Recebido)->first();
        $os->update(['service_type' => 'defeito', 'diagnosis' => null]);
        $this->actingAs($this->carlos);

        // sem vistoria não conclui nada
        $this->patch($this->p("/os/{$os->id}/concluir"), ['diagnosis' => 'x'])->assertSessionHasErrors('work');
        $this->patch($this->p("/os/{$os->id}/vistoria"), ['km_in' => 200000, 'fuel_level' => 1]);

        $this->patch($this->p("/os/{$os->id}/concluir"), ['diagnosis' => ''])->assertSessionHasErrors('work');
        $this->patch($this->p("/os/{$os->id}/concluir"), ['diagnosis' => 'Bobina do 2º cilindro falhando.'])->assertSessionHasNoErrors();
        $this->assertSame('Bobina do 2º cilindro falhando.', $os->fresh()->diagnosis);

        // a tela recebe a etapa concluída (libera peças e fotos)
        $this->get($this->p("/os/{$os->id}"))->assertInertia(fn (Assert $page) => $page->where('os.work_done_at', fn ($v) => $v !== null));
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

    public function test_tela_inicial_e_a_lista_de_os_com_agendados_de_hoje_e_sem_valores(): void
    {
        $master = User::where('email', 'socio1@pista1.test')->first();
        $hoje = ServiceOrder::where('status', OsStatus::Aguardando)->whereDate('scheduled_at', today())->count();
        foreach ([$this->balcao, $master] as $u) {
            $this->actingAs($u)->get($this->p('/dashboard'))->assertRedirect($this->p('/os'));
            $this->get($this->p('/os'))->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('os/index')
                    ->has('today', $hoje)
                    ->missing('counts')
                    ->missing('month') // faturamento só no Financeiro
                );
        }
        // mecânico continua indo para a agenda
        $this->actingAs($this->carlos)->get($this->p('/dashboard'))->assertRedirect($this->p('/mecanico'));
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

    public function test_socio_exclui_os_com_pagamento_compra_e_fotos(): void
    {
        $master = User::where('email', 'socio1@pista1.test')->first();
        $os = ServiceOrder::where('status', OsStatus::Pronto)->first();
        $this->actingAs($this->balcao)->post($this->p("/os/{$os->id}/pagamentos"), ['amount' => '50,00', 'payment_method' => 'pix', 'received' => true]);
        $os->attachments()->create(['path' => 'f/x.jpg', 'thumb_path' => 'f/x_mini.jpg']);
        $sup = Supplier::first() ?? Supplier::create(['name' => 'Fornecedor Teste']);
        $this->post($this->p('/compras'), [
            'supplier_id' => $sup->id, 'date' => now()->format('Y-m-d'), 'service_order_id' => $os->id, 'first_due' => now()->format('Y-m-d'),
            'items' => [['description' => 'Filtro', 'quantity' => '1', 'unit_cost' => '20']], 'payment_method' => 'pix', 'installments' => 1, 'paid' => true,
        ]);

        $this->delete($this->p("/os/{$os->id}"))->assertForbidden(); // balcão não exclui
        $this->actingAs($master)->delete($this->p("/os/{$os->id}"))->assertRedirect($this->p('/os'));
        $this->assertNull(ServiceOrder::find($os->id));
        // o dinheiro recebido continua no financeiro
        $this->assertSame(1, \App\Models\FinanceEntry::where('type', 'entrada')->where('description', 'like', "OS {$os->number()}%")->count());
    }

    public function test_socio_exclui_varias_os_de_uma_vez(): void
    {
        $ids = ServiceOrder::where('status', OsStatus::Aguardando)->pluck('id')->all();
        $this->assertGreaterThan(1, count($ids));

        $this->actingAs($this->balcao)->delete($this->p('/os'), ['ids' => $ids])->assertForbidden();

        $master = User::where('email', 'socio1@pista1.test')->first();
        $this->actingAs($master)->delete($this->p('/os'), ['ids' => $ids])->assertSessionHas('success', count($ids).' OS excluídas.');
        $this->assertSame(0, ServiceOrder::whereIn('id', $ids)->count());
    }

    public function test_socio_exclui_clientes_e_fornecedores_sem_historico(): void
    {
        $master = User::where('email', 'socio1@pista1.test')->first();
        $novo = Client::create(['name' => 'Cadastro Errado', 'phone' => '11900000000']);
        $novo->vehicles()->create(['plate' => 'ERR0R00', 'model' => 'Teste']);
        $comOs = ServiceOrder::first()->client;

        $this->actingAs($this->balcao)->delete($this->p('/clientes'), ['ids' => [$novo->id]])->assertForbidden();
        $this->actingAs($master)->delete($this->p('/clientes'), ['ids' => [$novo->id, $comOs->id]])->assertSessionHas('success');
        $this->assertNull(Client::find($novo->id));
        $this->assertNull(Vehicle::where('plate', 'ERR0R00')->first()); // o carro sai junto
        $this->assertNotNull(Client::find($comOs->id)); // quem tem OS fica

        $sup = Supplier::create(['name' => 'Fornecedor Errado']);
        $this->delete($this->p('/fornecedores'), ['ids' => [$sup->id]])->assertSessionHas('success', '1 fornecedor excluído.');
        $this->assertNull(Supplier::find($sup->id));
    }

    public function test_fichas_de_cliente_e_veiculo_abrem(): void
    {
        $os = ServiceOrder::with(['client', 'vehicle'])->first();
        $this->actingAs($this->balcao);
        $this->get($this->p("/clientes/{$os->client_id}"))->assertOk();
        $this->get($this->p("/veiculos/{$os->vehicle_id}"))->assertOk();
        $this->get($this->p('/fornecedores'))->assertOk();
        $this->get($this->p('/compras'))->assertOk();
    }

    /* ------------------------------------------------------ catálogo FIPE */

    public function test_catalogo_de_marcas_e_modelos(): void
    {
        $this->actingAs($this->balcao);
        $this->getJson($this->p('/catalogo/marcas'))->assertOk()
            ->assertJsonFragment(['name' => 'Hyundai', 'popular' => true])
            ->assertJsonFragment(['name' => 'Chevrolet']);

        // modelos com versão e motor: a Tucson 2.0 é diferente da 2.7 V6
        $modelos = $this->getJson($this->p('/catalogo/modelos?marca=Hyundai'))->assertOk()->json();
        $this->assertContains('Tucson 2.0 16V Flex Aut.', $modelos);
        $this->assertTrue(collect($modelos)->contains(fn ($m) => str_starts_with($m, 'Tucson 2.7')));

        // o site também consulta (sem login), só nomes de modelo
        auth()->logout();
        $this->getJson(route('agendar.modelos', ['marca' => 'Fiat']))->assertOk()->assertJsonFragment(['Strada Freedom 1.3 Flex 8V CS Plus']);
    }

    public function test_nova_os_grava_marca_modelo_cor_e_chassi(): void
    {
        $this->actingAs($this->balcao)->post($this->p('/os'), [
            'name' => 'Paulo Reis', 'phone' => '14991234567',
            'vehicle_brand' => 'Hyundai', 'vehicle_model' => 'Tucson 2.7 MPFI 24V 175cv Aut.', 'vehicle_year' => '2010',
            'vehicle_color' => 'Prata', 'vehicle_chassis' => '9bh-a5181 3bb000001', 'plate' => 'TUC2A70', 'arrived' => true,
            'service_type' => 'defeito', 'complaint' => 'Falhando',
        ])->assertSessionHasNoErrors();

        $v = Vehicle::where('plate', 'TUC2A70')->first();
        $this->assertSame('Hyundai', $v->brand);
        $this->assertSame('Tucson 2.7 MPFI 24V 175cv Aut.', $v->model);
        $this->assertSame('Prata', $v->color);
        $this->assertSame('9BHA51813BB000001', $v->chassis);
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
