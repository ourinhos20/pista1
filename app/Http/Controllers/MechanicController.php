<?php

namespace App\Http\Controllers;

use App\Enums\OsStatus;
use App\Models\ServiceOrder;
use App\Support\OsPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Agenda da oficina: todos os mecânicos veem todos os carros (sem dados sensíveis). */
class MechanicController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $with = ['client', 'vehicle', 'mechanic'];

        $agenda = ServiceOrder::with($with)->where('status', OsStatus::Aguardando)
            ->orderByRaw('scheduled_at is null, scheduled_at')->orderBy('id')->get();

        $working = ServiceOrder::with($with)
            ->whereIn('status', [OsStatus::Diagnostico, OsStatus::Orcamento, OsStatus::Aprovacao, OsStatus::Execucao, OsStatus::Pronto])
            ->orderBy('updated_at', 'desc')->get();

        return Inertia::render('mecanico/index', [
            'agenda' => $agenda->map(fn ($os) => OsPresenter::card($os, $user)),
            'working' => $working->map(fn ($os) => OsPresenter::card($os, $user)),
        ]);
    }
}
