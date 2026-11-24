<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // Pedidos de agendamento feitos pelo cliente no site
        Schema::create('pre_services', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone', 20);
            $table->string('plate', 10)->nullable()->index();
            $table->string('vehicle')->nullable();
            $table->text('complaint');
            $table->dateTime('preferred_at')->nullable();
            $table->string('status', 15)->default('novo')->index(); // novo | convertido | descartado
            $table->foreignId('service_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('ip', 45)->nullable();
            $table->timestamps();
        });

        // Fotos (ficam fora da pasta pública; só são servidas por rota autenticada)
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_order_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('pre_service_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('thumb_path');
            $table->unsignedInteger('size')->default(0);
            $table->string('caption', 120)->nullable();
            $table->boolean('show_to_client')->default(true);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Aprovação do orçamento pelo link enviado ao cliente
        Schema::table('service_orders', function (Blueprint $table) {
            $table->string('public_token', 40)->nullable()->unique()->after('id');
            $table->string('approval_name')->nullable()->after('approved_at');
            $table->string('approval_note', 500)->nullable()->after('approval_name');
            $table->string('approval_ip', 45)->nullable()->after('approval_note');
            $table->dateTime('rejected_at')->nullable()->after('approval_ip');
        });

        // OS já existentes ganham um link próprio
        foreach (DB::table('service_orders')->whereNull('public_token')->pluck('id') as $id) {
            DB::table('service_orders')->where('id', $id)->update(['public_token' => Str::random(40)]);
        }
    }

    public function down(): void
    {
        Schema::table('service_orders', function (Blueprint $table) {
            $table->dropUnique(['public_token']);
            $table->dropColumn(['public_token', 'approval_name', 'approval_note', 'approval_ip', 'rejected_at']);
        });
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('pre_services');
    }
};
