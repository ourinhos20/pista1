<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Fluxo da OS sem gargalos:
 * - toda entrada (balcão, site, bot) já é uma OS (origem registrada);
 * - placa opcional no agendamento (obrigatória no check-in);
 * - check-in ("cliente chegou"), vistoria obrigatória do mecânico;
 * - aprovação item por item e itens complementares;
 * - quanto tempo a OS está na etapa atual.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            $table->string('origin', 10)->default('balcao')->after('status'); // balcao | site | bot
            $table->string('service_type', 15)->nullable()->after('origin'); // defeito | revisao | preventiva | outro
            $table->timestamp('status_changed_at')->nullable()->after('service_type');
            $table->dateTime('checked_in_at')->nullable();
            $table->dateTime('inspected_at')->nullable();
            $table->foreignId('inspected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('online_seen_at')->nullable();
        });

        Schema::table('service_order_items', function (Blueprint $table) {
            $table->string('approval', 10)->nullable(); // null = pendente | aprovado | recusado
            $table->boolean('extra')->default(false); // encontrado durante a execução (orçamento complementar)
        });

        // placa pode ficar em branco até o carro chegar
        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('plate', 10)->nullable()->change();
        });

        // ---- dados que já existem ----
        DB::table('service_orders')->update(['status_changed_at' => DB::raw('updated_at')]);
        DB::table('service_orders')
            ->whereIn('status', ['orcamento', 'aprovacao', 'execucao', 'pronto', 'entregue'])
            ->update(['inspected_at' => DB::raw('created_at'), 'checked_in_at' => DB::raw('created_at')]);
        DB::table('service_orders')->where('status', 'diagnostico')->update(['checked_in_at' => DB::raw('created_at')]);
        $approved = DB::table('service_orders')->whereNotNull('approved_at')->pluck('id');
        DB::table('service_order_items')->whereIn('service_order_id', $approved)->update(['approval' => 'aprovado']);

        // pedidos do site ainda não tratados viram OS "Agendado" (a fila separada deixa de existir)
        if (Schema::hasTable('pre_services')) {
            foreach (DB::table('pre_services')->where('status', 'novo')->get() as $p) {
                $clientId = DB::table('clients')->where('phone', $p->phone)->value('id')
                    ?? DB::table('clients')->insertGetId(['name' => $p->name, 'phone' => $p->phone, 'created_at' => now(), 'updated_at' => now()]);
                $vehicleId = $p->plate ? DB::table('vehicles')->where('plate', $p->plate)->value('id') : null;
                $vehicleId ??= DB::table('vehicles')->insertGetId([
                    'client_id' => $clientId, 'plate' => $p->plate, 'model' => $p->vehicle, 'created_at' => now(), 'updated_at' => now(),
                ]);
                $osId = DB::table('service_orders')->insertGetId([
                    'public_token' => Str::random(40),
                    'client_id' => $clientId, 'vehicle_id' => $vehicleId, 'status' => 'aguardando', 'origin' => 'site',
                    'complaint' => $p->complaint, 'scheduled_at' => $p->preferred_at, 'status_changed_at' => $p->created_at,
                    'discount' => 0, 'down_payment' => 0, 'created_at' => $p->created_at, 'updated_at' => now(),
                ]);
                DB::table('attachments')->where('pre_service_id', $p->id)->update(['service_order_id' => $osId, 'show_to_client' => false]);
                DB::table('pre_services')->where('id', $p->id)->update(['status' => 'convertido', 'service_order_id' => $osId]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('service_order_items', fn (Blueprint $t) => $t->dropColumn(['approval', 'extra']));
        Schema::table('service_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('inspected_by');
            $table->dropColumn(['origin', 'service_type', 'status_changed_at', 'checked_in_at', 'inspected_at', 'online_seen_at']);
        });
    }
};
