<?php

namespace Tests\Feature;

use App\Enums\OsStatus;
use App\Models\FinanceEntry;
use App\Models\Part;
use App\Models\Purchase;
use App\Models\ServiceOrder;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PartsPurchasesTest extends TestCase
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
        $this->sup = Supplier::first();
    }

    public function test_mecanico_nao_acessa_pecas_compras_e_fornecedores(): void
    {
        $this->actingAs($this->carlos);
        $this->get($this->p('/pecas'))->assertForbidden();
        $this->get($this->p('/compras'))->assertForbidden();
        $this->get($this->p('/fornecedores'))->assertForbidden();

        $this->actingAs($this->balcao);
        $this->get($this->p('/pecas'))->assertOk();
        $this->get($this->p('/compras'))->assertOk();
        $this->get($this->p('/fornecedores'))->assertOk();
    }

    public function test_estoque_e_calculado_compras_menos_uso_nas_os(): void
    {
        $oleo = Part::withStock()->where('description', 'Óleo 5W30 sintético')->first();
        $this->assertSame(8.5, $oleo->stock()); // 20 comprados - 11,5 usados nas OS do exemplo

        // OS cancelada devolve ao estoque
        ServiceOrder::whereHas('items', fn ($q) => $q->where('part_id', $oleo->id))->first()->update(['status' => OsStatus::Cancelada]);
        $this->assertGreaterThan(8.5, Part::withStock()->find($oleo->id)->stock());
    }

    public function test_compra_para_os_lanca_pecas_catalogo_e_conta_a_pagar(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Diagnostico)->first();
        $itemsBefore = $os->items()->count();

        $this->actingAs($this->balcao)->post($this->p('/compras'), [
            'supplier_id' => $this->sup->id, 'invoice' => '9988', 'date' => '2026-11-20',
            'service_order_id' => $os->id, 'add_to_os' => true,
            'items' => [
                ['description' => 'Sensor de oxigênio', 'quantity' => '1', 'unit_cost' => '180,00', 'sale_price' => '320,00', 'save_part' => true],
            ],
            'payment_method' => 'boleto', 'installments' => 2, 'first_due' => '2026-12-05', 'paid' => false,
        ])->assertSessionHasNoErrors()->assertRedirect(route('os.show', $os->id));

        $part = Part::where('description', 'Sensor de oxigênio')->first();
        $this->assertNotNull($part);
        $this->assertSame(180.0, $part->cost_price);
        $this->assertSame(320.0, $part->sale_price);

        $this->assertSame($itemsBefore + 1, $os->items()->count());
        $item = $os->items()->latest('id')->first();
        $this->assertSame($part->id, $item->part_id);
        $this->assertSame(320.0, $item->unit_price);

        $purchase = Purchase::where('invoice', '9988')->first();
        $this->assertSame(180.0, $purchase->total);
        $entries = FinanceEntry::where('purchase_id', $purchase->id)->get();
        $this->assertCount(2, $entries);
        $this->assertSame('saida', $entries[0]->type);
        $this->assertSame('autopecas', $entries[0]->category);
        $this->assertEqualsWithDelta(180, $entries->sum('amount'), 0.001);

        // comprou 1 e já usou 1 na OS => estoque 0
        $this->assertSame(0.0, Part::withStock()->find($part->id)->stock());
    }

    public function test_compra_paga_nao_pode_ser_excluida(): void
    {
        $this->actingAs($this->balcao)->post($this->p('/compras'), [
            'supplier_id' => $this->sup->id, 'date' => '2026-11-20',
            'items' => [['description' => 'Fluido de freio', 'quantity' => '2', 'unit_cost' => '25', 'save_part' => false]],
            'first_due' => '2026-11-20', 'paid' => true, 'payment_method' => 'pix',
        ])->assertSessionHasNoErrors();
        $purchase = Purchase::latest('id')->first();

        $this->delete($this->p("/compras/{$purchase->id}"))->assertSessionHas('error');
        $this->assertNotNull($purchase->fresh());

        FinanceEntry::where('purchase_id', $purchase->id)->update(['paid_at' => null]);
        $this->delete($this->p("/compras/{$purchase->id}"))->assertSessionHas('success');
        $this->assertNull($purchase->fresh());
        $this->assertSame(0, FinanceEntry::where('purchase_id', $purchase->id)->count());
    }

    public function test_peca_do_catalogo_na_os_puxa_o_preco_de_venda(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Diagnostico)->first();
        $pastilha = Part::where('description', 'like', 'Pastilha%')->first();

        // mecânico pede a peça do catálogo: preço vem do catálogo (ele não vê)
        $this->actingAs($this->carlos)->post($this->p("/os/{$os->id}/itens"), ['type' => 'peca', 'description' => $pastilha->description, 'quantity' => 1, 'part_id' => $pastilha->id]);
        $this->assertSame(160.0, $os->items()->latest('id')->first()->unit_price);
    }

    public function test_busca_de_pecas_esconde_preco_do_mecanico(): void
    {
        $this->actingAs($this->carlos)->getJson($this->p('/pecas/buscar?q=filtro'))
            ->assertOk()->assertJsonMissingPath('0.sale_price')->assertJsonMissingPath('0.cost_price')->assertJsonPath('0.description', 'Filtro de ar');

        $this->actingAs($this->balcao)->getJson($this->p('/pecas/buscar?q=filtro'))->assertJsonPath('0.sale_price', 52);
    }

    public function test_custo_e_margem_so_para_socios(): void
    {
        $os = ServiceOrder::where('status', OsStatus::Pronto)->first();
        $this->actingAs($this->master)->get($this->p("/os/{$os->id}"))->assertInertia(fn (Assert $p) => $p->has('os.costs.catalog'));
        $this->actingAs($this->balcao)->get($this->p("/os/{$os->id}"))->assertInertia(fn (Assert $p) => $p->missing('os.costs'));
    }
}
