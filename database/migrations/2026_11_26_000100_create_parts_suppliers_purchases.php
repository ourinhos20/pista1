<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

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

        // Catálogo de peças. O estoque NÃO é guardado: é calculado (comprado - usado nas OS).
        Schema::create('parts', function (Blueprint $table) {
            $table->id();
            $table->string('code', 60)->nullable()->index(); // código do fabricante / interno
            $table->string('description');
            $table->string('brand', 60)->nullable();
            $table->string('unit', 10)->default('un'); // un, L, kit, par, jogo
            $table->decimal('cost_price', 10, 2)->default(0);
            $table->decimal('sale_price', 10, 2)->default(0);
            $table->decimal('min_stock', 8, 2)->default(0);
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
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
            $table->foreignId('part_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description');
            $table->decimal('quantity', 8, 2);
            $table->decimal('unit_cost', 10, 2);
            $table->timestamps();
        });

        Schema::table('service_order_items', function (Blueprint $table) {
            $table->foreignId('part_id')->nullable()->after('service_order_id')->constrained()->nullOnDelete();
        });

        Schema::table('finance_entries', function (Blueprint $table) {
            $table->foreignId('purchase_id')->nullable()->after('service_order_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('finance_entries', fn (Blueprint $t) => $t->dropConstrainedForeignId('purchase_id'));
        Schema::table('service_order_items', fn (Blueprint $t) => $t->dropConstrainedForeignId('part_id'));
        Schema::dropIfExists('purchase_items');
        Schema::dropIfExists('purchases');
        Schema::dropIfExists('parts');
        Schema::dropIfExists('suppliers');
    }
};
