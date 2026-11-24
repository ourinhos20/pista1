<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Support\Plate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim($request->string('q')->toString());

        $rows = Supplier::withCount('purchases')->withSum('purchases', 'total')
            ->when($q !== '', fn ($w) => $w->where(fn ($x) => $x->where('name', 'like', "%{$q}%")->orWhere('contact', 'like', "%{$q}%")->orWhere('document', 'like', '%'.Plate::digits($q).'%')))
            ->orderByDesc('active')->orderBy('name')->limit(200)->get()
            ->map(fn (Supplier $s) => [
                ...$s->only(['id', 'name', 'document', 'phone', 'contact', 'email', 'notes', 'active']),
                'purchases_count' => $s->purchases_count,
                'purchases_total' => round((float) $s->purchases_sum_total, 2),
            ]);

        return Inertia::render('pecas/fornecedores', ['rows' => $rows, 'filters' => ['q' => $q]]);
    }

    private function validated(Request $request): array
    {
        $d = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'document' => ['nullable', 'string', 'max:20'],
            'phone' => ['nullable', 'string', 'max:20'],
            'contact' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'active' => ['boolean'],
        ], [], ['name' => 'nome', 'document' => 'CNPJ']);
        $d['document'] = Plate::digits($d['document'] ?? null);
        $d['phone'] = Plate::digits($d['phone'] ?? null);

        return $d;
    }

    public function store(Request $request): RedirectResponse
    {
        $s = Supplier::create($this->validated($request));

        return back()->with('success', "Fornecedor {$s->name} cadastrado.");
    }

    public function update(Request $request, Supplier $supplier): RedirectResponse
    {
        $supplier->update($this->validated($request));

        return back()->with('success', 'Fornecedor alterado.');
    }
}
