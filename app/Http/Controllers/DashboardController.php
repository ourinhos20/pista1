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

        $counts = ServiceOrder::selectRaw('status, count(*) as total')
            ->whereIn('status', OsStatus::open())->groupBy('status')->pluck('total', 'status');

        $today = ServiceOrder::with(['client', 'vehicle', 'mechanic', 'items'])
            ->whereDate('scheduled_at', today())->orderBy('scheduled_at')->get()
            ->map(fn ($os) => OsPresenter::card($os, $user));

        $open = ServiceOrder::with(['client', 'vehicle', 'mechanic', 'items'])
            ->whereIn('status', OsStatus::open())->latest('updated_at')->limit(12)->get()
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
            'today' => $today,
            'open' => $open,
            'month' => $month,
        ]);
    }
}
