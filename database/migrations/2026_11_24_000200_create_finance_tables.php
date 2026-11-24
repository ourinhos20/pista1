<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sócios da oficina (participação em % para dividir resultado e equilibrar aportes)
        Schema::create('partners', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('share', 5, 2)->default(33.33);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        // Aportes (sócio coloca dinheiro) e retiradas (sócio tira dinheiro)
        Schema::create('partner_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_id')->constrained()->cascadeOnDelete();
            $table->string('type', 10); // aporte | retirada
            $table->decimal('amount', 12, 2);
            $table->date('date')->index();
            $table->string('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Lançamentos financeiros: entradas e saídas, pagas ou em aberto (contas a pagar/receber)
        Schema::create('finance_entries', function (Blueprint $table) {
            $table->id();
            $table->string('type', 10)->index(); // entrada | saida
            $table->string('category', 30)->index();
            $table->string('description');
            $table->string('party')->nullable(); // fornecedor / cliente / favorecido
            $table->decimal('amount', 12, 2);
            $table->date('due_date')->index();
            $table->date('paid_at')->nullable()->index(); // null = em aberto
            $table->string('payment_method', 20)->nullable();
            $table->unsignedSmallInteger('installment')->nullable();
            $table->unsignedSmallInteger('installments')->nullable();
            $table->string('group', 40)->nullable()->index(); // agrupa parcelas
            $table->foreignId('service_order_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_entries');
        Schema::dropIfExists('partner_movements');
        Schema::dropIfExists('partners');
    }
};
