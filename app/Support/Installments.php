<?php

namespace App\Support;

use App\Models\FinanceEntry;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/** Cria um lançamento único ou dividido em parcelas mensais. */
class Installments
{
    /**
     * @param  array<string, mixed>  $base  campos comuns (type, category, description, party...)
     * @return FinanceEntry[]
     */
    public static function create(array $base, float $amount, Carbon $firstDue, int $count = 1, bool $firstPaid = false, ?Carbon $paidAt = null): array
    {
        $count = max(1, min(48, $count));
        $cents = (int) round($amount * 100);
        $each = intdiv($cents, $count);
        $group = $count > 1 ? (string) Str::uuid() : null;
        $out = [];

        for ($i = 1; $i <= $count; $i++) {
            // a última parcela leva os centavos que sobraram
            $value = $i === $count ? $cents - $each * ($count - 1) : $each;
            $paid = $count === 1 ? $firstPaid : ($firstPaid && $i === 1);
            $due = $firstDue->copy()->addMonthsNoOverflow($i - 1);

            $out[] = FinanceEntry::create([
                ...$base,
                'description' => $count > 1 ? "{$base['description']} ({$i}/{$count})" : $base['description'],
                'amount' => $value / 100,
                'due_date' => $due->toDateString(),
                'paid_at' => $paid ? ($paidAt ?? $due)->toDateString() : null,
                'installment' => $count > 1 ? $i : null,
                'installments' => $count > 1 ? $count : null,
                'batch' => $group,
            ]);
        }

        return $out;
    }
}
