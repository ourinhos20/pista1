<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Purchase extends Model
{
    protected $fillable = ['supplier_id', 'service_order_id', 'invoice', 'date', 'total', 'notes', 'created_by'];

    protected function casts(): array
    {
        return ['date' => 'date', 'total' => 'float'];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function serviceOrder(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(FinanceEntry::class)->orderBy('due_date');
    }

    /** Linha usada nas telas de compras e na ficha do fornecedor (carregar supplier, items, entries). */
    public function toRow(): array
    {
        return [
            'id' => $this->id,
            'date' => $this->date->toDateString(),
            'invoice' => $this->invoice,
            'supplier' => $this->supplier?->name,
            'service_order_id' => $this->service_order_id,
            'os_number' => $this->service_order_id ? str_pad((string) $this->service_order_id, 5, '0', STR_PAD_LEFT) : null,
            'total' => $this->total,
            'notes' => $this->notes,
            'items' => $this->items->map(fn ($i) => $i->only(['description', 'quantity', 'unit_cost']))->values(),
            'entries' => $this->entries->map(fn ($e) => ['amount' => $e->amount, 'due_date' => $e->due_date->toDateString(), 'paid_at' => $e->paid_at?->toDateString()])->values(),
            'paid' => $this->entries->isNotEmpty() && $this->entries->every(fn ($e) => $e->paid_at !== null),
            'open_amount' => round((float) $this->entries->whereNull('paid_at')->sum('amount'), 2),
        ];
    }
}
