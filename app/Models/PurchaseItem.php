<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseItem extends Model
{
    protected $fillable = ['part_id', 'description', 'quantity', 'unit_cost'];

    protected function casts(): array
    {
        return ['quantity' => 'float', 'unit_cost' => 'float'];
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }
}
