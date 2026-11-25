<?php

namespace App\Models;

use App\Support\Plate;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vehicle extends Model
{
    protected $fillable = ['client_id', 'plate', 'brand', 'model', 'year', 'engine', 'color', 'km'];

    protected function casts(): array
    {
        return ['km' => 'integer'];
    }

    public function setPlateAttribute($value): void
    {
        // placa pode ficar vazia no agendamento (o cliente não sabe de cabeça); é exigida no check-in
        $this->attributes['plate'] = Plate::normalize($value) ?: null;
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function serviceOrders(): HasMany
    {
        return $this->hasMany(ServiceOrder::class);
    }

    public function title(): string
    {
        return trim(implode(' ', array_filter([$this->brand, $this->model, $this->year])));
    }
}
