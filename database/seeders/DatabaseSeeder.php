<?php

namespace Database\Seeders;

use App\Enums\OsStatus;
use App\Models\Client;
use App\Models\FinanceEntry;
use App\Models\Partner;
use App\Models\PartnerMovement;
use App\Support\OsIntake;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\ServiceOrder;
use App\Support\Installments;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;

/**
 * Dados de DEMONSTRAÇÃO para uso local.
 * Senha de todos os usuários de teste: pista1234
 * Em produção, crie os usuários reais pela tela "Usuários" e apague estes.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Nunca criar usuários e dados de exemplo no servidor de produção
        if (app()->isProduction()) {
            $this->command?->error('Dados de demonstração não são criados em produção. Use: php artisan pista1:criar-master');

            return;
        }

        $pwd = 'pista1234';
        $users = [
            ['Sócio 1', 'socio1@pista1.test', 'master'],
            ['Sócio 2', 'socio2@pista1.test', 'master'],
            ['Sócio 3', 'socio3@pista1.test', 'master'],
            ['Atendimento', 'balcao@pista1.test', 'balcao'],
            ['Carlos Mecânico', 'carlos@pista1.test', 'mecanico'],
            ['Rafael Mecânico', 'rafael@pista1.test', 'mecanico'],
        ];
        foreach ($users as [$name, $email, $role]) {
            User::updateOrCreate(['email' => $email], ['name' => $name, 'role' => $role, 'active' => true, 'password' => $pwd, 'email_verified_at' => now()]);
        }

        if (Client::exists()) {
            return;
        }

        $balcao = User::where('email', 'balcao@pista1.test')->first();
        $carlos = User::where('email', 'carlos@pista1.test')->first();
        $rafael = User::where('email', 'rafael@pista1.test')->first();

        $data = [
            ['João Pereira da Silva', '12345678909', '11987654321', 'ABC1D23', 'Volkswagen', 'Gol 1.6', '2018', 'Prata', 84500],
            ['Maria Oliveira', '98765432100', '11912345678', 'FGH4I56', 'Chevrolet', 'Onix LT', '2020', 'Branco', 52300],
            ['Pedro Santos', '11122233344', '11955554444', 'JKL7M89', 'Fiat', 'Strada Freedom', '2021', 'Vermelho', 61200],
            ['Ana Costa', '55566677788', '11944443333', 'QRS2T34', 'Toyota', 'Corolla XEi', '2019', 'Preto', 98700],
            ['Lucas Almeida', '99988877766', '11933332222', 'UVW5X67', 'Hyundai', 'HB20 1.0', '2022', 'Cinza', 31800],
            ['Bruno Ferreira', '22233344455', '11922221111', 'MNO3P45', 'Honda', 'Fit EX', '2017', 'Azul', 112400],
        ];

        $vehicles = [];
        foreach ($data as [$name, $doc, $phone, $plate, $brand, $model, $year, $color, $km]) {
            $c = Client::create(['name' => $name, 'document' => $doc, 'phone' => $phone, 'city' => 'São Paulo', 'address' => 'Rua Exemplo, 100']);
            $vehicles[] = Vehicle::create(['client_id' => $c->id, 'plate' => $plate, 'brand' => $brand, 'model' => $model, 'year' => $year, 'color' => $color, 'km' => $km]);
        }

        $make = function (Vehicle $v, OsStatus $status, ?User $mech, string $complaint, array $items, array $extra = []) use ($balcao) {
            $inShop = ! in_array($status, [OsStatus::Aguardando], true);
            $inspected = ! in_array($status, [OsStatus::Aguardando, OsStatus::Recebido], true);
            $approved = in_array($status, [OsStatus::Pecas, OsStatus::Execucao, OsStatus::Pronto, OsStatus::Entregue], true);
            $os = ServiceOrder::create([
                'client_id' => $v->client_id, 'vehicle_id' => $v->id, 'mechanic_id' => $mech?->id, 'created_by' => $balcao->id,
                'status' => $status, 'complaint' => $complaint, 'origin' => 'balcao', 'service_type' => 'defeito',
                'checked_in_at' => $inShop ? now()->subHours(4) : null,
                // diagnóstico concluído em toda OS que já passou da etapa do mecânico
                'work_done_at' => in_array($status, [OsStatus::Aguardando, OsStatus::Recebido, OsStatus::Diagnostico], true) ? null : now()->subHours(3),
                ...($inspected ? [
                    'km_in' => $v->km, 'fuel_level' => 2, 'inspected_at' => now()->subHours(4), 'inspected_by' => $mech?->id,
                    'damages' => [['x' => 22, 'y' => 18, 'type' => 'risco', 'note' => 'Para-choque dianteiro']],
                    'checklist' => ['estepe' => true, 'macaco' => true, 'documento' => true],
                ] : ['damages' => [], 'checklist' => []]),
                ...$extra,
            ]);
            foreach ($items as [$type, $desc, $qty, $price]) {
                $os->items()->create(['type' => $type, 'description' => $desc, 'quantity' => $qty, 'unit_price' => $price, 'approval' => $approved ? 'aprovado' : null]);
            }
            $os->logEvent($balcao, 'OS aberta');

            return $os;
        };

        $make($vehicles[0], OsStatus::Execucao, $carlos, 'Barulho na suspensão dianteira ao passar em lombada.', [
            ['peca', 'Bieleta dianteira (par)', 1, 180], ['servico', 'Troca de bieletas', 1, 120],
        ], ['approved_at' => now()->subHours(3)]);
        $make($vehicles[1], OsStatus::Diagnostico, $rafael, 'Luz de injeção acesa e motor falhando a frio.', []);
        // Mecânico terminou a revisão e enviou ao balcão: itens ainda sem preço
        $make($vehicles[2], OsStatus::Orcamento, $carlos, 'Revisão dos 60 mil km.', [
            ['peca', 'Óleo 5W30 sintético (L)', 4, 0], ['peca', 'Filtro de óleo', 1, 0], ['peca', 'Filtro de ar', 1, 0], ['servico', 'Revisão completa', 1, 0],
        ], [
            'service_type' => 'revisao',
            'diagnosis' => "Revisão feita. Pastilhas dianteiras com 30% — trocar na próxima.\nFiltro de ar muito sujo.",
            'revision' => ['oleo_motor' => 'trocar', 'filtro_oleo' => 'trocar', 'filtro_ar' => 'trocar', 'velas' => 'ok', 'pastilhas_diant' => 'atencao', 'bateria' => 'ok', 'calibragem' => 'ok'],
        ]);
        $make($vehicles[3], OsStatus::Aguardando, null, 'Cliente agendou pelo WhatsApp: troca de pastilhas e barulho ao frear.', [], ['scheduled_at' => today()->setTime(14, 0)]);
        // chegou e está esperando mecânico (check-in feito)
        $make($vehicles[5], OsStatus::Recebido, null, 'Revisão dos 110 mil km + alinhamento.', [], ['service_type' => 'revisao']);
        $make($vehicles[4], OsStatus::Pronto, $rafael, 'Troca de óleo.', [
            ['peca', 'Óleo 5W30 (L)', 3.5, 42], ['peca', 'Filtro de óleo', 1, 35], ['servico', 'Mão de obra troca de óleo', 1, 60],
        ], ['approved_at' => now()->subDay()]);
        $delivered = $make($vehicles[0], OsStatus::Entregue, $carlos, 'Troca de óleo e filtros.', [
            ['peca', 'Óleo 5W30 (L)', 4, 42], ['peca', 'Filtro de óleo', 1, 35], ['servico', 'Mão de obra', 1, 60],
        ], ['delivered_at' => now()->subDays(2), 'approved_at' => now()->subDays(3), 'km_in' => 80100]);

        $this->seedFinance($balcao, $delivered);

        $this->seedParts($balcao);

        // Agendamentos que chegaram sozinhos (bot do WhatsApp e site): já são OS "Agendado"
        OsIntake::create(['name' => 'Fernanda Rocha', 'phone' => '11977776666', 'plate' => 'BRA2E19', 'vehicle_model' => 'Renault Kwid', 'vehicle_year' => '2020', 'service_type' => 'defeito', 'complaint' => 'O carro está puxando para a direita e o volante treme acima de 80 km/h.', 'scheduled_at' => today()->addDays(2)->setTime(10, 0)], 'bot');
        OsIntake::create(['name' => 'Ricardo Lima', 'phone' => '11966665555', 'vehicle_model' => 'VW Polo', 'vehicle_year' => '2019', 'service_type' => 'outro', 'complaint' => 'Ar-condicionado parou de gelar. Gostaria de um orçamento.'], 'site');
    }

    private function seedParts(User $balcao): void
    {
        $abp = Supplier::create(['name' => 'Auto Peças Brasil', 'document' => '12345678000190', 'phone' => '1133334444', 'contact' => 'Marcos (vendas)']);
        $ff = Supplier::create(['name' => 'Distribuidora Freio Forte', 'phone' => '11922223333', 'contact' => 'Juliana']);

        // compras de exemplo (mês passado e este mês) para o histórico do fornecedor
        $buy = function (Supplier $s, string $nf, $date, array $items) use ($balcao) {
            $p = Purchase::create(['supplier_id' => $s->id, 'invoice' => $nf, 'date' => $date, 'total' => 0, 'created_by' => $balcao->id]);
            foreach ($items as [$desc, $qty, $cost]) {
                $p->items()->create(['description' => $desc, 'quantity' => $qty, 'unit_cost' => $cost]);
            }
            $p->update(['total' => collect($items)->sum(fn ($i) => $i[1] * $i[2])]);
        };
        $buy($abp, '45210', now()->subMonthNoOverflow()->startOfMonth()->addDays(12), [['Óleo 5W30 sintético (L)', 12, 28], ['Filtro de óleo', 4, 18]]);
        $buy($abp, '45871', now()->startOfMonth()->addDays(6), [['Óleo 5W30 sintético (L)', 20, 28], ['Filtro de óleo', 6, 18], ['Filtro de ar', 2, 26]]);
        $buy($ff, '9921', now()->startOfMonth()->addDays(3), [['Pastilha de freio dianteira (jogo)', 2, 85]]);
    }

    private function seedFinance(User $balcao, ServiceOrder $delivered): void
    {
        $socios = User::where('role', 'master')->orderBy('email')->get();
        $shares = [33.33, 33.33, 33.34];
        $partners = $socios->values()->map(fn ($u, $i) => Partner::create(['name' => $u->name, 'user_id' => $u->id, 'share' => $shares[$i] ?? 0]));

        // Aportes desiguais para mostrar o equilíbrio
        $mov = fn ($p, $type, $amount, $date, $desc) => PartnerMovement::create(['partner_id' => $p->id, 'type' => $type, 'amount' => $amount, 'date' => $date, 'description' => $desc]);
        $mov($partners[0], 'aporte', 5000, now()->subMonths(3)->startOfMonth(), 'Capital inicial');
        $mov($partners[1], 'aporte', 5000, now()->subMonths(3)->startOfMonth(), 'Capital inicial');
        $mov($partners[2], 'aporte', 5000, now()->subMonths(3)->startOfMonth(), 'Capital inicial');
        $mov($partners[0], 'aporte', 1000, now()->startOfMonth()->addDays(2), 'Compra de elevador (sinal)');
        $mov($partners[1], 'retirada', 300, now()->startOfMonth()->addDays(9), 'Adiantamento');

        $e = fn (array $a) => FinanceEntry::create(['created_by' => $balcao->id, ...$a]);

        // Últimos meses (para o histórico)
        foreach ([3, 2, 1] as $back) {
            $m = now()->subMonthsNoOverflow($back)->startOfMonth();
            $e(['type' => 'entrada', 'category' => 'servicos', 'description' => 'Serviços do mês (resumo)', 'amount' => [7200, 9850, 11400][3 - $back], 'due_date' => $m->copy()->addDays(27), 'paid_at' => $m->copy()->addDays(27), 'payment_method' => 'pix']);
            $e(['type' => 'saida', 'category' => 'aluguel', 'description' => 'Aluguel do galpão', 'party' => 'Imobiliária Centro', 'amount' => 2500, 'due_date' => $m->copy()->addDays(4), 'paid_at' => $m->copy()->addDays(4), 'payment_method' => 'boleto']);
            $e(['type' => 'saida', 'category' => 'autopecas', 'description' => 'Peças do mês', 'party' => 'Auto Peças Brasil', 'amount' => [3100, 4200, 4800][3 - $back], 'due_date' => $m->copy()->addDays(20), 'paid_at' => $m->copy()->addDays(20), 'payment_method' => 'boleto']);
            $e(['type' => 'saida', 'category' => 'energia_agua', 'description' => 'Energia elétrica', 'party' => 'Enel', 'amount' => 410, 'due_date' => $m->copy()->addDays(14), 'paid_at' => $m->copy()->addDays(14), 'payment_method' => 'pix']);
        }

        // Mês atual
        $m = now()->startOfMonth();
        $e(['type' => 'saida', 'category' => 'aluguel', 'description' => 'Aluguel do galpão', 'party' => 'Imobiliária Centro', 'amount' => 2500, 'due_date' => $m->copy()->addDays(4), 'paid_at' => $m->copy()->addDays(4), 'payment_method' => 'boleto']);
        $e(['type' => 'saida', 'category' => 'autopecas', 'description' => 'Filtros e óleo', 'party' => 'Auto Peças Brasil', 'amount' => 1240.5, 'due_date' => $m->copy()->addDays(8), 'paid_at' => $m->copy()->addDays(8), 'payment_method' => 'pix']);
        $e(['type' => 'saida', 'category' => 'impostos', 'description' => 'DAS Simples Nacional', 'amount' => 450, 'due_date' => today()->subDays(3)]);
        $e(['type' => 'saida', 'category' => 'energia_agua', 'description' => 'Energia elétrica', 'party' => 'Enel', 'amount' => 395.8, 'due_date' => today()->addDays(5)]);
        Installments::create(
            ['type' => 'saida', 'category' => 'ferramentas', 'description' => 'Scanner automotivo', 'party' => 'Ferramentas SP', 'payment_method' => 'boleto', 'created_by' => $balcao->id],
            1800, $m->copy()->addDays(9), 3, true,
        );
        $e(['type' => 'entrada', 'category' => 'servicos', 'description' => 'Serviços avulsos', 'amount' => 3650, 'due_date' => $m->copy()->addDays(10), 'paid_at' => $m->copy()->addDays(10), 'payment_method' => 'pix']);

        // Pagamento da OS entregue (cartão em 2x: 1ª recebida, 2ª a receber)
        Installments::create(
            ['type' => 'entrada', 'category' => 'servicos', 'description' => "OS {$delivered->number()} · {$delivered->vehicle->title()}", 'party' => $delivered->client->name, 'payment_method' => 'credito', 'service_order_id' => $delivered->id, 'created_by' => $balcao->id],
            $delivered->load('items')->total(), today()->subDays(2), 2, true, today()->subDays(2),
        );
    }
}
