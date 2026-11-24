<?php

namespace Tests\Feature;

use App\Enums\OsStatus;
use App\Models\FinanceEntry;
use App\Models\Purchase;
use App\Models\ServiceOrder;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SuppliersPurchasesTest extends TestCase
{
    use RefreshDatabase;

    private User $master;
    private User $balcao;
    private User $carlos;
    private Supplier $sup;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->master = User::where('email', 'socio1@pista1.test')->first();
        $this->balcao = User::where('email', 'balcao@pista1.test')->first();
        $this->carlos = User::where('email', 'carlos@pista1.test')->first();
        $this->sup = Supplier::where('name', 'Auto Peças Brasil')->first();
    }

    public function test_mecanico_nao_acessa_compras_e_fornecedores(): void
    {
        $this->actingAs($this->carlos);
        $this->get($this->p('/compras'))->assertForbidden();
        $this->get($this->p('/fornecedores'))->assertForbidden();
        $this->get($this->p("/fornecedores/{$this->sup->id}"))->assertForbidden();

        $this->actingAs($this->balcao);
        $this->get($this->p('/compras'))->assertOk();
        $this->get($this->p('/fornecedores'))->assertOk();
    }

    public function test_catalogo_de_pecas_nao_existe_mais(): void
    {
        $this->actingAs($this->balcao)->get($this->p('/pecas'))->assertNotFound();
    }

    public function test_balcao_cadastra_fornecedor(): void
    {
        $this->actingAs($this->balcao)->post($this->p('/fornecedores'), [
            'name' => 'Retífica Central', 'document' => '11.222.333/0001-44', 'phone' => '(11) 98888-7777', 'active' => true,
        ])->assertSessionHasNoErrors();

        $s = Supplier::where('name', 'Retífica Central')->first();
        $this->assertSame('11222333000144', $s->document);
        $this->assertSame('11988887777', $s->phone);
    }

    public function test_ficha_do_fornecedor_filtra_compras_por_mes(): void
    {
        $this->actingAs($this->balcao);
        $mes = now()->format('Y-m');
        $passado = now()->subMonthNoOverflow()->format('Y-m');

        $this->get($this->p("/fornecedores/{$this->sup->id}?mes={$mes}"))->assertOk()
            ->assertInertia(fn (Assert $p) => $p
                ->component('pecas/fornecedor')
                ->has('purchases', 1)
                ->where('purchases.0.invoice', '45871')
                ->where('summary.period_total', fn ($v) => abs($v - (20 * 28 + 6 * 18 + 2 * 26)) < 0.01)
                ->where('months', fn ($m) => collect($m)->contains($mes) && collect($m)->contains($passado))
            );

        $this->get($this->p("/fornecedores/{$this->sup->id}?mes={$passado}"))
            ->assertInertia(fn (Assert $p) => $p->has('purchases', 1)->where('purchases.0.invoice', '45210'));

        $this->get($this->p("/fornecedores/{$this->sup->id}?mes=todos"))
            ->assertInertia(fn (Assert $p) => $p->has('purchases', 2));
    }

    public function test_compra_para_os_lanca_pecas_e_conta_a_pagar(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Diagnostico)->first();
        $before = $os->items()->count();

        $this->actingAs($this->balcao)->post($this->p('/compras'), [
            'supplier_id' => $this->sup->id, 'invoice' => '9988', 'date' => '2026-11-20',
            'service_order_id' => $os->id, 'add_to_os' => true,
            'items' => [['description' => 'Sensor de oxigênio', 'quantity' => '1', 'unit_cost' => '180,00', 'sale_price' => '320,00']],
            'payment_method' => 'boleto', 'installments' => 2, 'first_due' => '2026-12-05', 'paid' => false,
        ])->assertSessionHasNoErrors()->assertRedirect(route('os.show', $os->id));

        $this->assertSame($before + 1, $os->items()->count());
        $item = $os->items()->latest('id')->first();
        $this->assertSame('Sensor de oxigênio', $item->description);
        $this->assertSame(320.0, $item->unit_price);

        $purchase = Purchase::where('invoice', '9988')->first();
        $this->assertSame(180.0, $purchase->total);
        $entries = FinanceEntry::where('purchase_id', $purchase->id)->get();
        $this->assertCount(2, $entries);
        $this->assertSame('autopecas', $entries[0]->category);
        $this->assertEqualsWithDelta(180, $entries->sum('amount'), 0.001);

        // margem para os sócios usa as compras da OS
        $this->actingAs($this->master)->get($this->p("/os/{$os->id}"))->assertInertia(fn (Assert $p) => $p->where('os.costs.purchases', fn ($v) => abs($v - 180) < 0.01));
        $this->actingAs($this->balcao)->get($this->p("/os/{$os->id}"))->assertInertia(fn (Assert $p) => $p->missing('os.costs'));
    }

    public function test_compra_paga_nao_pode_ser_excluida(): void
    {
        $this->actingAs($this->balcao)->post($this->p('/compras'), [
            'supplier_id' => $this->sup->id, 'date' => '2026-11-20',
            'items' => [['description' => 'Fluido de freio', 'quantity' => '2', 'unit_cost' => '25']],
            'first_due' => '2026-11-20', 'paid' => true, 'payment_method' => 'pix',
        ])->assertSessionHasNoErrors();
        $purchase = Purchase::latest('id')->first();

        $this->delete($this->p("/compras/{$purchase->id}"))->assertSessionHas('error');
        $this->assertNotNull($purchase->fresh());

        FinanceEntry::where('purchase_id', $purchase->id)->update(['paid_at' => null]);
        $this->delete($this->p("/compras/{$purchase->id}"))->assertSessionHas('success');
        $this->assertNull($purchase->fresh());
    }
}
