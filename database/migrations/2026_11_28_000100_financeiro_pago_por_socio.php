<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Despesa paga (ou receita recebida) direto pelo sócio: o lançamento gera um aporte
 * (ou retirada) ligado a ele. Excluir/estornar o lançamento desfaz o movimento.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('partner_movements', function (Blueprint $table) {
            $table->foreignId('finance_entry_id')->nullable()->after('partner_id')->constrained('finance_entries')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('partner_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('finance_entry_id');
        });
    }
};
