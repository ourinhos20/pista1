<?php

namespace App\Http\Controllers;

use App\Enums\OsStatus;
use App\Models\ServiceOrder;
use App\Support\OsPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $user = $request->user();
        if ($user->isMechanic()) {
            return to_route('mecanico.index');
        }

        // quantas OS em cada etapa e desde quando está parada a mais antiga (acusa gargalo)
        $stats = ServiceOrder::selectRaw('status, count(*) as total, min(status_changed_at) as oldest')
            ->whereIn('status', OsStatus::open())->groupBy('status')->get();
        // a coluna status vira Enum no model: a chave do array precisa ser o texto (->value)
        $counts = $stats->mapWithKeys(fn ($r) => [$r->status->value => (int) $r->total]);
        $oldest = $stats->mapWithKeys(fn ($r) => [$r->status->value => $r->oldest ? \Illuminate\Support\Carbon::parse($r->oldest)->toIso8601String() : null]);

        $with = ['client', 'vehicle', 'mechanic', 'items'];

        // agenda do dia: quem marcou para hoje e ainda não chegou
        $today = ServiceOrder::with($with)->where('status', OsStatus::Aguardando)
            ->whereDate('scheduled_at', today())->orderBy('scheduled_at')->get()
            ->map(fn ($os) => OsPresenter::card($os, $user));

        // agendamentos que chegaram pelo site/bot e o balcão ainda não abriu
        $online = ServiceOrder::with($with)->whereIn('origin', ['site', 'bot'])->whereNull('online_seen_at')
            ->where('status', OsStatus::Aguardando)->latest('id')->limit(8)->get()
            ->map(fn ($os) => OsPresenter::card($os, $user));

        $open = ServiceOrder::with($with)->whereIn('status', OsStatus::inShop())
            ->orderBy('status_changed_at')->limit(60)->get()
            ->map(fn ($os) => OsPresenter::card($os, $user));

        $month = null;
        if ($user->isMaster()) {
            $delivered = ServiceOrder::with('items')->where('status', OsStatus::Entregue)
                ->whereBetween('delivered_at', [now()->startOfMonth(), now()->endOfMonth()])->get();
            $month = [
                'revenue' => round($delivered->sum(fn ($os) => $os->total()), 2),
                'delivered' => $delivered->count(),
                'ticket' => $delivered->count() ? round($delivered->avg(fn ($os) => $os->total()), 2) : 0,
            ];
        }

        return Inertia::render('dashboard', [
            'counts' => $counts,
            'oldest' => $oldest,
            'today' => $today,
            'online' => $online,
            'open' => $open,
            'month' => $month,
        ]);
    }
}
