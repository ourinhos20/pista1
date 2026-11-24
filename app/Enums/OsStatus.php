<?php

namespace App\Enums;

enum OsStatus: string
{
    case Aguardando = 'aguardando';
    case Diagnostico = 'diagnostico';
    case Aprovacao = 'aprovacao';
    case Execucao = 'execucao';
    case Pronto = 'pronto';
    case Entregue = 'entregue';
    case Cancelada = 'cancelada';

    public function label(): string
    {
        return match ($this) {
            self::Aguardando => 'Aguardando',
            self::Diagnostico => 'Em diagnóstico',
            self::Aprovacao => 'Aguardando aprovação',
            self::Execucao => 'Em execução',
            self::Pronto => 'Pronto',
            self::Entregue => 'Entregue',
            self::Cancelada => 'Cancelada',
        };
    }

    /** Status que o mecânico pode definir. */
    public static function mechanicAllowed(): array
    {
        return [self::Diagnostico, self::Aprovacao, self::Execucao, self::Pronto];
    }

    /** Status de OS ainda em andamento na oficina. */
    public static function open(): array
    {
        return [self::Aguardando, self::Diagnostico, self::Aprovacao, self::Execucao, self::Pronto];
    }

    public static function options(): array
    {
        return array_map(fn (self $s) => ['value' => $s->value, 'label' => $s->label()], self::cases());
    }
}
