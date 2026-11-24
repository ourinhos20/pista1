<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Pedido de agendamento feito pelo cliente no site. */
class PreService extends Model
{
    protected $fillable = ['name', 'phone', 'plate', 'vehicle', 'complaint', 'preferred_at', 'status', 'service_order_id', 'handled_by', 'ip'];

    protected function casts(): array
    {
        return ['preferred_at' => 'datetime'];
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class)->orderBy('id');
    }

    public function serviceOrder(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class);
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
