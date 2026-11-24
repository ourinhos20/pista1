<?php

namespace App\Http\Controllers;

use App\Models\Part;
use App\Models\Supplier;
use App\Support\Finance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Catálogo de peças com estoque calculado. */
class PartController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim($request->string('q')->toString());
        $filtro = $request->string('filtro')->toString();

        $rows = Part::with('supplier:id,name')->withStock()
            ->when($q !== '', fn ($w) => $w->where(fn ($x) => $x->where('description', 'like', "%{$q}%")->orWhere('code', 'like', "%{$q}%")->orWhere('brand', 'like', "%{$q}%")))
            ->orderByDesc('active')->orderBy('description')->limit(500)->get()
            ->map->toRow();

        if ($filtro === 'baixo') {
            $rows = $rows->where('low', true)->values();
        }

        return Inertia::render('pecas/index', [
            'rows' => $rows,
            'filters' => ['q' => $q, 'filtro' => $filtro],
            'suppliers' => Supplier::where('active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    private function validated(Request $request): array
    {
        foreach (['cost_price', 'sale_price', 'min_stock'] as $k) {
            if ($request->has($k)) {
                $request->merge([$k => Finance::parseMoney($request->input($k))]);
            }
        }

        return $request->validate([
            'code' => ['nullable', 'string', 'max:60'],
            'description' => ['required', 'string', 'max:255'],
            'brand' => ['nullable', 'string', 'max:60'],
            'unit' => ['required', 'in:un,L,kit,par,jogo,m,kg'],
            'cost_price' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'sale_price' => ['nullable', 'numeric', 'min:0', 'max:999999'],
            'min_stock' => ['nullable', 'numeric', 'min:0', 'max:99999'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'active' => ['boolean'],
        ], [], ['description' => 'descrição', 'sale_price' => 'preço de venda', 'cost_price' => 'custo']);
    }

    public function store(Request $request): RedirectResponse
    {
        Part::create($this->validated($request));

        return back()->with('success', 'Peça cadastrada.');
    }

    public function update(Request $request, Part $part): RedirectResponse
    {
        $part->update($this->validated($request));

        return back()->with('success', 'Peça alterada.');
    }

    /** Busca rápida para incluir peça na OS ou na compra (mecânico não recebe custo nem preço). */
    public function search(Request $request): JsonResponse
    {
        $q = trim($request->string('q')->toString());
        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }
        $user = $request->user();

        $rows = Part::with('supplier:id,name')->withStock()->where('active', true)
            ->where(fn ($x) => $x->where('description', 'like', "%{$q}%")->orWhere('code', 'like', "%{$q}%")->orWhere('brand', 'like', "%{$q}%"))
            ->orderBy('description')->limit(10)->get()
            ->map(function (Part $p) use ($user) {
                $row = $p->toRow($user->canSeeSensitive());
                if (! $user->canSeeSensitive()) {
                    unset($row['sale_price'], $row['cost_price']);
                }

                return $row;
            });

        return response()->json($rows);
    }
}
