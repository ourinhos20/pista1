<?php

namespace Tests\Feature;

use App\Enums\OsStatus;
use App\Models\Attachment;
use App\Models\PreService;
use App\Models\ServiceOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PhotosPreServiceBudgetTest extends TestCase
{
    use RefreshDatabase;

    private User $balcao;
    private User $carlos;
    private User $rafael;
    private ServiceOrder $os;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->seed(DatabaseSeeder::class);
        $this->balcao = User::where('email', 'balcao@pista1.test')->first();
        $this->carlos = User::where('email', 'carlos@pista1.test')->first();
        $this->rafael = User::where('email', 'rafael@pista1.test')->first();
        $this->os = ServiceOrder::where('status', OsStatus::Orcamento)->first();
    }

    /* ------------------------------------------------------------- fotos */

    public function test_mecanico_anexa_foto_que_e_reduzida_e_fica_privada(): void
    {
        $this->actingAs($this->carlos)
            ->post($this->p("/os/{$this->os->id}/fotos"), ['photos' => [UploadedFile::fake()->image('motor.jpg', 4000, 3000)]])
            ->assertSessionHasNoErrors();

        $a = Attachment::where('service_order_id', $this->os->id)->first();
        $this->assertNotNull($a);
        [$w] = getimagesizefromstring(Storage::disk('local')->get($a->path));
        [$tw] = getimagesizefromstring(Storage::disk('local')->get($a->thumb_path));
        $this->assertSame(1600, $w);
        $this->assertSame(400, $tw);

        // logado vê; visitante não
        $this->get(route('anexos.show', $a->id))->assertOk();
        auth()->logout();
        $this->flushSession();
        $this->get(route('anexos.show', $a->id))->assertRedirect(route('login'));
    }

    public function test_arquivo_que_nao_e_foto_e_recusado(): void
    {
        $this->actingAs($this->carlos)
            ->post($this->p("/os/{$this->os->id}/fotos"), ['photos' => [UploadedFile::fake()->create('virus.php', 10, 'application/x-php')]])
            ->assertSessionHasErrors('photos.0');
    }

    public function test_mecanico_so_apaga_a_propria_foto(): void
    {
        $this->actingAs($this->carlos)->post($this->p("/os/{$this->os->id}/fotos"), ['photos' => [UploadedFile::fake()->image('a.jpg')]]);
        $a = Attachment::first();

        $this->actingAs($this->rafael)->delete($this->p("/os/{$this->os->id}/fotos/{$a->id}"))->assertForbidden();
        $this->actingAs($this->carlos)->delete($this->p("/os/{$this->os->id}/fotos/{$a->id}"))->assertRedirect();
        $this->assertNull($a->fresh());
        Storage::disk('local')->assertMissing($a->path);
    }

    /* ----------------------------------------------- pré-atendimento site */

    private function stamp(int $secondsAgo = 10): string
    {
        return Crypt::encryptString((string) (now()->timestamp - $secondsAgo));
    }

    public function test_cliente_pede_agendamento_com_foto(): void
    {
        $this->get(route('agendar'))->assertOk()->assertSee('Agendar atendimento');

        $this->post(route('agendar.submit'), [
            '_t' => $this->stamp(),
            'name' => 'Cliente do Site', 'phone' => '(11) 95555-1234', 'plate' => 'abc-9z99', 'vehicle' => 'Gol 2015',
            'complaint' => 'Barulho na suspensão', 'consent' => '1',
            'photos' => [UploadedFile::fake()->image('roda.jpg', 2000, 1500)],
        ])->assertRedirect(route('agendar.ok'));

        $pre = PreService::where('name', 'Cliente do Site')->first();
        $this->assertSame('11955551234', $pre->phone);
        $this->assertSame('ABC9Z99', $pre->plate);
        $this->assertCount(1, $pre->attachments);
    }

    public function test_robos_sao_ignorados(): void
    {
        $base = ['name' => 'Robo', 'phone' => '11955551234', 'complaint' => 'spam spam', 'consent' => '1'];
        $this->post(route('agendar.submit'), [...$base, '_t' => $this->stamp(), 'website' => 'http://spam'])->assertRedirect(route('agendar.ok'));
        $this->post(route('agendar.submit'), [...$base, '_t' => $this->stamp(0)])->assertRedirect(route('agendar.ok'));
        $this->post(route('agendar.submit'), [...$base, '_t' => 'invalido'])->assertRedirect(route('agendar.ok'));
        $this->assertSame(0, PreService::where('name', 'Robo')->count());
    }

    public function test_pedido_vira_os_com_as_fotos(): void
    {
        $pre = PreService::create(['name' => 'Novo Cliente', 'phone' => '11944443333', 'plate' => 'NEW1A23', 'complaint' => 'Freio rangendo']);
        $pre->attachments()->create(['path' => 'pre/x.jpg', 'thumb_path' => 'pre/x_mini.jpg']);

        $this->actingAs($this->carlos)->get($this->p('/pre-atendimentos'))->assertForbidden();
        $this->actingAs($this->balcao)->get($this->p('/pre-atendimentos'))->assertOk();
        $this->get($this->p("/os/nova?pre={$pre->id}"))->assertOk();

        $this->post($this->p('/os'), [
            'plate' => 'NEW1A23', 'client' => ['name' => 'Novo Cliente', 'phone' => '11944443333'], 'complaint' => 'Freio rangendo', 'pre_service_id' => $pre->id,
        ])->assertRedirect();

        $pre->refresh();
        $this->assertSame('convertido', $pre->status);
        $this->assertNotNull($pre->service_order_id);
        $this->assertSame($pre->service_order_id, $pre->attachments()->first()->service_order_id);

        // não dá para converter duas vezes
        $this->post($this->p('/os'), ['plate' => 'NEW1A23', 'pre_service_id' => $pre->id])->assertSessionHasErrors('pre_service_id');
    }

    /* ------------------------------------------------ link do orçamento */

    public function test_link_do_orcamento_nao_mostra_dados_sensiveis(): void
    {
        $this->os->items()->update(['unit_price' => 100]);
        $this->os->update(['status' => OsStatus::Aprovacao]);
        $this->os->load('client');

        $res = $this->get(route('orcamento.show', $this->os->public_token))->assertOk();
        $res->assertSee($this->os->client->firstName())->assertSee('Aprovar orçamento');
        $res->assertDontSee($this->os->client->phone)->assertDontSee($this->os->client->document);
        $res->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

        $this->get(route('orcamento.show', str_repeat('x', 40)))->assertNotFound();
    }

    public function test_cliente_aprova_pelo_link(): void
    {
        $this->os->update(['status' => OsStatus::Aprovacao]);
        $this->post(route('orcamento.decide', $this->os->public_token), ['decision' => 'aprovar', 'name' => 'Pedro Santos', 'agree' => '1'])->assertRedirect();

        $os = $this->os->fresh();
        $this->assertSame(OsStatus::Execucao, $os->status);
        $this->assertNotNull($os->approved_at);
        $this->assertSame('Pedro Santos', $os->approval_name);
        $this->assertStringContainsString('APROVOU', $os->events()->first()->note);
    }

    public function test_aprovar_exige_concordar(): void
    {
        $this->os->update(['status' => OsStatus::Aprovacao]);
        $this->post(route('orcamento.decide', $this->os->public_token), ['decision' => 'aprovar', 'name' => 'Pedro'])->assertSessionHasErrors('agree');
        $this->assertSame(OsStatus::Aprovacao, $this->os->fresh()->status);
    }

    public function test_cliente_recusa_e_volta_para_o_balcao(): void
    {
        $this->os->update(['status' => OsStatus::Aprovacao]);
        $this->post(route('orcamento.decide', $this->os->public_token), ['decision' => 'recusar', 'name' => 'Pedro', 'note' => 'Só os freios'])->assertRedirect();

        $os = $this->os->fresh();
        $this->assertSame(OsStatus::Orcamento, $os->status);
        $this->assertNotNull($os->rejected_at);
        $this->assertSame('Só os freios', $os->approval_note);
    }

    public function test_link_nao_aceita_decisao_fora_da_etapa_de_aprovacao(): void
    {
        // OS ainda com o balcão (aguardando orçamento)
        $this->post(route('orcamento.decide', $this->os->public_token), ['decision' => 'aprovar', 'name' => 'X', 'agree' => '1']);
        $this->assertSame(OsStatus::Orcamento, $this->os->fresh()->status);
    }

    public function test_foto_interna_nao_aparece_no_link(): void
    {
        $a = $this->os->attachments()->create(['path' => 'f/a.jpg', 'thumb_path' => 'f/a_mini.jpg', 'show_to_client' => false]);
        Storage::disk('local')->put('f/a.jpg', 'x');
        $this->get(route('orcamento.foto', [$this->os->public_token, $a->id]))->assertNotFound();

        $a->update(['show_to_client' => true]);
        $this->get(route('orcamento.foto', [$this->os->public_token, $a->id]))->assertOk();
        $this->get(route('orcamento.foto', [str_repeat('y', 40), $a->id]))->assertNotFound();
    }
}
