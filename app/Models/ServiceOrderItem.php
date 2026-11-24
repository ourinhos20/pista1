<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceOrderItem extends Model
{
    protected $fillable = ['type', 'description', 'quantity', 'unit_price'];

    protected function casts(): array
    {
        return ['quantity' => 'float', 'unit_price' => 'float'];
    }

    public function total(): float
    {
        return round($this->quantity * $this->unit_price, 2);
    }
}
