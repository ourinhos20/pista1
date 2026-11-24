<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Partner extends Model
{
    protected $fillable = ['name', 'user_id', 'share', 'active'];

    protected function casts(): array
    {
        return ['share' => 'float', 'active' => 'boolean'];
    }

    public function movements(): HasMany
    {
        return $this->hasMany(PartnerMovement::class);
    }
}
