<?php

namespace App\Console\Commands;

use App\Support\VehicleCatalog;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Atualiza o catálogo de marcas e modelos de carros a partir da tabela FIPE
 * (API pública parallelum). Grava em database/data/veiculos-fipe.json e recarrega
 * as tabelas. Não precisa rodar na hospedagem: o arquivo já vai junto com o sistema.
 *
 *   php artisan pista1:catalogo-fipe            baixa da FIPE e recarrega
 *   php artisan pista1:catalogo-fipe --so-importar   só recarrega do arquivo
 */
class CatalogoFipe extends Command
{
    protected $signature = 'pista1:catalogo-fipe {--so-importar : não baixa, só carrega o arquivo já existente}';

    protected $description = 'Atualiza o catálogo de marcas e modelos (tabela FIPE)';

    private const API = 'https://parallelum.com.br/fipe/api/v1/carros';

    public function handle(): int
    {
        if (! $this->option('so-importar')) {
            $brands = Http::timeout(30)->retry(3, 2000)->get(self::API.'/marcas')->throw()->json();
            $out = [];
            $bar = $this->output->createProgressBar(count($brands));
            foreach ($brands as $b) {
                $models = Http::timeout(30)->retry(3, 3000)->get(self::API."/marcas/{$b['codigo']}/modelos")->throw()->json('modelos') ?? [];
                $names = collect($models)->pluck('nome')->map(fn ($n) => trim(preg_replace('/\s+/', ' ', $n)))->filter()->unique()->sort(SORT_NATURAL | SORT_FLAG_CASE)->values()->all();
                if ($names) {
                    $out[] = ['marca' => VehicleCatalog::brandName($b['nome']), 'modelos' => $names];
                }
                $bar->advance();
                usleep(250_000); // não sobrecarregar a API pública
            }
            $bar->finish();
            $this->newLine();

            file_put_contents(VehicleCatalog::file(), json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            $this->info('Arquivo gravado: '.count($out).' marcas.');
        }

        [$brands, $models] = VehicleCatalog::import();
        $this->info("Catálogo carregado: {$brands} marcas e {$models} modelos.");

        return self::SUCCESS;
    }
}
