<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Support\OsIntake;
use App\Support\Plate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Validator;

/**
 * Entrada do bot de WhatsApp (qualquer plataforma que faça uma "requisição HTTP":
 * Botconversa, Typebot, ManyChat, n8n, Z-API...).
 *
 * POST /api/bot/agendamento
 * Cabeçalho:  Authorization: Bearer <BOT_TOKEN do .env>
 * Corpo JSON: nome, telefone, carro, ano, placa, tipo (defeito|revisao|preventiva|outro), descricao, data_hora
 * Só funciona se BOT_TOKEN estiver configurado.
 */
class BotController extends Controller
{
    public function agendamento(Request $request): JsonResponse
    {
        $token = (string) config('oficina.bot_token');
        abort_if($token === '', 404);

        $sent = (string) ($request->bearerToken() ?? $request->header('X-Bot-Token'));
        if (! hash_equals($token, $sent)) {
            return response()->json(['ok' => false, 'erro' => 'Token inválido.'], 401);
        }

        $tipos = array_keys(ServiceOrder::SERVICE_TYPES);
        $v = Validator::make($request->all(), [
            'nome' => ['required', 'string', 'max:120'],
            'telefone' => ['required', 'string', 'max:20'],
            'carro' => ['nullable', 'string', 'max:120'],
            'ano' => ['nullable', 'string', 'max:9'],
            'placa' => ['nullable', 'string', 'max:10'],
            'tipo' => ['nullable', 'string', 'max:30'],
            'descricao' => ['required', 'string', 'max:3000'],
            'data_hora' => ['nullable', 'string', 'max:40'],
        ]);
        if ($v->fails()) {
            return response()->json(['ok' => false, 'erro' => $v->errors()->first()], 422);
        }
        $d = $v->validated();

        $phone = Plate::digits($d['telefone']);
        if (! $phone || strlen($phone) < 10) {
            return response()->json(['ok' => false, 'erro' => 'Telefone precisa ter DDD.'], 422);
        }

        // aceita "revisão", "Revisao", "preventiva"... e cai em "outro" se não reconhecer
        $tipo = Plate::normalize($d['tipo'] ?? '');
        $tipo = collect($tipos)->first(fn ($t) => str_starts_with(strtolower($tipo), substr($t, 0, 5))) ?? (! empty($d['tipo']) ? 'outro' : null);

        $os = OsIntake::create([
            'name' => $d['nome'],
            'phone' => $phone,
            'plate' => $d['placa'] ?? null,
            'vehicle_model' => $d['carro'] ?? null,
            'vehicle_year' => $d['ano'] ?? null,
            'service_type' => $tipo,
            'complaint' => $d['descricao'],
            'scheduled_at' => $this->parseDate($d['data_hora'] ?? null),
        ], 'bot');

        return response()->json([
            'ok' => true,
            'os' => $os->number(),
            'agendado_para' => $os->scheduled_at?->format('d/m/Y H:i'),
            'mensagem' => 'Agendamento registrado'.($os->scheduled_at ? ' para '.$os->scheduled_at->format('d/m \à\s H:i') : '').'. Te esperamos na Pista 1!',
        ], 201);
    }

    /** Aceita "2026-12-01 14:00", "01/12/2026 14:00" ou ISO. */
    private function parseDate(?string $v): ?Carbon
    {
        if (! $v) {
            return null;
        }
        foreach (['d/m/Y H:i', 'd/m/Y H\hi', 'd/m/Y', 'Y-m-d H:i', 'Y-m-d\TH:i'] as $f) {
            try {
                $d = Carbon::createFromFormat($f, trim($v));
                if ($d !== false) {
                    return $d;
                }
            } catch (\Throwable) {
            }
        }

        return rescue(fn () => Carbon::parse($v), null, false);
    }
}
