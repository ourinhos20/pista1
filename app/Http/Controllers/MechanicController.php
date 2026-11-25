<?php

namespace App\Http\Controllers;

use App\Enums\OsStatus;
use App\Models\ServiceOrder;
use App\Support\OsPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Agenda da oficina (todos os mecânicos veem tudo, sem dados sensíveis):
 * - Fila: carros que já chegaram (check-in) esperando mecânico;
 * - Em andamento: o que está na oficina;
 * - Agendados: ainda não chegaram (só para saber o que vem).
 */
class MechanicController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $with = ['client', 'vehicle', 'mechanic'];

        $fila = ServiceOrder::with($with)->where('status', OsStatus::Recebido)
            ->orderBy('status_changed_at')->get();

        $andamento = ServiceOrder::with($with)
            ->whereIn('status', [OsStatus::Diagnostico, OsStatus::Execucao, OsStatus::Pecas, OsStatus::Orcamento, OsStatus::Aprovacao, OsStatus::Pronto])
            ->orderByRaw("case status when 'execucao' then 1 when 'diagnostico' then 2 when 'pecas' then 3 when 'orcamento' then 4 when 'aprovacao' then 5 else 6 end")
            ->orderBy('status_changed_at')->get();

        $agenda = ServiceOrder::with($with)->where('status', OsStatus::Aguardando)
            ->orderByRaw('scheduled_at is null, scheduled_at')->orderBy('id')->limit(30)->get();

        return Inertia::render('mecanico/index', [
            'fila' => $fila->map(fn ($os) => OsPresenter::card($os, $user)),
            'andamento' => $andamento->map(fn ($os) => OsPresenter::card($os, $user)),
            'agenda' => $agenda->map(fn ($os) => OsPresenter::card($os, $user)),
        ]);
    }
}
