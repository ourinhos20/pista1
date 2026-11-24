<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // master = sócios, balcao = atendimento, mecanico = oficina
            $table->string('role', 20)->default('balcao')->after('email');
            $table->boolean('active')->default(true)->after('role');
        });

        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('document', 20)->nullable()->index(); // CPF/CNPJ só dígitos
            $table->string('phone', 20)->nullable()->index();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->string('plate', 10)->unique(); // sem hífen, maiúsculas
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('year', 9)->nullable();
            $table->string('engine')->nullable();
            $table->string('color')->nullable();
            $table->unsignedInteger('km')->nullable();
            $table->timestamps();
        });

        Schema::create('service_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            $table->foreignId('vehicle_id')->constrained()->restrictOnDelete();
            $table->foreignId('mechanic_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('aguardando')->index();
            $table->dateTime('scheduled_at')->nullable()->index();
            $table->unsignedInteger('km_in')->nullable();
            $table->unsignedTinyInteger('fuel_level')->nullable(); // 0..4 (vazio..cheio)
            $table->text('complaint')->nullable();   // queixa / solicitação do cliente
            $table->text('diagnosis')->nullable();   // anotações do mecânico
            $table->text('notes')->nullable();       // observações gerais
            $table->json('damages')->nullable();     // marcações no diagrama do carro
            $table->json('checklist')->nullable();   // itens de entrada (estepe, documento...)
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('down_payment', 10, 2)->default(0); // entrada
            $table->string('payment_method', 20)->nullable();
            $table->dateTime('approved_at')->nullable();
            $table->dateTime('delivered_at')->nullable();
            $table->timestamps();
        });

        Schema::create('service_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_order_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10)->default('servico'); // servico | peca
            $table->string('description');
            $table->decimal('quantity', 8, 2)->default(1);
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('service_order_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 20)->nullable();
            $table->string('note')->nullable();
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_order_events');
        Schema::dropIfExists('service_order_items');
        Schema::dropIfExists('service_orders');
        Schema::dropIfExists('vehicles');
        Schema::dropIfExists('clients');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'active']);
        });
    }
};
