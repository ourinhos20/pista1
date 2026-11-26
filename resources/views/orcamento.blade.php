@extends('layouts.site')

@section('title', 'Orçamento OS '.$os->number())
@section('noindex', true)

@php
    $money = fn ($v) => 'R$ '.number_format((float) $v, 2, ',', '.');
    $plate = $os->vehicle?->plate;
    $plateFmt = $plate && preg_match('/^[A-Z]{3}\d{4}$/', $plate) ? substr($plate, 0, 3).'-'.substr($plate, 3) : $plate;
    $st = $os->status->value;
    $approvedTotal = $os->items->where('approval', 'aprovado')->sum(fn ($i) => $i->total());
    $showItems = $canDecide || $os->approved_at || $os->rejected_at;
@endphp

@section('content')
    <p class="text-sm font-semibold tracking-wide text-brand-dark uppercase">{{ $isComplement ? 'Orçamento complementar' : 'Orçamento' }} · OS {{ $os->number() }}</p>
    <h1 class="mt-1 text-3xl font-black tracking-tight">Olá, {{ $firstName }}!</h1>
    <p class="mt-2 text-zinc-600">
        {{ $isComplement ? 'Durante o serviço no seu' : 'Este é o orçamento do seu' }} <b>{{ $os->vehicle?->title() }}</b>
        @if ($plateFmt)<span class="ml-1 inline-block rounded border-2 border-zinc-900 bg-white px-1.5 font-mono text-sm font-bold tracking-wider">{{ $plateFmt }}</span>@endif
        {{ $isComplement ? 'encontramos mais um item que precisa da sua aprovação. O que você já aprovou continua sendo feito normalmente.' : '' }}
    </p>

    {{-- Situação --}}
    @if (! $canDecide)
        @if ($os->approved_at && in_array($st, ['pecas', 'execucao', 'pronto', 'entregue']))
            <div class="mt-6 rounded-lg border border-green-300 bg-green-50 p-5">
                <p class="text-lg font-bold text-green-800">✓ Orçamento aprovado</p>
                <p class="text-sm text-green-900">
                    Aprovado em {{ $os->approved_at->format('d/m/Y \à\s H:i') }}@if ($os->approval_name) por {{ $os->approval_name }}@endif.
                    @if ($st === 'pronto') <b>Seu carro está pronto para retirada.</b>
                    @elseif ($st === 'entregue') Carro entregue. Obrigado pela confiança!
                    @elseif ($st === 'pecas') Estamos aguardando a chegada das peças.
                    @else Já estamos trabalhando no seu carro. @endif
                </p>
            </div>
        @elseif ($os->rejected_at && $st === 'orcamento')
            <div class="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-900">
                <p class="font-bold">Recebemos sua resposta.</p>
                <p class="text-sm">Você não aprovou os itens do orçamento. Vamos entrar em contato.</p>
            </div>
        @else
            <div class="mt-6 rounded-lg border border-zinc-300 bg-white p-5 text-zinc-700">
                <p class="font-bold">Seu orçamento ainda está sendo preparado.</p>
                <p class="text-sm">Avisaremos pelo WhatsApp quando estiver pronto.</p>
            </div>
        @endif
    @endif

    @if (session('info'))
        <p class="mt-4 rounded-md bg-zinc-200 px-4 py-2 text-sm">{{ session('info') }}</p>
    @endif

    @if ($errors->any())
        <div class="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
            @foreach ($errors->all() as $e)<p>{{ $e }}</p>@endforeach
        </div>
    @endif

    @if ($showItems)
        <form id="decidir" method="POST" action="{{ route('orcamento.decide', $token) }}">
            @csrf
            {{-- Itens --}}
            <section class="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                <h2 class="border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-bold tracking-wide text-zinc-600 uppercase">
                    Serviços e peças
                    @if ($canDecide)<span class="block text-xs font-normal normal-case">Desmarque o que você não quer fazer agora.</span>@endif
                </h2>
                <ul class="divide-y divide-zinc-100">
                    @foreach ($os->items as $item)
                        @php $can = in_array($item->id, $decidable, true); @endphp
                        @if (! $can && $item->approval === null && $item->unit_price <= 0) @continue @endif
                        <li class="flex items-start gap-3 px-5 py-3 {{ $item->approval === 'recusado' ? 'opacity-60' : '' }}">
                            @if ($can)
                                <input type="checkbox" name="items[]" value="{{ $item->id }}" data-valor="{{ $item->total() }}" checked class="item mt-1 size-6 shrink-0 accent-[#15803d]" aria-label="Aprovar {{ $item->description }}">
                            @endif
                            <div class="min-w-0 flex-1">
                                <p class="font-semibold {{ $item->approval === 'recusado' ? 'line-through' : '' }}">{{ $item->description }}</p>
                                <p class="text-sm text-zinc-500">
                                    {{ $item->type === 'peca' ? 'Peça' : 'Serviço' }}
                                    @if ($item->quantity != 1) · {{ rtrim(rtrim(number_format($item->quantity, 2, ',', '.'), '0'), ',') }} × {{ $money($item->unit_price) }} @endif
                                    @if ($item->extra) · <b class="text-amber-700">item novo</b> @endif
                                    @if ($item->approval === 'aprovado') · <b class="text-green-700">aprovado</b> @endif
                                    @if ($item->approval === 'recusado') · <b class="text-zinc-600">não aprovado</b> @endif
                                </p>
                            </div>
                            <p class="shrink-0 font-semibold tabular-nums">{{ $money($item->total()) }}</p>
                        </li>
                    @endforeach
                </ul>
                <div class="border-t border-zinc-200 bg-zinc-50 px-5 py-4">
                    @if ($canDecide)
                        @if ($isComplement)
                            <p class="flex justify-between text-sm text-zinc-600"><span>Já aprovado antes</span><span class="tabular-nums">{{ $money($approvedTotal) }}</span></p>
                        @endif
                        <p class="mt-1 flex items-baseline justify-between"><span class="font-bold">{{ $isComplement ? 'Itens novos marcados' : 'Total dos itens marcados' }}</span><span id="total" class="text-3xl font-black tabular-nums">—</span></p>
                        @if ($os->discount > 0 && ! $isComplement)<p class="text-right text-sm text-green-700">desconto de {{ $money($os->discount) }} aplicado no total</p>@endif
                    @else
                        @if ($os->discount > 0)
                            <p class="flex justify-between text-sm text-green-700"><span>Desconto</span><span class="tabular-nums">- {{ $money($os->discount) }}</span></p>
                        @endif
                        <p class="mt-1 flex items-baseline justify-between"><span class="font-bold">Total</span><span class="text-3xl font-black tabular-nums">{{ $money($os->total()) }}</span></p>
                    @endif
                </div>
            </section>

            @if ($os->diagnosis && ! $isComplement)
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

            @if ($canDecide)
                <section class="mt-6 rounded-lg border-2 border-zinc-900 bg-white p-5 shadow-sm">
                    <h2 class="text-xl font-black">Sua decisão</h2>
                    <div class="mt-4 grid gap-4">
                        <label class="grid gap-1.5">
                            <span class="text-sm font-semibold">Seu nome completo *</span>
                            <input name="name" value="{{ old('name') }}" autocomplete="name" required maxlength="120" class="h-12 rounded-md border border-zinc-300 px-3 text-base focus:border-brand-dark focus:ring-2 focus:ring-brand/20 focus:outline-none">
                        </label>
                        <label class="grid gap-1.5">
                            <span class="text-sm font-semibold">Observação</span>
                            <textarea name="note" rows="2" maxlength="500" class="rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-brand-dark focus:ring-2 focus:ring-brand/20 focus:outline-none">{{ old('note') }}</textarea>
                        </label>
                        <label class="flex items-start gap-3 text-sm">
                            <input type="checkbox" name="agree" value="1" class="mt-0.5 size-5 accent-[#d42a2a]">
                            <span>Li e autorizo a execução <b>dos itens marcados</b> acima. {{ $shop['terms'] }}</span>
                        </label>
                        <div class="grid gap-3 sm:grid-cols-[2fr_1fr]">
                            <button id="aprovar" name="decision" value="aprovar" class="h-14 rounded-md bg-green-700 text-base font-bold text-white hover:bg-green-800">Aprovar itens marcados</button>
                            <button name="decision" value="recusar" formnovalidate class="h-14 rounded-md border border-zinc-300 bg-white text-base font-semibold text-zinc-700 hover:bg-zinc-50">Não aprovar nada</button>
                        </div>
                        <p class="text-xs text-zinc-500">Dúvidas? Fale com a gente no WhatsApp {{ $shop['phone'] }}.</p>
                    </div>
                </section>
            @endif
        </form>

        @if ($canDecide)
            {{-- soma na hora o que o cliente deixou marcado --}}
            <script nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}">
                (() => {
                    const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
                    const boxes = [...document.querySelectorAll('input.item')];
                    const total = document.getElementById('total');
                    const btn = document.getElementById('aprovar');
                    const update = () => {
                        const marked = boxes.filter((b) => b.checked);
                        total.textContent = fmt.format(marked.reduce((s, b) => s + Number(b.dataset.valor), 0));
                        btn.disabled = marked.length === 0;
                        btn.classList.toggle('opacity-50', marked.length === 0);
                    };
                    boxes.forEach((b) => b.addEventListener('change', update));
                    update();
                })();
            </script>
        @endif
    @endif
@endsection
