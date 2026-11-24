<?php

namespace App\Enums;

/**
 * Fluxo da OS:
 * Agendado (balcão) -> Em diagnóstico (mecânico) -> Aguardando orçamento (mecânico enviou ao balcão)
 * -> Aguardando aprovação (balcão imprimiu/enviou ao cliente) -> Em execução -> Pronto -> Entregue.
 */
enum OsStatus: string
{
    case Aguardando = 'aguardando';
    case Diagnostico = 'diagnostico';
    case Orcamento = 'orcamento';
    case Aprovacao = 'aprovacao';
    case Execucao = 'execucao';
    case Pronto = 'pronto';
    case Entregue = 'entregue';
    case Cancelada = 'cancelada';

    public function label(): string
    {
        return match ($this) {
            self::Aguardando => 'Agendado',
            self::Diagnostico => 'Em diagnóstico',
            self::Orcamento => 'Aguardando orçamento',
            self::Aprovacao => 'Aguardando aprovação',
            self::Execucao => 'Em execução',
            self::Pronto => 'Pronto',
            self::Entregue => 'Entregue',
            self::Cancelada => 'Cancelada',
        };
    }

    /** Status que o mecânico pode definir (valores e entrega ficam com o balcão). */
    public static function mechanicAllowed(): array
    {
        return [self::Diagnostico, self::Orcamento, self::Execucao, self::Pronto];
    }

    /** Status de OS ainda em andamento na oficina. */
    public static function open(): array
    {
        return [self::Aguardando, self::Diagnostico, self::Orcamento, self::Aprovacao, self::Execucao, self::Pronto];
    }

    public static function options(): array
    {
        return array_map(fn (self $s) => ['value' => $s->value, 'label' => $s->label()], self::cases());
    }
}
