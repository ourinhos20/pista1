<?php

namespace App\Models;

use App\Enums\OsStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Peça do catálogo. Estoque = quantidade comprada - quantidade usada em OS (não canceladas). */
class Part extends Model
{
    protected $fillable = ['code', 'description', 'brand', 'unit', 'cost_price', 'sale_price', 'min_stock', 'supplier_id', 'active'];

    protected function casts(): array
    {
        return ['cost_price' => 'float', 'sale_price' => 'float', 'min_stock' => 'float', 'active' => 'boolean'];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    /** Adiciona as colunas "bought", "used" (somas) para calcular o estoque. */
    public function scopeWithStock(Builder $q): Builder
    {
        return $q->addSelect([
            'bought' => PurchaseItem::selectRaw('coalesce(sum(quantity), 0)')->whereColumn('part_id', 'parts.id'),
            'used' => ServiceOrderItem::selectRaw('coalesce(sum(service_order_items.quantity), 0)')
                ->join('service_orders', 'service_orders.id', '=', 'service_order_items.service_order_id')
                ->whereColumn('service_order_items.part_id', 'parts.id')
                ->where('service_orders.status', '!=', OsStatus::Cancelada->value),
        ]);
    }

    public function stock(): float
    {
        return round((float) ($this->bought ?? 0) - (float) ($this->used ?? 0), 2);
    }

    public function toRow(bool $withCost = true): array
    {
        $stock = $this->stock();

        return [
            'id' => $this->id,
            'code' => $this->code,
            'description' => $this->description,
            'brand' => $this->brand,
            'unit' => $this->unit,
            'sale_price' => $this->sale_price,
            ...($withCost ? ['cost_price' => $this->cost_price] : []),
            'min_stock' => $this->min_stock,
            'stock' => $stock,
            'low' => $this->min_stock > 0 && $stock < $this->min_stock,
            'supplier_id' => $this->supplier_id,
            'supplier' => $this->supplier?->name,
            'active' => $this->active,
        ];
    }
}
