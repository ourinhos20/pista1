<?php

namespace App\Models;

use App\Enums\OsStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ServiceOrder extends Model
{
    protected $fillable = [
        'client_id', 'vehicle_id', 'mechanic_id', 'created_by', 'status', 'scheduled_at', 'km_in',
        'fuel_level', 'complaint', 'diagnosis', 'notes', 'damages', 'checklist', 'revision', 'discount',
        'down_payment', 'payment_method', 'approved_at', 'delivered_at',
        'approval_name', 'approval_note', 'approval_ip', 'rejected_at',
        'origin', 'service_type', 'checked_in_at', 'inspected_at', 'inspected_by', 'work_done_at', 'online_seen_at',
    ];

    protected $hidden = ['public_token'];

    public const ORIGINS = ['balcao' => 'Balcão', 'site' => 'Site', 'bot' => 'Bot WhatsApp'];

    public const SERVICE_TYPES = ['defeito' => 'Defeito / conserto', 'revisao' => 'Revisão', 'preventiva' => 'Preventiva', 'outro' => 'Outro'];

    protected static function booted(): void
    {
        // cada OS ganha um link próprio e impossível de adivinhar para o cliente aprovar o orçamento
        static::creating(function (self $os) {
            $os->public_token ??= Str::random(40);
            $os->status_changed_at ??= now();
        });

        // marca quando a OS entrou na etapa atual (mostra "parada há X" e acusa gargalos)
        static::updating(function (self $os) {
            if ($os->isDirty('status')) {
                $os->status_changed_at = now();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'status' => OsStatus::class,
            'scheduled_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'delivered_at' => 'datetime',
            'status_changed_at' => 'datetime',
            'checked_in_at' => 'datetime',
            'inspected_at' => 'datetime',
            'work_done_at' => 'datetime',
            'online_seen_at' => 'datetime',
            'damages' => 'array',
            'checklist' => 'array',
            'revision' => 'array',
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

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class)->orderBy('id');
    }

    public function publicUrl(): string
    {
        return route('orcamento.show', $this->public_token);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(FinanceEntry::class)->orderBy('due_date')->orderBy('id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(ServiceOrderEvent::class)->latest('id');
    }

    public function number(): string
    {
        return str_pad((string) $this->id, 5, '0', STR_PAD_LEFT);
    }

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspected_by');
    }

    /** Itens que contam no valor: tudo menos o que o cliente recusou. */
    public function subtotal(): float
    {
        return round($this->items->where('approval', '!=', 'recusado')->sum(fn (ServiceOrderItem $i) => $i->total()), 2);
    }

    /** Itens complementares (achados durante a execução) esperando o cliente. */
    public function pendingExtras()
    {
        return $this->items->filter(fn (ServiceOrderItem $i) => $i->extra && $i->approval === null);
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
