<?php

namespace App\Models;

use App\Support\Finance;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class FinanceEntry extends Model
{
    protected $fillable = [
        'type', 'category', 'description', 'party', 'amount', 'due_date', 'paid_at', 'payment_method',
        'installment', 'installments', 'batch', 'service_order_id', 'purchase_id', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'due_date' => 'date',
            'paid_at' => 'date',
            'installment' => 'integer',
            'installments' => 'integer',
        ];
    }

    public function serviceOrder(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class);
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    /** Aporte/retirada gerado quando um sócio pagou ou recebeu direto. */
    public function partnerMovement(): HasOne
    {
        return $this->hasOne(PartnerMovement::class);
    }

    public function isOverdue(): bool
    {
        return ! $this->paid_at && $this->due_date->lt(today());
    }

    public function toRow(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'category' => $this->category,
            'category_label' => Finance::allCategories()[$this->category] ?? $this->category,
            'description' => $this->description,
            'party' => $this->party,
            'amount' => $this->amount,
            'due_date' => $this->due_date?->toDateString(),
            'paid_at' => $this->paid_at?->toDateString(),
            'payment_method' => $this->payment_method,
            'installment' => $this->installment,
            'installments' => $this->installments,
            'service_order_id' => $this->service_order_id,
            'os_number' => $this->service_order_id ? str_pad((string) $this->service_order_id, 5, '0', STR_PAD_LEFT) : null,
            'purchase_id' => $this->purchase_id,
            'paid_by' => $this->relationLoaded('partnerMovement') ? $this->partnerMovement?->partner?->name : null,
            'notes' => $this->notes,
            'overdue' => $this->isOverdue(),
        ];
    }
}
