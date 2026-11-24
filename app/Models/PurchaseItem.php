<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseItem extends Model
{
    protected $fillable = ['description', 'quantity', 'unit_cost'];

    protected function casts(): array
    {
        return ['quantity' => 'float', 'unit_cost' => 'float'];
    }
}
