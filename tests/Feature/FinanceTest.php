<?php

namespace Tests\Feature;

use App\Enums\OsStatus;
use App\Models\FinanceEntry;
use App\Models\Partner;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Support\Finance;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FinanceTest extends TestCase
{
    use RefreshDatabase;

    private User $master;
    private User $balcao;
    private User $mecanico;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->master = User::where('email', 'socio1@pista1.test')->first();
        $this->balcao = User::where('email', 'balcao@pista1.test')->first();
        $this->mecanico = User::where('email', 'carlos@pista1.test')->first();
    }

    public function test_so_master_acessa_o_financeiro(): void
    {
        foreach ([$this->balcao, $this->mecanico] as $u) {
            $this->actingAs($u);
            $this->get('/financeiro')->assertForbidden();
            $this->get('/financeiro/lancamentos')->assertForbidden();
            $this->get('/financeiro/socios')->assertForbidden();
            $this->post('/financeiro/lancamentos', [])->assertForbidden();
        }
        $this->actingAs($this->master);
        $this->get('/financeiro')->assertOk();
        $this->get('/financeiro/lancamentos')->assertOk();
        $this->get('/financeiro/socios')->assertOk();
    }

    public function test_despesa_parcelada_divide_o_valor_sem_perder_centavos(): void
    {
        $this->actingAs($this->master)->post('/financeiro/lancamentos', [
            'type' => 'saida', 'category' => 'autopecas', 'description' => 'Kit embreagem', 'party' => 'Auto Peças X',
            'amount' => '1.000,00', 'due_date' => '2026-12-10', 'installments' => 3, 'paid' => true, 'paid_at' => '2026-12-10',
        ])->assertSessionHasNoErrors();

        $rows = FinanceEntry::where('party', 'Auto Peças X')->orderBy('due_date')->get();
        $this->assertCount(3, $rows);
        $this->assertSame([333.33, 333.33, 333.34], $rows->pluck('amount')->all());
        $this->assertSame(['2026-12-10', '2027-01-10', '2027-02-10'], $rows->map(fn ($r) => $r->due_date->toDateString())->all());
        $this->assertNotNull($rows[0]->paid_at);
        $this->assertNull($rows[1]->paid_at);
        $this->assertSame('Kit embreagem (1/3)', $rows[0]->description);
    }

    public function test_categoria_precisa_ser_do_tipo_certo(): void
    {
        $this->actingAs($this->master)->post('/financeiro/lancamentos', [
            'type' => 'entrada', 'category' => 'aluguel', 'description' => 'x', 'amount' => '10', 'due_date' => '2026-12-01',
        ])->assertSessionHasErrors('category');
    }

    public function test_baixa_e_estorno(): void
    {
        $open = FinanceEntry::whereNull('paid_at')->where('type', 'saida')->first();
        $this->actingAs($this->master)->patch("/financeiro/lancamentos/{$open->id}/baixa")->assertSessionHasNoErrors();
        $this->assertNotNull($open->fresh()->paid_at);
        $this->patch("/financeiro/lancamentos/{$open->id}/estorno");
        $this->assertNull($open->fresh()->paid_at);
    }

    public function test_equilibrio_dos_socios(): void
    {
        $bal = Finance::partnerBalance();
        $this->assertSame(15700.0, $bal['total']);
        $byName = collect($bal['partners'])->keyBy('name');
        $this->assertSame(767.19, $byName['Sócio 1']['diff']);
        $this->assertSame(-532.81, $byName['Sócio 2']['diff']);

        // Sócio 2 aporta o que falta e fica em dia
        $p2 = Partner::where('name', 'Sócio 2')->first();
        $this->actingAs($this->master)->post('/financeiro/socios/movimentos', [
            'partner_id' => $p2->id, 'type' => 'aporte', 'amount' => '1.300,00', 'date' => '2026-11-24',
        ])->assertSessionHasNoErrors();
        $after = collect(Finance::partnerBalance()['partners'])->keyBy('name');
        $this->assertGreaterThan(0, $after['Sócio 2']['diff']);
    }

    public function test_aporte_entra_no_saldo_de_caixa(): void
    {
        $before = Finance::cashBalance();
        $p = Partner::first();
        $this->actingAs($this->master)->post('/financeiro/socios/movimentos', ['partner_id' => $p->id, 'type' => 'aporte', 'amount' => '500', 'date' => today()->toDateString()]);
        $this->assertSame(round($before + 500, 2), Finance::cashBalance());
    }

    public function test_balcao_registra_pagamento_da_os_em_parcelas(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Pronto)->first();
        $total = $os->load('items')->total();

        $this->actingAs($this->balcao)->post("/os/{$os->id}/pagamentos", [
            'amount' => number_format($total, 2, ',', '.'), 'payment_method' => 'credito', 'installments' => 2, 'received' => true,
        ])->assertSessionHasNoErrors();

        $entries = FinanceEntry::where('service_order_id', $os->id)->get();
        $this->assertCount(2, $entries);
        $this->assertEqualsWithDelta($total, $entries->sum('amount'), 0.001);
        $this->assertSame('servicos', $entries[0]->category);

        $this->get("/os/{$os->id}")->assertInertia(fn (Assert $page) => $page
            ->where('os.billed_total', fn ($v) => abs((float) $v - $total) < 0.001)
            ->has('os.payments', 2)
        );

        // mecânico não vê pagamentos
        $this->actingAs($this->mecanico)->get("/os/{$os->id}")->assertInertia(fn (Assert $page) => $page->missing('os.payments')->missing('os.paid_total'));
        $this->post("/os/{$os->id}/pagamentos", ['amount' => '10', 'payment_method' => 'pix'])->assertForbidden();
    }
}
