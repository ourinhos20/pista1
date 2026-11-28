<?php

namespace Tests\Feature;

use App\Enums\OsStatus;
use App\Models\FinanceEntry;
use App\Models\Partner;
use App\Models\PartnerMovement;
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
            $this->get($this->p('/financeiro'))->assertForbidden();
            $this->get($this->p('/financeiro/lancamentos'))->assertForbidden();
            $this->get($this->p('/financeiro/socios'))->assertForbidden();
            $this->post($this->p('/financeiro/lancamentos'), [])->assertForbidden();
        }
        $this->actingAs($this->master);
        $this->get($this->p('/financeiro'))->assertOk();
        $this->get($this->p('/financeiro/lancamentos'))->assertOk();
        $this->get($this->p('/financeiro/socios'))->assertOk();
    }

    public function test_despesa_parcelada_divide_o_valor_sem_perder_centavos(): void
    {
        $this->actingAs($this->master)->post($this->p('/financeiro/lancamentos'), [
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
        $this->actingAs($this->master)->post($this->p('/financeiro/lancamentos'), [
            'type' => 'entrada', 'category' => 'aluguel', 'description' => 'x', 'amount' => '10', 'due_date' => '2026-12-01',
        ])->assertSessionHasErrors('category');
    }

    public function test_baixa_e_estorno(): void
    {
        $open = FinanceEntry::whereNull('paid_at')->where('type', 'saida')->first();
        $this->actingAs($this->master)->patch($this->p("/financeiro/lancamentos/{$open->id}/baixa"))->assertSessionHasNoErrors();
        $this->assertNotNull($open->fresh()->paid_at);
        $this->patch($this->p("/financeiro/lancamentos/{$open->id}/estorno"));
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
        $this->actingAs($this->master)->post($this->p('/financeiro/socios/movimentos'), [
            'partner_id' => $p2->id, 'type' => 'aporte', 'amount' => '1.300,00', 'date' => '2026-11-24',
        ])->assertSessionHasNoErrors();
        $after = collect(Finance::partnerBalance()['partners'])->keyBy('name');
        $this->assertGreaterThan(0, $after['Sócio 2']['diff']);
    }

    public function test_aporte_entra_no_saldo_de_caixa(): void
    {
        $before = Finance::cashBalance();
        $p = Partner::first();
        $this->actingAs($this->master)->post($this->p('/financeiro/socios/movimentos'), ['partner_id' => $p->id, 'type' => 'aporte', 'amount' => '500', 'date' => today()->toDateString()]);
        $this->assertSame(round($before + 500, 2), Finance::cashBalance());
    }

    public function test_balcao_registra_pagamento_da_os_em_parcelas(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Pronto)->first();
        $total = $os->load('items')->total();

        $this->actingAs($this->balcao)->post($this->p("/os/{$os->id}/pagamentos"), [
            'amount' => number_format($total, 2, ',', '.'), 'payment_method' => 'credito', 'installments' => 2, 'received' => true,
        ])->assertSessionHasNoErrors();

        $entries = FinanceEntry::where('service_order_id', $os->id)->get();
        $this->assertCount(2, $entries);
        $this->assertEqualsWithDelta($total, $entries->sum('amount'), 0.001);
        $this->assertSame('servicos', $entries[0]->category);

        $this->get($this->p("/os/{$os->id}"))->assertInertia(fn (Assert $page) => $page
            ->where('os.billed_total', fn ($v) => abs((float) $v - $total) < 0.001)
            ->has('os.payments', 2)
        );

        // mecânico não vê pagamentos
        $this->actingAs($this->mecanico)->get($this->p("/os/{$os->id}"))->assertInertia(fn (Assert $page) => $page->missing('os.payments')->missing('os.paid_total'));
        $this->post($this->p("/os/{$os->id}/pagamentos"), ['amount' => '10', 'payment_method' => 'pix'])->assertForbidden();
    }

    public function test_nova_entrada_vincula_a_os_e_aparece_nos_pagamentos_dela(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Pronto)->first();
        $total = $os->load('items')->total();

        // a OS pronta sem pagamento aparece no painel e na lista da "Nova entrada"
        $this->actingAs($this->master)->get($this->p('/financeiro'))->assertInertia(fn (Assert $page) => $page
            ->where('toBill', fn ($rows) => collect($rows)->contains(fn ($r) => $r['id'] === $os->id && abs($r['remaining'] - $total) < 0.001))
            ->where('orders', fn ($rows) => collect($rows)->contains('id', $os->id))
            // lista de nomes separada: clientes na entrada, fornecedores na saída
            ->where('parties.saida', fn ($n) => collect($n)->contains('Auto Peças Brasil'))
            ->where('parties.entrada', fn ($n) => ! collect($n)->contains('Auto Peças Brasil'))
        );

        $this->post($this->p('/financeiro/lancamentos'), [
            'type' => 'entrada', 'category' => 'servicos', 'description' => "OS {$os->number()}", 'party' => 'Lucas',
            'amount' => number_format($total, 2, ',', '.'), 'due_date' => today()->toDateString(), 'paid' => true,
            'payment_method' => 'pix', 'service_order_id' => $os->id,
        ])->assertSessionHasNoErrors();

        $this->assertSame(1, FinanceEntry::where('service_order_id', $os->id)->count());
        $this->get($this->p('/financeiro'))->assertInertia(fn (Assert $page) => $page
            ->where('toBill', fn ($rows) => ! collect($rows)->contains('id', $os->id)));

        // despesa não pode ser ligada a uma OS (contaria como pagamento do cliente)
        $this->post($this->p('/financeiro/lancamentos'), [
            'type' => 'saida', 'category' => 'autopecas', 'description' => 'x', 'amount' => '10', 'due_date' => today()->toDateString(), 'service_order_id' => $os->id,
        ])->assertSessionHasErrors('service_order_id');
    }

    public function test_despesa_paga_pelo_socio_vira_aporte_e_desfaz_junto(): void
    {
        $p1 = Partner::where('name', 'Sócio 1')->first();
        $cash = Finance::cashBalance();
        $before = collect(Finance::partnerBalance()['partners'])->firstWhere('id', $p1->id)['aportes'];

        $this->actingAs($this->master)->post($this->p('/financeiro/lancamentos'), [
            'type' => 'saida', 'category' => 'energia_agua', 'description' => 'Conta de luz', 'amount' => '300,00',
            'due_date' => today()->toDateString(), 'paid' => true, 'paid_at' => today()->toDateString(), 'partner_id' => $p1->id,
        ])->assertSessionHasNoErrors();

        $entry = FinanceEntry::where('description', 'Conta de luz')->first();
        $mv = PartnerMovement::where('finance_entry_id', $entry->id)->first();
        $this->assertSame('aporte', $mv->type);
        $this->assertSame(300.0, (float) $mv->amount);
        // o caixa da oficina não mudou: a despesa saiu do bolso do sócio
        $this->assertSame($cash, Finance::cashBalance());
        $this->assertSame(round($before + 300, 2), collect(Finance::partnerBalance()['partners'])->firstWhere('id', $p1->id)['aportes']);

        // o movimento só se desfaz pelo lançamento
        $this->delete($this->p("/financeiro/socios/movimentos/{$mv->id}"))->assertSessionHas('error');
        $this->patch($this->p("/financeiro/lancamentos/{$entry->id}/estorno"));
        $this->assertNull(PartnerMovement::find($mv->id));
    }

    public function test_baixa_grava_data_e_forma(): void
    {
        $open = FinanceEntry::whereNull('paid_at')->where('type', 'saida')->first();
        $this->actingAs($this->master)->patch($this->p("/financeiro/lancamentos/{$open->id}/baixa"), ['paid_at' => '2026-11-20', 'payment_method' => 'boleto'])->assertSessionHasNoErrors();
        $open->refresh();
        $this->assertSame('2026-11-20', $open->paid_at->toDateString());
        $this->assertSame('boleto', $open->payment_method);
    }

    public function test_participacao_aceita_virgula(): void
    {
        $p = Partner::first();
        $this->actingAs($this->master)->put($this->p("/financeiro/socios/{$p->id}"), ['name' => $p->name, 'share' => '33,34', 'active' => true])->assertSessionHasNoErrors();
        $this->assertEqualsWithDelta(33.34, (float) $p->fresh()->share, 0.001);
    }

    public function test_exclui_varios_lancamentos_de_uma_vez(): void
    {
        $p1 = Partner::where('name', 'Sócio 1')->first();
        $this->actingAs($this->master)->post($this->p('/financeiro/lancamentos'), [
            'type' => 'saida', 'category' => 'outras_despesas', 'description' => 'Lote A', 'amount' => '10', 'due_date' => today()->toDateString(),
            'paid' => true, 'paid_at' => today()->toDateString(), 'partner_id' => $p1->id,
        ]);
        $this->post($this->p('/financeiro/lancamentos'), [
            'type' => 'saida', 'category' => 'outras_despesas', 'description' => 'Lote B', 'amount' => '20', 'due_date' => today()->toDateString(),
        ]);
        $ids = FinanceEntry::whereIn('description', ['Lote A', 'Lote B'])->pluck('id')->all();

        $this->actingAs($this->balcao)->delete($this->p('/financeiro/lancamentos'), ['ids' => $ids])->assertForbidden();
        $this->actingAs($this->master)->delete($this->p('/financeiro/lancamentos'), ['ids' => $ids])->assertSessionHas('success', '2 lançamentos excluídos.');
        $this->assertSame(0, FinanceEntry::whereIn('id', $ids)->count());
        // o aporte do sócio que veio do lançamento também saiu
        $this->assertSame(0, PartnerMovement::whereIn('finance_entry_id', $ids)->count());
    }
}
