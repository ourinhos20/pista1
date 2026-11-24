<?php

namespace App\Models;

use App\Enums\OsStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceOrder extends Model
{
    protected $fillable = [
        'client_id', 'vehicle_id', 'mechanic_id', 'created_by', 'status', 'scheduled_at', 'km_in',
        'fuel_level', 'complaint', 'diagnosis', 'notes', 'damages', 'checklist', 'discount',
        'down_payment', 'payment_method', 'approved_at', 'delivered_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => OsStatus::class,
            'scheduled_at' => 'datetime',
            'approved_at' => 'datetime',
            'delivered_at' => 'datetime',
            'damages' => 'array',
            'checklist' => 'array',
            'discount' => 'float',
            'down_payment' => 'float',
            'km_in' => 'integer',
            'fuel_level' => 'integer',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function mechanic(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mechanic_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ServiceOrderItem::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(ServiceOrderEvent::class)->latest('id');
    }

    public function number(): string
    {
        return str_pad((string) $this->id, 5, '0', STR_PAD_LEFT);
    }

    public function subtotal(): float
    {
        return round($this->items->sum(fn (ServiceOrderItem $i) => $i->total()), 2);
    }

    public function total(): float
    {
        return max(0, round($this->subtotal() - $this->discount, 2));
    }

    public function logEvent(?User $user, ?string $note = null): void
    {
        $this->events()->create([
            'user_id' => $user?->id,
            'status' => $this->status->value,
            'note' => $note,
        ]);
    }
}
