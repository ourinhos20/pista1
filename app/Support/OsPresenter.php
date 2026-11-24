<?php

namespace App\Support;

use App\Models\Client;
use App\Models\ServiceOrder;
use App\Models\ServiceOrderItem;
use App\Models\User;
use App\Models\Vehicle;

/**
 * Monta os dados que vão para a tela respeitando o perfil.
 * Mecânico: nunca recebe CPF, telefone, e-mail, endereço nem valores.
 */
class OsPresenter
{
    public static function client(?Client $c, User $user): ?array
    {
        if (! $c) {
            return null;
        }

        if (! $user->canSeeSensitive()) {
            return ['id' => $c->id, 'name' => $c->firstName()];
        }

        return $c->only(['id', 'name', 'document', 'phone', 'email', 'address', 'city', 'notes']);
    }

    public static function vehicle(?Vehicle $v): ?array
    {
        if (! $v) {
            return null;
        }

        return [
            ...$v->only(['id', 'client_id', 'plate', 'brand', 'model', 'year', 'engine', 'color', 'km']),
            'title' => $v->title(),
        ];
    }

    /** Versão curta para listas e cards. */
    public static function card(ServiceOrder $os, User $user): array
    {
        $data = [
            'id' => $os->id,
            'number' => $os->number(),
            'status' => $os->status->value,
            'scheduled_at' => $os->scheduled_at?->toIso8601String(),
            'created_at' => $os->created_at?->toIso8601String(),
            'complaint' => $os->complaint,
            'km_in' => $os->km_in,
            'client' => self::client($os->client, $user),
            'vehicle' => self::vehicle($os->vehicle),
            'mechanic' => $os->mechanic ? ['id' => $os->mechanic->id, 'name' => $os->mechanic->name] : null,
        ];

        if ($user->canSeeSensitive() && $os->relationLoaded('items')) {
            $data['total'] = $os->total();
        }

        return $data;
    }

    public static function full(ServiceOrder $os, User $user): array
    {
        $os->loadMissing(['client', 'vehicle', 'mechanic', 'items', 'events.user', 'payments', 'attachments.uploader']);
        $sensitive = $user->canSeeSensitive();

        return [
            ...self::card($os, $user),
            'fuel_level' => $os->fuel_level,
            'diagnosis' => $os->diagnosis,
            'notes' => $os->notes,
            'damages' => $os->damages ?? [],
            'checklist' => $os->checklist ?? [],
            'revision' => (object) ($os->revision ?? []),
            'approved_at' => $os->approved_at?->toIso8601String(),
            'rejected_at' => $os->rejected_at?->toIso8601String(),
            'approval_name' => $os->approval_name,
            'approval_note' => $os->approval_note,
            'photos' => $os->attachments->map(fn ($a) => [...$a->toRow(), 'mine' => $a->uploaded_by === $user->id])->values(),
            'delivered_at' => $os->delivered_at?->toIso8601String(),
            'items' => $os->items->map(fn (ServiceOrderItem $i) => [
                'id' => $i->id,
                'type' => $i->type,
                'description' => $i->description,
                'quantity' => $i->quantity,
                ...($sensitive ? ['unit_price' => $i->unit_price, 'total' => $i->total()] : []),
            ])->values(),
            'events' => $os->events->map(fn ($e) => [
                'id' => $e->id,
                'status' => $e->status,
                'note' => $e->note,
                'user' => $e->user?->name,
                'created_at' => $e->created_at?->toIso8601String(),
            ])->values(),
            ...($sensitive ? [
                'subtotal' => $os->subtotal(),
                'discount' => $os->discount,
                'total' => $os->total(),
                'down_payment' => $os->down_payment,
                'payment_method' => $os->payment_method,
                'public_url' => $os->public_token ? $os->publicUrl() : null,
                'payments' => $os->payments->map(fn ($p) => [
                    'id' => $p->id,
                    'amount' => $p->amount,
                    'due_date' => $p->due_date?->toDateString(),
                    'paid_at' => $p->paid_at?->toDateString(),
                    'payment_method' => $p->payment_method,
                    'installment' => $p->installment,
                    'installments' => $p->installments,
                ])->values(),
                'paid_total' => round((float) $os->payments->whereNotNull('paid_at')->sum('amount'), 2),
                'billed_total' => round((float) $os->payments->sum('amount'), 2),
            ] : []),
        ];
    }
}
