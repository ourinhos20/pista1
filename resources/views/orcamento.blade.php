@extends('layouts.site')

@section('title', 'Orçamento OS '.$os->number())
@section('noindex', true)

@php
    $money = fn ($v) => 'R$ '.number_format((float) $v, 2, ',', '.');
    $plate = $os->vehicle?->plate;
    $plateFmt = $plate && preg_match('/^[A-Z]{3}\d{4}$/', $plate) ? substr($plate, 0, 3).'-'.substr($plate, 3) : $plate;
@endphp

@section('content')
    <p class="text-sm font-semibold tracking-wide text-brand-dark uppercase">Orçamento · OS {{ $os->number() }}</p>
    <h1 class="mt-1 text-3xl font-black tracking-tight">Olá, {{ $firstName }}!</h1>
    <p class="mt-2 text-zinc-600">
        Este é o orçamento do seu <b>{{ $os->vehicle?->title() }}</b>
        <span class="ml-1 inline-block rounded border-2 border-zinc-900 bg-white px-1.5 font-mono text-sm font-bold tracking-wider">{{ $plateFmt }}</span>
    </p>

    {{-- Situação --}}
    @if ($os->approved_at && in_array($os->status->value, ['execucao', 'pronto', 'entregue']))
        <div class="mt-6 rounded-lg border border-green-300 bg-green-50 p-5">
            <p class="text-lg font-bold text-green-800">✓ Orçamento aprovado</p>
            <p class="text-sm text-green-900">
                Aprovado em {{ $os->approved_at->format('d/m/Y \à\s H:i') }}@if ($os->approval_name) por {{ $os->approval_name }}@endif.
                @if ($os->status->value === 'pronto') <b>Seu carro está pronto para retirada.</b>
                @elseif ($os->status->value === 'entregue') Carro entregue. Obrigado pela confiança!
                @else Já estamos trabalhando no seu carro. @endif
            </p>
        </div>
    @elseif ($os->rejected_at && $os->status->value === 'orcamento')
        <div class="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-900">
            <p class="font-bold">Recebemos sua resposta.</p>
            <p class="text-sm">Você não aprovou este orçamento. Vamos entrar em contato para ajustar.</p>
        </div>
    @elseif (! $canDecide)
        <div class="mt-6 rounded-lg border border-zinc-300 bg-white p-5 text-zinc-700">
            <p class="font-bold">Seu orçamento ainda está sendo preparado.</p>
            <p class="text-sm">Avisaremos pelo WhatsApp quando estiver pronto.</p>
        </div>
    @endif

    @if (session('info'))
        <p class="mt-4 rounded-md bg-zinc-200 px-4 py-2 text-sm">{{ session('info') }}</p>
    @endif

    @if ($canDecide || $os->approved_at || $os->rejected_at)
        {{-- Itens --}}
        <section class="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <h2 class="border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-bold tracking-wide text-zinc-600 uppercase">Serviços e peças</h2>
            <ul class="divide-y divide-zinc-100">
                @foreach ($os->items as $item)
                    <li class="flex items-start justify-between gap-4 px-5 py-3">
                        <div>
                            <p class="font-semibold">{{ $item->description }}</p>
                            <p class="text-sm text-zinc-500">
                                {{ $item->type === 'peca' ? 'Peça' : 'Serviço' }}
                                @if ($item->quantity != 1) · {{ rtrim(rtrim(number_format($item->quantity, 2, ',', '.'), '0'), ',') }} × {{ $money($item->unit_price) }} @endif
                            </p>
                        </div>
                        <p class="shrink-0 font-semibold tabular-nums">{{ $money($item->total()) }}</p>
                    </li>
                @endforeach
            </ul>
            <div class="border-t border-zinc-200 bg-zinc-50 px-5 py-4">
                @if ($os->discount > 0)
                    <p class="flex justify-between text-sm text-zinc-600"><span>Subtotal</span><span class="tabular-nums">{{ $money($os->subtotal()) }}</span></p>
                    <p class="flex justify-between text-sm text-green-700"><span>Desconto</span><span class="tabular-nums">- {{ $money($os->discount) }}</span></p>
                @endif
                <p class="mt-1 flex items-baseline justify-between"><span class="font-bold">Total</span><span class="text-3xl font-black tabular-nums">{{ $money($os->total()) }}</span></p>
            </div>
        </section>

        @if ($os->diagnosis)
            <section class="mt-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 class="text-sm font-bold tracking-wide text-zinc-600 uppercase">O que encontramos</h2>
                <p class="mt-2 whitespace-pre-line text-zinc-800">{{ $os->diagnosis }}</p>
            </section>
        @endif

        @if ($os->attachments->isNotEmpty())
            <section class="mt-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 class="text-sm font-bold tracking-wide text-zinc-600 uppercase">Fotos</h2>
                <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    @foreach ($os->attachments as $a)
                        <a href="{{ route('orcamento.foto', [$token, $a->id]) }}" target="_blank" rel="noopener" class="block overflow-hidden rounded-md border border-zinc-200">
                            <img src="{{ route('orcamento.foto', [$token, $a->id, 'mini' => 1]) }}" alt="{{ $a->caption ?: 'Foto do serviço' }}" class="aspect-square w-full object-cover" loading="lazy">
                            @if ($a->caption)<p class="truncate px-2 py-1 text-xs text-zinc-600">{{ $a->caption }}</p>@endif
                        </a>
                    @endforeach
                </div>
            </section>
        @endif
    @endif

    @if ($canDecide)
        <section class="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5 shadow-sm">
            <h2 class="text-xl font-black">Sua decisão</h2>

            @if ($errors->any())
                <div class="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
                    @foreach ($errors->all() as $e)<p>{{ $e }}</p>@endforeach
                </div>
            @endif

            <form method="POST" action="{{ route('orcamento.decide', $token) }}" class="mt-4 grid gap-4">
                @csrf
                <label class="grid gap-1.5">
                    <span class="text-sm font-semibold">Seu nome completo *</span>
                    <input name="name" value="{{ old('name') }}" autocomplete="name" required maxlength="120" class="h-12 rounded-md border border-zinc-300 px-3 text-base focus:border-brand-dark focus:ring-2 focus:ring-brand/20 focus:outline-none">
                </label>
                <label class="grid gap-1.5">
                    <span class="text-sm font-semibold">Observação (opcional)</span>
                    <textarea name="note" rows="2" maxlength="500" placeholder="Ex.: pode fazer só os freios agora" class="rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-brand-dark focus:ring-2 focus:ring-brand/20 focus:outline-none">{{ old('note') }}</textarea>
                </label>
                <label class="flex items-start gap-3 text-sm">
                    <input type="checkbox" name="agree" value="1" class="mt-0.5 size-5 accent-[#d42a2a]">
                    <span>Li o orçamento acima e autorizo a execução dos serviços no valor de <b>{{ $money($os->total()) }}</b>. {{ $shop['terms'] }}</span>
                </label>
                <div class="grid gap-3 sm:grid-cols-[2fr_1fr]">
                    <button name="decision" value="aprovar" class="h-14 rounded-md bg-green-700 text-base font-bold text-white hover:bg-green-800">Aprovar orçamento</button>
                    <button name="decision" value="recusar" formnovalidate class="h-14 rounded-md border border-zinc-300 bg-white text-base font-semibold text-zinc-700 hover:bg-zinc-50">Não aprovar</button>
                </div>
                <p class="text-xs text-zinc-500">Dúvidas? Fale com a gente no WhatsApp {{ $shop['phone'] }}.</p>
            </form>
        </section>
    @endif
@endsection
