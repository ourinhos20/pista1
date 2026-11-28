<?php

namespace App\Http\Controllers;

use App\Enums\OsStatus;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Support\OsIntake;
use App\Support\OsPresenter;
use App\Support\Plate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ServiceOrderController extends Controller
{
    /**
     * Todos os mecânicos veem a agenda inteira da oficina (decisão do dono).
     * A privacidade (CPF, telefone, valores) é garantida pelo OsPresenter.
     */
    public static function guard(ServiceOrder $os, User $user): void
    {
        if ($user->isMechanic() && $os->status === OsStatus::Cancelada) {
            abort(403, 'OS cancelada.');
        }
    }

    /** Checklist de revisão preenchido pelo mecânico (celular) ou pelo balcão. */
    public function revision(Request $request, ServiceOrder $os): RedirectResponse
    {
        self::guard($os, $request->user());
        $data = $request->validate([
            'revision' => ['present', 'array', 'max:80'],
            'revision.*' => ['nullable', Rule::in(['ok', 'atencao', 'trocar'])],
        ]);

        $clean = collect($data['revision'])
            ->filter(fn ($v, $k) => $v !== null && is_string($k) && mb_strlen($k) <= 60)
            ->all();
        $os->update(['revision' => $clean]);

        // sem aviso: a tela grava sozinha a cada toque e mostra "Gravado"
        return back();
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $status = $request->string('status')->toString();
        $origem = $request->string('origem')->toString();
        $q = trim($request->string('q')->toString());

        $query = ServiceOrder::with(['client', 'vehicle', 'mechanic', 'items'])->latest('id');

        if ($status === 'abertas' || $status === '') {
            $query->whereIn('status', OsStatus::open());
        } elseif ($status !== 'todas') {
            $query->where('status', $status);
        }
        if ($origem === 'online') {
            $query->whereIn('origin', ['site', 'bot']);
        } elseif (in_array($origem, ['balcao', 'site', 'bot'], true)) {
            $query->where('origin', $origem);
        }

        if ($q !== '') {
            $plate = Plate::normalize($q);
            $digits = Plate::digits($q);
            $query->where(function ($w) use ($q, $plate, $digits) {
                $w->whereHas('client', fn ($c) => $c->where('name', 'like', "%{$q}%")->when($digits && strlen($digits) >= 4, fn ($x) => $x->orWhere('phone', 'like', "%{$digits}%")->orWhere('document', 'like', "%{$digits}%")))
                    ->orWhereHas('vehicle', fn ($v) => $v->where('plate', 'like', "%{$plate}%")->orWhere('model', 'like', "%{$q}%"));
                if (ctype_digit($q)) {
                    $w->orWhere('id', (int) $q);
                }
            });
        }

        // agenda do dia: quem marcou para hoje e ainda não chegou (fica no topo da tela inicial)
        $today = ServiceOrder::with(['client', 'vehicle', 'mechanic'])->where('status', OsStatus::Aguardando)
            ->whereDate('scheduled_at', today())->orderBy('scheduled_at')->get()
            ->map(fn ($os) => OsPresenter::card($os, $user));

        return Inertia::render('os/index', [
            'orders' => $query->limit(100)->get()->map(fn ($os) => OsPresenter::card($os, $user)),
            'filters' => ['status' => $status ?: 'abertas', 'q' => $q, 'origem' => $origem],
            'today' => $today,
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('os/create', [
            'mechanics' => User::where('role', 'mecanico')->where('active', true)->orderBy('name')->get(['id', 'name']),
            'prefill' => $request->only(['placa', 'client_id']),
            'serviceTypes' => ServiceOrder::SERVICE_TYPES,
        ]);
    }

    /** Nova OS pelo balcão: só os dados básicos (o resto é completado na chegada e pelo mecânico). */
    public function store(Request $request): RedirectResponse
    {
        $arrived = $request->boolean('arrived');
        $data = $request->validate([
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'vehicle_id' => ['nullable', 'integer', 'exists:vehicles,id'],
            'name' => ['required_without:client_id', 'nullable', 'string', 'max:255'],
            'phone' => ['required_without:client_id', 'nullable', 'string', 'max:20'],
            'plate' => [$arrived ? 'required_without:vehicle_id' : 'nullable', 'nullable', 'string', 'max:10'],
            'vehicle_brand' => ['nullable', 'string', 'max:60'],
            'vehicle_model' => ['nullable', 'string', 'max:120'],
            'vehicle_year' => ['nullable', 'string', 'max:9'],
            'vehicle_color' => ['nullable', 'string', 'max:30'],
            'vehicle_chassis' => ['nullable', 'string', 'max:20'],
            'service_type' => ['nullable', Rule::in(array_keys(ServiceOrder::SERVICE_TYPES))],
            'complaint' => ['required', 'string', 'max:5000'],
            'scheduled_at' => ['nullable', 'date'],
            'mechanic_id' => ['nullable', Rule::exists('users', 'id')->where('role', 'mecanico')],
            'arrived' => ['boolean'],
        ], [
            'name.required_without' => 'Informe o nome do cliente.',
            'phone.required_without' => 'Informe o telefone (WhatsApp) do cliente.',
            'plate.required_without' => 'Com o cliente na oficina, a placa é obrigatória.',
            'complaint.required' => 'Descreva o defeito ou o serviço pedido.',
        ]);

        $os = OsIntake::create($data, 'balcao', $request->user());

        return to_route('os.show', $os)->with('success', "OS {$os->number()} aberta.");
    }

    public function show(Request $request, ServiceOrder $os): Response
    {
        $user = $request->user();
        self::guard($os, $user);

        // agendamento online visto pelo balcão: some do contador de "novos"
        if ($user->canSeeSensitive() && $os->origin !== 'balcao' && ! $os->online_seen_at) {
            $os->forceFill(['online_seen_at' => now()])->saveQuietly();
        }

        $history = ServiceOrder::with('items')
            ->where('vehicle_id', $os->vehicle_id)->where('id', '!=', $os->id)
            ->latest('id')->limit(5)->get()
            ->map(fn ($h) => [
                'id' => $h->id,
                'number' => $h->number(),
                'status' => $h->status->value,
                'date' => ($h->delivered_at ?? $h->created_at)?->toIso8601String(),
                'km_in' => $h->km_in,
                'summary' => $h->items->where('approval', '!=', 'recusado')->pluck('description')->take(4)->implode(', ') ?: $h->complaint,
            ]);

        return Inertia::render('os/show', [
            'os' => OsPresenter::full($os, $user),
            'history' => $history,
            'mechanics' => $user->canSeeSensitive()
                ? User::where('role', 'mecanico')->where('active', true)->orderBy('name')->get(['id', 'name'])
                : [],
            'statuses' => OsStatus::options(),
            'serviceTypes' => ServiceOrder::SERVICE_TYPES,
        ]);
    }

    /** Edição geral (balcão/master). */
    public function update(Request $request, ServiceOrder $os): RedirectResponse
    {
        $data = $request->validate([
            'mechanic_id' => ['nullable', Rule::exists('users', 'id')->where('role', 'mecanico')],
            'scheduled_at' => ['nullable', 'date'],
            'service_type' => ['nullable', Rule::in(array_keys(ServiceOrder::SERVICE_TYPES))],
            'complaint' => ['nullable', 'string', 'max:5000'],
            'diagnosis' => ['nullable', 'string', 'max:10000'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'discount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $os->update($data);

        return back()->with('success', 'OS atualizada.');
    }

    private function cadastroRules(bool $plateRequired): array
    {
        return [
            'client.name' => ['sometimes', 'required', 'string', 'max:255'],
            'client.phone' => ['nullable', 'string', 'max:20'],
            'client.document' => ['nullable', 'string', 'max:20'],
            'client.email' => ['nullable', 'email', 'max:255'],
            'client.address' => ['nullable', 'string', 'max:255'],
            'client.city' => ['nullable', 'string', 'max:120'],
            'vehicle.plate' => [$plateRequired ? 'required' : 'nullable', 'string', 'max:10'],
            'vehicle.brand' => ['nullable', 'string', 'max:60'],
            'vehicle.model' => ['nullable', 'string', 'max:120'],
            'vehicle.chassis' => ['nullable', 'string', 'max:20'],
            'vehicle.year' => ['nullable', 'string', 'max:9'],
            'vehicle.color' => ['nullable', 'string', 'max:30'],
            'vehicle.engine' => ['nullable', 'string', 'max:30'],
        ];
    }

    /** Completar/corrigir cadastro do cliente e do carro a qualquer momento (balcão/master). */
    public function cadastro(Request $request, ServiceOrder $os): RedirectResponse
    {
        $data = $request->validate($this->cadastroRules(false), [], ['vehicle.plate' => 'placa', 'client.name' => 'nome']);
        OsIntake::updateCadastro($os, $data['client'] ?? [], $data['vehicle'] ?? []);

        return back()->with('success', 'Cadastro atualizado.');
    }

    /** "Cliente chegou": confere/completa o cadastro (placa obrigatória) e libera para a fila do mecânico. */
    public function checkin(Request $request, ServiceOrder $os): RedirectResponse
    {
        abort_unless($os->status === OsStatus::Aguardando, 422, 'Esta OS já foi recebida.');
        $data = $request->validate($this->cadastroRules(true), ['vehicle.plate.required' => 'Informe a placa para receber o carro.'], ['vehicle.plate' => 'placa']);

        OsIntake::updateCadastro($os, $data['client'] ?? [], $data['vehicle'] ?? []);
        $os->refresh()->update(['status' => OsStatus::Recebido, 'checked_in_at' => now()]);
        $os->logEvent($request->user(), 'Cliente chegou · carro liberado para o mecânico');

        return back()->with('success', 'Carro recebido. Já aparece na fila do mecânico.');
    }

    /** Vistoria de entrada: primeiro passo do mecânico (km, combustível, itens, avarias). */
    public function vistoria(Request $request, ServiceOrder $os): RedirectResponse
    {
        $user = $request->user();
        self::guard($os, $user);
        abort_if(in_array($os->status, [OsStatus::Aguardando, OsStatus::Entregue, OsStatus::Cancelada], true), 422, 'A vistoria é feita com o carro na oficina.');

        $data = $request->validate([
            'km_in' => ['required', 'integer', 'min:0', 'max:9999999'],
            'fuel_level' => ['required', 'integer', 'between:0,4'],
            'checklist' => ['nullable', 'array'],
            'checklist.*' => ['boolean'],
            'damages' => ['nullable', 'array', 'max:60'],
            'damages.*.x' => ['required', 'numeric', 'between:0,100'],
            'damages.*.y' => ['required', 'numeric', 'between:0,100'],
            'damages.*.type' => ['required', Rule::in(['risco', 'amassado', 'quebrado', 'falta'])],
            'damages.*.note' => ['nullable', 'string', 'max:120'],
            'chassis' => ['nullable', 'string', 'max:20'],
        ], ['km_in.required' => 'Informe o km do painel.', 'fuel_level.required' => 'Marque o nível de combustível.'], ['km_in' => 'km']);

        $first = ! $os->inspected_at;
        // chassi é do veículo, não da OS
        $chassis = $data['chassis'] ?? null;
        unset($data['chassis']);
        if ($chassis !== null && $chassis !== '') {
            $os->vehicle?->update(['chassis' => $chassis]);
        }
        $os->update([
            ...$data,
            'checklist' => $data['checklist'] ?? [],
            'damages' => $data['damages'] ?? [],
            'inspected_at' => $os->inspected_at ?? now(),
            'inspected_by' => $os->inspected_by ?? $user->id,
        ]);
        if ($data['km_in'] > (int) $os->vehicle?->km) {
            $os->vehicle?->update(['km' => $data['km_in']]);
        }
        $os->logEvent($user, $first ? 'Vistoria de entrada concluída' : 'Vistoria de entrada alterada');

        return back()->with('success', $first ? 'Vistoria concluída. Pode seguir com o diagnóstico.' : 'Vistoria alterada.');
    }

    /** Diagnóstico: mecânico e balcão. */
    /**
     * Etapa 2 da sequência do mecânico: conclui o diagnóstico ou o checklist
     * e libera peças e fotos. Pede a vistoria feita e algo preenchido.
     */
    public function workDone(Request $request, ServiceOrder $os): RedirectResponse
    {
        $user = $request->user();
        self::guard($os, $user);
        $data = $request->validate(['diagnosis' => ['nullable', 'string', 'max:10000']]);
        if (array_key_exists('diagnosis', $data)) {
            $os->diagnosis = $data['diagnosis'];
        }

        $checklist = in_array($os->service_type, ['revisao', 'preventiva'], true);
        $diag = in_array($os->service_type, ['defeito', 'outro'], true);
        $hasDiag = trim((string) $os->diagnosis) !== '';
        $hasChecklist = count($os->revision ?? []) > 0;
        $fail = fn (string $msg) => throw ValidationException::withMessages(['work' => $msg]);

        if (! $os->inspected_at) {
            $fail('Faça a vistoria de entrada primeiro.');
        }
        if ($diag && ! $hasDiag) {
            $fail('Escreva o diagnóstico: o que foi encontrado e o que precisa fazer.');
        }
        if ($checklist && ! $hasChecklist) {
            $fail('Marque os itens do checklist (use "Resto OK" nos grupos sem problema).');
        }
        if (! $checklist && ! $diag && ! $hasDiag && ! $hasChecklist) {
            $fail('Preencha o diagnóstico ou o checklist.');
        }

        $first = ! $os->work_done_at;
        $os->work_done_at ??= now();
        $os->save();
        if ($first) {
            $os->logEvent($user, $checklist ? 'Checklist concluído' : 'Diagnóstico concluído');
        }

        return back()->with('success', 'Concluído. Agora lance as peças e serviços necessários.');
    }

    public function diagnosis(Request $request, ServiceOrder $os): RedirectResponse
    {
        self::guard($os, $request->user());
        $data = $request->validate(['diagnosis' => ['nullable', 'string', 'max:10000']]);
        $os->update($data);

        return back()->with('success', 'Diagnóstico salvo.');
    }

    public function status(Request $request, ServiceOrder $os): RedirectResponse
    {
        $user = $request->user();
        self::guard($os, $user);

        $data = $request->validate([
            'status' => ['required', Rule::in(array_map(fn ($s) => $s->value, OsStatus::cases()))],
            'note' => ['nullable', 'string', 'max:255'],
        ]);
        $new = OsStatus::from($data['status']);
        $fail = fn (string $msg) => throw ValidationException::withMessages(['status' => $msg]);

        // mecânico só anda nas etapas dele
        if ($user->isMechanic() && ! in_array($new->value, OsStatus::mechanicTransitions()[$os->status->value] ?? [], true)) {
            $fail('Esta etapa é com o balcão.');
        }

        // travas do fluxo (o sócio pode passar por cima, mas fica registrado)
        if (! $user->isMaster()) {
            $os->loadMissing(['vehicle', 'items']);
            if ($new === OsStatus::Recebido && ! $os->vehicle?->plate) {
                $fail('Use "Cliente chegou" e informe a placa.');
            }
            if ($new === OsStatus::Orcamento && ! $os->inspected_at) {
                $fail('Faça a vistoria de entrada antes de enviar para o balcão.');
            }
            if ($new === OsStatus::Orcamento && ! $os->work_done_at) {
                $fail('Conclua o diagnóstico (ou o checklist) antes de enviar para o balcão.');
            }
            if ($new === OsStatus::Aprovacao) {
                $active = $os->items->where('approval', '!=', 'recusado');
                if ($active->isEmpty()) {
                    $fail('Inclua as peças e serviços antes de enviar o orçamento.');
                }
                if ($active->contains(fn ($i) => $i->unit_price <= 0)) {
                    $fail('Há itens sem valor. Lance todos os valores antes de enviar o orçamento.');
                }
            }
        }

        // "Cliente aprovou" pelo balcão: o que ainda estava pendente conta como aprovado
        if (in_array($new, [OsStatus::Execucao, OsStatus::Pecas], true) && $os->status === OsStatus::Aprovacao) {
            $os->items()->whereNull('approval')->where('extra', false)->update(['approval' => 'aprovado']);
            $os->approved_at ??= now();
            $os->rejected_at = null;
        }

        $os->status = $new;
        if ($new === OsStatus::Entregue) {
            $os->delivered_at = now();
        }
        // mecânico que começa uma OS sem dono passa a ser o responsável
        if ($user->isMechanic() && ! $os->mechanic_id) {
            $os->mechanic_id = $user->id;
        }
        $os->save();
        $os->logEvent($user, $data['note'] ?? null);

        return back()->with('success', 'Etapa: '.$new->label());
    }

    public function assume(Request $request, ServiceOrder $os): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->isMechanic(), 403);
        abort_if($os->mechanic_id && $os->mechanic_id !== $user->id, 403, 'Esta OS já tem mecânico.');

        $os->update(['mechanic_id' => $user->id]);
        $os->logEvent($user, 'Mecânico assumiu a OS');

        return back()->with('success', 'OS assumida.');
    }

    /** Exclui várias OS marcadas na lista (só sócios). */
    public function destroyMany(Request $request): RedirectResponse
    {
        $ids = $request->validate(['ids' => ['required', 'array', 'min:1', 'max:200'], 'ids.*' => ['integer']])['ids'];
        $n = 0;
        DB::transaction(function () use ($ids, &$n) {
            foreach (ServiceOrder::whereIn('id', $ids)->get() as $os) {
                $os->delete();
                $n++;
            }
        });

        return back()->with('success', $n === 1 ? '1 OS excluída.' : "{$n} OS excluídas.");
    }

    public function destroy(ServiceOrder $os): RedirectResponse
    {
        $os->delete();

        return to_route('os.index')->with('success', 'OS excluída.');
    }

    /** Ficha em branco (sem cliente, carro nem valores) para preencher à mão. */
    public function blankForm(Request $request, string $tipo): Response
    {
        abort_unless(in_array($tipo, ['cliente', 'entrada', 'diagnostico', 'revisao'], true), 404);
        abort_if($tipo === 'cliente' && ! $request->user()->canSeeSensitive(), 403);

        $os = [
            'id' => 0, 'number' => '', 'status' => 'aguardando', 'scheduled_at' => null, 'created_at' => null,
            'complaint' => null, 'km_in' => null, 'origin' => 'balcao', 'service_type' => null, 'status_since' => null,
            'inspected' => false, 'online_new' => false, 'client' => null, 'vehicle' => null, 'mechanic' => null,
            'fuel_level' => null, 'diagnosis' => null, 'notes' => null, 'damages' => [], 'checklist' => [],
            'revision' => (object) [], 'checked_in_at' => null, 'inspected_at' => null, 'inspected_by' => null,
            'approved_at' => null, 'rejected_at' => null, 'approval_name' => null, 'approval_note' => null,
            'photos' => [], 'delivered_at' => null, 'items' => [], 'events' => [],
            'subtotal' => 0, 'discount' => 0, 'total' => 0, 'down_payment' => 0, 'payment_method' => null,
            'public_url' => null, 'payments' => [], 'paid_total' => 0, 'billed_total' => 0,
        ];

        return Inertia::render('print/'.$tipo, ['os' => $os, 'shop' => config('oficina'), 'blank' => true]);
    }

    public function print(Request $request, ServiceOrder $os, string $tipo): Response
    {
        $user = $request->user();
        self::guard($os, $user);

        // mecânico pode imprimir a vistoria e a ficha dele (sem dados sensíveis: o presenter já filtra)
        $mechanicTypes = ['entrada', 'diagnostico', 'revisao'];
        abort_unless(in_array($tipo, ['cliente', 'entrada', 'diagnostico', 'revisao'], true), 404);
        abort_if(! $user->canSeeSensitive() && ! in_array($tipo, $mechanicTypes, true), 403);

        return Inertia::render('print/'.$tipo, [
            'os' => OsPresenter::full($os, $user),
            'shop' => config('oficina'),
        ]);
    }
}
