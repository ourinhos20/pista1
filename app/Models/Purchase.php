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
}
