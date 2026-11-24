<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Fornecedores e compras de peças (sem catálogo/estoque por enquanto).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('document', 20)->nullable(); // CNPJ/CPF só dígitos
            $table->string('phone', 20)->nullable();
            $table->string('contact')->nullable(); // nome do vendedor
            $table->string('email')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->foreignId('service_order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('invoice', 40)->nullable(); // número da NF
            $table->date('date')->index();
            $table->decimal('total', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_id')->constrained()->cascadeOnDelete();
            $table->string('description');
            $table->decimal('quantity', 8, 2);
            $table->decimal('unit_cost', 10, 2);
            $table->timestamps();
        });

        Schema::table('finance_entries', function (Blueprint $table) {
            $table->foreignId('purchase_id')->nullable()->after('service_order_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('finance_entries', fn (Blueprint $t) => $t->dropConstrainedForeignId('purchase_id'));
        Schema::dropIfExists('purchase_items');
        Schema::dropIfExists('purchases');
        Schema::dropIfExists('suppliers');
    }
};
