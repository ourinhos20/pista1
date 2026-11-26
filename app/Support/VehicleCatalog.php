<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Catálogo de marcas e modelos (tabela FIPE) usado para escolher o veículo
 * com o nome certo, incluindo versão e motor (ex.: "Tucson 2.0 16V" x "Tucson GLS 2.7 V6").
 */
class VehicleCatalog
{
    /** Marcas que aparecem primeiro na lista (as mais comuns na oficina). */
    public const POPULAR = ['Chevrolet', 'Fiat', 'Volkswagen', 'Ford', 'Hyundai', 'Toyota', 'Renault', 'Honda', 'Jeep', 'Nissan', 'Peugeot', 'Citroën', 'Mitsubishi', 'Kia', 'BYD', 'Caoa Chery'];

    public static function file(): string
    {
        return database_path('data/veiculos-fipe.json');
    }

    /** Nome da marca como o balcão conhece ("GM - Chevrolet" vira "Chevrolet"). */
    public static function brandName(string $fipe): string
    {
        $map = [
            'GM - Chevrolet' => 'Chevrolet',
            'VW - VolksWagen' => 'Volkswagen',
            'Kia Motors' => 'Kia',
            'Citroen' => 'Citroën',
            'CAOA Chery' => 'Caoa Chery',
            'Caoa Chery' => 'Caoa Chery',
            'Mercedes-Benz' => 'Mercedes-Benz',
            'LAND ROVER' => 'Land Rover',
            'ASTON MARTIN' => 'Aston Martin',
        ];

        return $map[$fipe] ?? $fipe;
    }

    /**
     * Recarrega as tabelas a partir do arquivo. Retorna [marcas, modelos].
     *
     * @return array{0:int,1:int}
     */
    public static function import(): array
    {
        $path = self::file();
        if (! is_file($path)) {
            return [0, 0];
        }
        $data = json_decode((string) file_get_contents($path), true) ?: [];

        DB::transaction(function () use ($data) {
            DB::table('vehicle_catalog_models')->delete();
            DB::table('vehicle_catalog_brands')->delete();
            foreach ($data as $row) {
                $popular = array_search($row['marca'], self::POPULAR, true);
                $id = DB::table('vehicle_catalog_brands')->insertGetId([
                    'name' => $row['marca'],
                    'rank' => $popular === false ? 999 : $popular,
                ]);
                foreach (array_chunk($row['modelos'], 300) as $chunk) {
                    DB::table('vehicle_catalog_models')->insert(array_map(fn ($m) => ['brand_id' => $id, 'name' => mb_substr($m, 0, 120)], $chunk));
                }
            }
        });

        return [DB::table('vehicle_catalog_brands')->count(), DB::table('vehicle_catalog_models')->count()];
    }
}
