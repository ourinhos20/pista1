<?php

namespace Tests\Feature;

use App\Enums\OsStatus;
use App\Models\Attachment;
use App\Models\ServiceOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PhotosAgendarBudgetTest extends TestCase
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

    /* --------------------------------------------- agendamento pelo site */

    private function stamp(int $secondsAgo = 10): string
    {
        return Crypt::encryptString((string) (now()->timestamp - $secondsAgo));
    }

    public function test_cliente_agenda_pelo_site_e_ja_vira_os(): void
    {
        $this->get(route('agendar'))->assertOk()->assertSee('Agendar atendimento')->assertSee('Revisão');

        $this->post(route('agendar.submit'), [
            '_t' => $this->stamp(),
            'name' => 'Cliente do Site', 'phone' => '(11) 95555-1234', 'plate' => 'abc-9z99', 'vehicle' => 'VW Gol', 'year' => '2015',
            'service_type' => 'defeito', 'complaint' => 'Barulho na suspensão', 'consent' => '1',
            'photos' => [UploadedFile::fake()->image('roda.jpg', 2000, 1500)],
        ])->assertRedirect(route('agendar.ok'));

        $os = ServiceOrder::whereHas('client', fn ($c) => $c->where('name', 'Cliente do Site'))->first();
        $this->assertNotNull($os);
        $this->assertSame('site', $os->origin);
        $this->assertSame(OsStatus::Aguardando, $os->status);
        $this->assertSame('defeito', $os->service_type);
        $this->assertSame('11955551234', $os->client->phone);
        $this->assertSame('ABC9Z99', $os->vehicle->plate);
        $this->assertSame('2015', (string) $os->vehicle->year);
        $this->assertCount(1, $os->attachments);
        $this->assertFalse((bool) $os->attachments->first()->show_to_client);

        // aparece como novo para o balcão até alguém abrir a OS
        $novos = ServiceOrder::whereIn('origin', ['site', 'bot'])->whereNull('online_seen_at')->where('status', OsStatus::Aguardando)->count();
        $this->actingAs($this->balcao)->get($this->p('/dashboard'))->assertOk()->assertInertia(fn ($page) => $page->where('onlineNew', $novos)->has('online', $novos));
        $this->get($this->p("/os/{$os->id}"))->assertOk();
        $this->assertNotNull($os->fresh()->online_seen_at);
    }

    public function test_robos_sao_ignorados(): void
    {
        $before = ServiceOrder::count();
        $base = ['name' => 'Robo', 'phone' => '11955551234', 'complaint' => 'spam spam', 'consent' => '1'];
        $this->post(route('agendar.submit'), [...$base, '_t' => $this->stamp(), 'website' => 'http://spam'])->assertRedirect(route('agendar.ok'));
        $this->post(route('agendar.submit'), [...$base, '_t' => $this->stamp(0)])->assertRedirect(route('agendar.ok'));
        $this->post(route('agendar.submit'), [...$base, '_t' => 'invalido'])->assertRedirect(route('agendar.ok'));
        $this->assertSame($before, ServiceOrder::count());
    }

    /* ------------------------------------------------ link do orçamento */

    private function emAprovacao(): void
    {
        $this->os->items()->update(['unit_price' => 100, 'approval' => null]);
        $this->os->update(['status' => OsStatus::Aprovacao]);
    }

    public function test_link_do_orcamento_nao_mostra_dados_sensiveis(): void
    {
        $this->emAprovacao();
        $this->os->load('client');

        $res = $this->get(route('orcamento.show', $this->os->public_token))->assertOk();
        $res->assertSee($this->os->client->firstName())->assertSee('Aprovar itens marcados');
        $res->assertDontSee($this->os->client->phone)->assertDontSee($this->os->client->document);
        $res->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

        $this->get(route('orcamento.show', str_repeat('x', 40)))->assertNotFound();
    }

    public function test_cliente_aprova_tudo_pelo_link(): void
    {
        $this->emAprovacao();
        $ids = $this->os->items()->pluck('id')->all();
        $this->post(route('orcamento.decide', $this->os->public_token), ['decision' => 'aprovar', 'items' => $ids, 'name' => 'Pedro Santos', 'agree' => '1'])->assertRedirect();

        $os = $this->os->fresh();
        $this->assertSame(OsStatus::Execucao, $os->status);
        $this->assertNotNull($os->approved_at);
        $this->assertSame('Pedro Santos', $os->approval_name);
        $this->assertSame(0, $os->items()->where('approval', '!=', 'aprovado')->count());
        $this->assertStringContainsString('APROVOU', $os->events()->latest('id')->first()->note);
    }

    public function test_cliente_aprova_so_alguns_itens(): void
    {
        $this->os->items()->delete();
        $freio = $this->os->items()->create(['type' => 'peca', 'description' => 'Pastilha de freio', 'quantity' => 1, 'unit_price' => 200]);
        $susp = $this->os->items()->create(['type' => 'peca', 'description' => 'Amortecedor', 'quantity' => 2, 'unit_price' => 300]);
        $this->os->update(['status' => OsStatus::Aprovacao, 'discount' => 0]);

        $this->post(route('orcamento.decide', $this->os->public_token), ['decision' => 'aprovar', 'items' => [$freio->id], 'name' => 'Pedro', 'agree' => '1', 'note' => 'O resto no mês que vem']);

        $os = $this->os->fresh();
        $this->assertSame(OsStatus::Execucao, $os->status);
        $this->assertSame('aprovado', $freio->fresh()->approval);
        $this->assertSame('recusado', $susp->fresh()->approval);
        $this->assertEqualsWithDelta(200, $os->subtotal(), 0.001);
    }

    public function test_aprovar_exige_concordar(): void
    {
        $this->emAprovacao();
        $this->post(route('orcamento.decide', $this->os->public_token), ['decision' => 'aprovar', 'items' => $this->os->items()->pluck('id')->all(), 'name' => 'Pedro'])->assertSessionHasErrors('agree');
        $this->assertSame(OsStatus::Aprovacao, $this->os->fresh()->status);
    }

    public function test_cliente_nao_aprova_nada_e_volta_para_o_balcao(): void
    {
        $this->emAprovacao();
        $this->post(route('orcamento.decide', $this->os->public_token), ['decision' => 'recusar', 'name' => 'Pedro', 'note' => 'Vou pensar'])->assertRedirect();

        $os = $this->os->fresh();
        $this->assertSame(OsStatus::Orcamento, $os->status);
        $this->assertNotNull($os->rejected_at);
        $this->assertSame('Vou pensar', $os->approval_note);
        $this->assertSame(0, $os->items()->where('approval', '!=', 'recusado')->count());
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
