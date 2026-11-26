<?php

namespace App\Support;

use App\Enums\OsStatus;
use App\Models\Client;
use App\Models\ServiceOrder;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Support\Facades\DB;

/**
 * Entrada única de OS: balcão, site e bot usam a mesma regra.
 * Dados básicos: nome, telefone, carro/ano, placa (opcional), tipo e o que o cliente relatou.
 * O resto (CPF, endereço, vistoria...) é completado depois, sem travar nada.
 */
class OsIntake
{
    /**
     * @param  array{name?: string, phone?: string, client_id?: int|null, vehicle_id?: int|null, plate?: string|null,
     *     vehicle_model?: string|null, vehicle_year?: string|null, vehicle_brand?: string|null, vehicle_color?: string|null,
     *     vehicle_chassis?: string|null, service_type?: string|null,
     *     complaint?: string|null, scheduled_at?: string|null, mechanic_id?: int|null, arrived?: bool}  $d
     */
    public static function create(array $d, string $origin, ?User $user = null): ServiceOrder
    {
        return DB::transaction(function () use ($d, $origin, $user) {
            $phone = Plate::digits($d['phone'] ?? null);
            $plate = Plate::normalize($d['plate'] ?? '') ?: null;

            // 1) carro pela placa  2) carro escolhido  3) cliente pelo id ou telefone
            $vehicle = $plate ? Vehicle::where('plate', $plate)->first() : null;
            $vehicle ??= ! empty($d['vehicle_id']) ? Vehicle::find($d['vehicle_id']) : null;

            $client = $vehicle?->client
                ?? (! empty($d['client_id']) ? Client::find($d['client_id']) : null)
                ?? ($phone ? Client::where('phone', $phone)->first() : null);

            if (! $client) {
                $client = Client::create(['name' => trim($d['name'] ?? 'Cliente'), 'phone' => $phone]);
            } elseif ($phone && ! $client->phone) {
                $client->update(['phone' => $phone]);
            }

            if (! $vehicle) {
                // cliente conhecido sem placa informada: reaproveita o carro de mesmo modelo ainda sem placa
                $model = trim((string) ($d['vehicle_model'] ?? ''));
                if (! $plate && $model !== '') {
                    $vehicle = $client->vehicles()->whereNull('plate')->where('model', $model)->first();
                }
                $vehicle ??= Vehicle::create([
                    'client_id' => $client->id,
                    'plate' => $plate,
                    'brand' => $d['vehicle_brand'] ?? null,
                    'model' => $model ?: null,
                    'year' => $d['vehicle_year'] ?? null,
                    'color' => $d['vehicle_color'] ?? null,
                    'chassis' => $d['vehicle_chassis'] ?? null,
                ]);
            }

            $arrived = ! empty($d['arrived']);
            $os = ServiceOrder::create([
                'client_id' => $client->id,
                'vehicle_id' => $vehicle->id,
                'mechanic_id' => $d['mechanic_id'] ?? null,
                'created_by' => $user?->id,
                'status' => $arrived ? OsStatus::Recebido : OsStatus::Aguardando,
                'origin' => $origin,
                'service_type' => $d['service_type'] ?? null,
                'scheduled_at' => $d['scheduled_at'] ?? null,
                'complaint' => $d['complaint'] ?? null,
                'checked_in_at' => $arrived ? now() : null,
                'damages' => [],
                'checklist' => [],
            ]);

            $via = ['balcao' => 'pelo balcão', 'site' => 'pelo site', 'bot' => 'pelo bot do WhatsApp'][$origin] ?? '';
            $os->logEvent($user, trim("OS aberta {$via}").($arrived ? ' · cliente já na oficina' : ''));

            return $os;
        });
    }

    /**
     * Completa/corrige o cadastro do cliente e do carro a partir da OS (balcão ou master, a qualquer momento).
     * Se a placa digitada já existir em outro carro, a OS passa a usar aquele carro (sem duplicar).
     */
    public static function updateCadastro(ServiceOrder $os, array $client, array $vehicle): void
    {
        DB::transaction(function () use ($os, $client, $vehicle) {
            $os->loadMissing(['client', 'vehicle']);

            if ($client) {
                foreach (['document', 'phone'] as $k) {
                    if (array_key_exists($k, $client)) {
                        $client[$k] = Plate::digits($client[$k]);
                    }
                }
                $os->client->update($client);
            }

            if (! $vehicle) {
                return;
            }

            $current = $os->vehicle;
            $plate = array_key_exists('plate', $vehicle) ? (Plate::normalize($vehicle['plate'] ?? '') ?: null) : $current->plate;
            $fields = collect($vehicle)->except('plate')->filter(fn ($v) => $v !== null && $v !== '')->all();

            $other = $plate ? Vehicle::where('plate', $plate)->where('id', '!=', $current->id)->first() : null;
            if ($other) {
                // carro já cadastrado com essa placa: a OS passa para ele e o provisório some (se não tiver outra OS)
                $other->update($fields);
                $os->update(['vehicle_id' => $other->id]);
                if (! $current->plate && $current->serviceOrders()->count() === 0) {
                    $current->delete();
                }
                $os->logEvent(auth()->user(), "Carro vinculado ao cadastro já existente da placa {$plate}");
            } else {
                $current->update([...$fields, 'plate' => $plate]);
            }
        });
    }
}
