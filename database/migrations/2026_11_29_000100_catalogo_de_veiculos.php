<?php

use App\Support\VehicleCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo de marcas e modelos (tabela FIPE). Os dados vêm de
 * database/data/veiculos-fipe.json e entram já na migração, então a
 * hospedagem não precisa acessar a internet. Modelo do veículo continua
 * texto: o catálogo só sugere o nome certo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_catalog_brands', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60)->unique();
            $table->unsignedSmallInteger('rank')->default(999); // marcas comuns primeiro
        });
        Schema::create('vehicle_catalog_models', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brand_id')->constrained('vehicle_catalog_brands')->cascadeOnDelete();
            $table->string('name', 120);
            $table->index(['brand_id', 'name']);
        });

        // modelo com versão e motor é maior que 60 letras
        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('model', 120)->nullable()->change();
            $table->string('chassis', 17)->nullable()->after('plate'); // chassi (VIN)
        });

        VehicleCatalog::import();
    }

    public function down(): void
    {
        Schema::table('vehicles', fn (Blueprint $table) => $table->dropColumn('chassis'));
        Schema::dropIfExists('vehicle_catalog_models');
        Schema::dropIfExists('vehicle_catalog_brands');
    }
};
