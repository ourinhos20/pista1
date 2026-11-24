<?php

namespace App\Http\Controllers;

use App\Models\FinanceEntry;
use App\Models\Partner;
use App\Models\PartnerMovement;
use App\Models\User;
use App\Support\Finance;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Sócios: aportes, retiradas, equilíbrio e divisão do resultado (somente master). */
class PartnerController extends Controller
{
    public function index(Request $request): Response
    {
        $m = $request->string('mes')->toString();
        $start = preg_match('/^\d{4}-\d{2}$/', $m) ? Carbon::createFromFormat('Y-m-d', "$m-01")->startOfDay() : now()->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $range = [$start->toDateString(), $end->toDateString()];

        $in = (float) FinanceEntry::where('type', 'entrada')->whereBetween('paid_at', $range)->sum('amount');
        $out = (float) FinanceEntry::where('type', 'saida')->whereBetween('paid_at', $range)->sum('amount');
        $result = round($in - $out, 2);

        $balance = Finance::partnerBalance();
        $shareSum = max(0.01, array_sum(array_column($balance['partners'], 'share')));

        return Inertia::render('financeiro/socios', [
            'month' => $start->format('Y-m'),
            'balance' => $balance,
            'result' => [
                'in' => round($in, 2),
                'out' => round($out, 2),
                'total' => $result,
                'split' => array_map(fn ($p) => ['id' => $p['id'], 'name' => $p['name'], 'share' => $p['share'], 'value' => round($result * $p['share'] / $shareSum, 2)], $balance['partners']),
            ],
            'movements' => PartnerMovement::with('partner:id,name')->latest('date')->latest('id')->limit(200)->get()->map(fn ($mv) => [
                'id' => $mv->id,
                'partner' => $mv->partner?->name,
                'partner_id' => $mv->partner_id,
                'type' => $mv->type,
                'amount' => $mv->amount,
                'date' => $mv->date->toDateString(),
                'description' => $mv->description,
            ]),
            'partners' => Partner::orderBy('id')->get(['id', 'name', 'share', 'active', 'user_id']),
            'users' => User::where('role', 'master')->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function storeMovement(Request $request): RedirectResponse
    {
        $request->merge(['amount' => Finance::parseMoney($request->input('amount'))]);
        $d = $request->validate([
            'partner_id' => ['required', Rule::exists('partners', 'id')->where('active', true)],
            'type' => ['required', Rule::in(['aporte', 'retirada'])],
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999'],
            'date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:255'],
        ], ['amount.gt' => 'Informe um valor maior que zero.'], ['partner_id' => 'sócio', 'amount' => 'valor', 'date' => 'data']);

        PartnerMovement::create([...$d, 'created_by' => $request->user()->id]);

        return back()->with('success', $d['type'] === 'aporte' ? 'Aporte registrado.' : 'Retirada registrada.');
    }

    public function destroyMovement(PartnerMovement $movement): RedirectResponse
    {
        $movement->delete();

        return back()->with('success', 'Movimentação excluída.');
    }

    public function storePartner(Request $request): RedirectResponse
    {
        Partner::create($this->partnerData($request));

        return back()->with('success', 'Sócio cadastrado.');
    }

    public function updatePartner(Request $request, Partner $partner): RedirectResponse
    {
        $partner->update($this->partnerData($request));

        return back()->with('success', 'Sócio alterado.');
    }

    private function partnerData(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'share' => ['required', 'numeric', 'between:0,100'],
            'active' => ['boolean'],
            'user_id' => ['nullable', Rule::exists('users', 'id')],
        ], [], ['share' => 'participação']);
    }
}
