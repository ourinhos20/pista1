<?php

namespace App\Support;

use App\Enums\OsStatus;
use App\Models\Client;
use App\Models\FinanceEntry;
use App\Models\Partner;
use App\Models\PartnerMovement;
use App\Models\ServiceOrder;
use App\Models\Supplier;
use Illuminate\Support\Carbon;

class Finance
{
    public const CATEGORIES = [
        'entrada' => [
            'servicos' => 'Serviços (OS)',
            'pecas_venda' => 'Venda de peças',
            'outras_receitas' => 'Outras receitas',
        ],
        'saida' => [
            'autopecas' => 'Autopeças / fornecedores',
            'aluguel' => 'Aluguel',
            'energia_agua' => 'Energia / água / internet',
            'salarios' => 'Salários e comissões',
            'ferramentas' => 'Ferramentas e equipamentos',
            'impostos' => 'Impostos e taxas',
            'manutencao' => 'Manutenção da oficina',
            'outras_despesas' => 'Outras despesas',
        ],
    ];

    public const METHODS = [
        'dinheiro' => 'Dinheiro',
        'pix' => 'Pix',
        'debito' => 'Cartão de débito',
        'credito' => 'Cartão de crédito',
        'boleto' => 'Boleto',
        'transferencia' => 'Transferência',
        'parcelado' => 'Crediário / promissória',
    ];

    /**
     * OS com valor a receber (total aprovado − o que já foi lançado no financeiro).
     * Usado na "Nova entrada" (vincular a OS) e no painel (OS prontas sem pagamento lançado).
     *
     * @return array<int, array<string, mixed>>
     */
    public static function ordersToReceive(?array $statuses = null): array
    {
        $statuses ??= [OsStatus::Aprovacao, OsStatus::Pecas, OsStatus::Execucao, OsStatus::Pronto, OsStatus::Entregue];

        return ServiceOrder::with(['items', 'payments', 'client', 'vehicle'])
            ->whereIn('status', $statuses)->latest('id')->limit(200)->get()
            ->map(function (ServiceOrder $os) {
                $total = $os->total();
                $billed = round((float) $os->payments->where('type', 'entrada')->sum('amount'), 2);

                return [
                    'id' => $os->id,
                    'number' => $os->number(),
                    'status' => $os->status->value,
                    'status_label' => $os->status->label(),
                    'client' => $os->client?->name,
                    'vehicle' => trim(($os->vehicle?->title() ?? '').' '.($os->vehicle?->plate ?? '')),
                    'total' => $total,
                    'billed' => $billed,
                    'remaining' => round($total - $billed, 2),
                ];
            })
            ->filter(fn ($r) => $r['remaining'] > 0.009)
            ->values()->all();
    }

    /** Sugestões para o campo "cliente / fornecedor", separadas por tipo. */
    public static function parties(): array
    {
        $past = fn (string $type) => FinanceEntry::where('type', $type)->whereNotNull('party')->distinct()->pluck('party');

        return [
            'entrada' => Client::orderBy('name')->limit(300)->pluck('name')->merge($past('entrada'))->unique()->sort()->values(),
            'saida' => Supplier::where('active', true)->orderBy('name')->pluck('name')->merge($past('saida'))->unique()->sort()->values(),
        ];
    }

    public static function categoryKeys(string $type): array
    {
        return array_keys(self::CATEGORIES[$type] ?? []);
    }

    public static function allCategories(): array
    {
        return self::CATEGORIES['entrada'] + self::CATEGORIES['saida'];
    }

    /**
     * Saldo em caixa até a data: entradas pagas - saídas pagas + aportes - retiradas.
     */
    public static function cashBalance(?Carbon $until = null): float
    {
        $until ??= now();
        $in = FinanceEntry::where('type', 'entrada')->whereNotNull('paid_at')->whereDate('paid_at', '<=', $until)->sum('amount');
        $out = FinanceEntry::where('type', 'saida')->whereNotNull('paid_at')->whereDate('paid_at', '<=', $until)->sum('amount');
        $ap = PartnerMovement::where('type', 'aporte')->whereDate('date', '<=', $until)->sum('amount');
        $re = PartnerMovement::where('type', 'retirada')->whereDate('date', '<=', $until)->sum('amount');

        return round($in - $out + $ap - $re, 2);
    }

    /**
     * Equilíbrio dos sócios: compara o que cada um investiu (aportes - retiradas)
     * com a parte que caberia a ele pela participação. Diferença positiva = investiu
     * acima da parte dele; negativa = precisa aportar para ficar igual.
     *
     * @return array{partners: array<int, array<string, mixed>>, total: float}
     */
    public static function partnerBalance(): array
    {
        $partners = Partner::where('active', true)->orderBy('id')->get();
        $sums = PartnerMovement::selectRaw('partner_id, type, sum(amount) as total')->groupBy('partner_id', 'type')->get()
            ->groupBy('partner_id');

        $rows = $partners->map(function (Partner $p) use ($sums) {
            $mine = $sums->get($p->id, collect());
            $ap = (float) ($mine->firstWhere('type', 'aporte')->total ?? 0);
            $re = (float) ($mine->firstWhere('type', 'retirada')->total ?? 0);

            return ['id' => $p->id, 'name' => $p->name, 'share' => (float) $p->share, 'aportes' => round($ap, 2), 'retiradas' => round($re, 2), 'net' => round($ap - $re, 2)];
        });

        $total = round($rows->sum('net'), 2);
        $shareSum = max(0.01, $rows->sum('share'));

        $result = $rows->map(function ($r) use ($total, $shareSum) {
            $target = round($total * $r['share'] / $shareSum, 2);

            return [...$r, 'target' => $target, 'diff' => round($r['net'] - $target, 2)];
        })->values()->all();

        return ['partners' => $result, 'total' => $total];
    }

    /** Converte "1.234,56" ou "1234.56" em número. */
    public static function parseMoney(mixed $v): float
    {
        if (is_numeric($v)) {
            return round((float) $v, 2);
        }
        $s = preg_replace('/[^\d,.\-]/', '', (string) $v);
        if (str_contains($s, ',')) {
            $s = str_replace('.', '', $s);
            $s = str_replace(',', '.', $s);
        }

        return round((float) $s, 2);
    }
}
