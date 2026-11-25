<?php

namespace App\Enums;

/**
 * Fluxo da OS (sem gargalos):
 * Agendado (bot/site/balcão) -> Recebido (balcão fez o check-in) -> Em diagnóstico (mecânico: vistoria + diagnóstico)
 * -> Aguardando orçamento (balcão lança valores) -> Aguardando aprovação (cliente aprova item por item)
 * -> [Aguardando peças] -> Em execução -> Pronto -> Entregue.
 */
enum OsStatus: string
{
    case Aguardando = 'aguardando';
    case Recebido = 'recebido';
    case Diagnostico = 'diagnostico';
    case Orcamento = 'orcamento';
    case Aprovacao = 'aprovacao';
    case Pecas = 'pecas';
    case Execucao = 'execucao';
    case Pronto = 'pronto';
    case Entregue = 'entregue';
    case Cancelada = 'cancelada';

    public function label(): string
    {
        return match ($this) {
            self::Aguardando => 'Agendado',
            self::Recebido => 'Recebido (aguardando mecânico)',
            self::Diagnostico => 'Em diagnóstico',
            self::Orcamento => 'Aguardando orçamento',
            self::Aprovacao => 'Aguardando aprovação',
            self::Pecas => 'Aguardando peças',
            self::Execucao => 'Em execução',
            self::Pronto => 'Pronto',
            self::Entregue => 'Entregue',
            self::Cancelada => 'Cancelada',
        };
    }

    /**
     * O que o mecânico pode fazer: de => [para]. Valores e entrega ficam com o balcão.
     *
     * @return array<string, string[]>
     */
    public static function mechanicTransitions(): array
    {
        return [
            'recebido' => ['diagnostico'],
            'diagnostico' => ['orcamento'],
            'execucao' => ['pronto'],
        ];
    }

    /** OS ainda em andamento (não entregue nem cancelada). */
    public static function open(): array
    {
        return [self::Aguardando, self::Recebido, self::Diagnostico, self::Orcamento, self::Aprovacao, self::Pecas, self::Execucao, self::Pronto];
    }

    /** OS com o carro dentro da oficina. */
    public static function inShop(): array
    {
        return [self::Recebido, self::Diagnostico, self::Orcamento, self::Aprovacao, self::Pecas, self::Execucao, self::Pronto];
    }

    public static function options(): array
    {
        return array_map(fn (self $s) => ['value' => $s->value, 'label' => $s->label()], self::cases());
    }
}
