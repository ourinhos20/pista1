<?php

namespace App\Http\Controllers;

use App\Enums\OsStatus;
use App\Models\ServiceOrder;
use App\Support\OsPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MechanicController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $base = fn () => ServiceOrder::with(['client', 'vehicle', 'mechanic'])
            ->whereIn('status', OsStatus::open())->orderByRaw('scheduled_at is null, scheduled_at')->orderBy('id');

        $mine = $user->isMechanic()
            ? $base()->where('mechanic_id', $user->id)->get()
            : $base()->whereNotNull('mechanic_id')->get();

        return Inertia::render('mecanico/index', [
            'mine' => $mine->map(fn ($os) => OsPresenter::card($os, $user)),
            'unassigned' => $base()->whereNull('mechanic_id')->get()->map(fn ($os) => OsPresenter::card($os, $user)),
        ]);
    }
}
