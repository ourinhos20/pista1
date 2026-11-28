<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Sequência do mecânico: 1 vistoria → 2 diagnóstico/checklist → 3 peças → 4 fotos.
 * work_done_at marca quando ele concluiu o diagnóstico (ou checklist) e libera as próximas etapas.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            $table->timestamp('work_done_at')->nullable()->after('inspected_by');
        });

        // OS que já passaram do diagnóstico ficam como concluídas
        DB::table('service_orders')
            ->whereNotIn('status', ['aguardando', 'recebido', 'diagnostico'])
            ->update(['work_done_at' => DB::raw('coalesce(inspected_at, updated_at)')]);
    }

    public function down(): void
    {
        Schema::table('service_orders', fn (Blueprint $table) => $table->dropColumn('work_done_at'));
    }
};
