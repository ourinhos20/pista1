<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Catálogo FIPE: marcas e os modelos de cada marca (só nomes, sem dado de cliente). */
class VehicleCatalogController extends Controller
{
    public function brands(): JsonResponse
    {
        $rows = DB::table('vehicle_catalog_brands')->orderBy('rank')->orderBy('name')->get(['name', 'rank']);

        return response()->json($rows->map(fn ($r) => ['name' => $r->name, 'popular' => $r->rank < 999]))
            ->header('Cache-Control', 'private, max-age=86400');
    }

    public function models(Request $request): JsonResponse
    {
        $brand = trim($request->string('marca')->toString());
        $id = $brand !== '' ? DB::table('vehicle_catalog_brands')->where('name', $brand)->value('id') : null;
        $names = $id ? DB::table('vehicle_catalog_models')->where('brand_id', $id)->orderBy('name')->pluck('name') : collect();

        return response()->json($names)->header('Cache-Control', 'private, max-age=86400');
    }
}
