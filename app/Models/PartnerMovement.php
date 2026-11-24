<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartnerMovement extends Model
{
    protected $fillable = ['partner_id', 'type', 'amount', 'date', 'description', 'created_by'];

    protected function casts(): array
    {
        return ['amount' => 'float', 'date' => 'date'];
    }

    public function partner(): BelongsTo
    {
        return $this->belongsTo(Partner::class);
    }
}
