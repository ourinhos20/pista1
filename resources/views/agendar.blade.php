@extends('layouts.site')

@section('title', 'Agendar atendimento')

@section('content')
    @if (! empty($done))
        <div class="rounded-lg border border-green-300 bg-white p-8 text-center shadow-sm">
            <p class="mx-auto grid size-14 place-items-center rounded-full bg-green-100 text-3xl text-green-700">✓</p>
            <h1 class="mt-4 text-2xl font-black tracking-tight">Pedido recebido!</h1>
            <p class="mt-2 text-zinc-600">Vamos confirmar o horário pelo WhatsApp em breve.</p>
            <a href="{{ route('site') }}" class="mt-6 inline-flex h-12 items-center rounded-md bg-ink px-6 font-semibold text-white">Voltar ao site</a>
        </div>
    @else
        <h1 class="text-3xl font-black tracking-tight">Agendar atendimento</h1>
        <p class="mt-2 text-zinc-600">Conte o que está acontecendo com o carro. Se puder, mande fotos. A gente confirma o horário pelo WhatsApp.</p>

        @if ($errors->any())
            <div class="mt-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800" role="alert">
                <p class="font-bold">Confira os campos:</p>
                <ul class="mt-1 list-disc pl-5">
                    @foreach ($errors->all() as $e)
                        <li>{{ $e }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        <form id="agendar" method="POST" action="{{ route('agendar.submit') }}" enctype="multipart/form-data" class="mt-6 grid gap-5 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm md:p-7">
            @csrf
            <input type="hidden" name="_t" value="{{ $stamp }}">
            {{-- campo invisível: só robôs preenchem --}}
            <div class="absolute -left-[9999px]" aria-hidden="true">
                <label>Site <input type="text" name="website" tabindex="-1" autocomplete="off"></label>
            </div>

            <div class="grid gap-5 sm:grid-cols-2">
                <label class="grid gap-1.5">
                    <span class="text-sm font-semibold">Seu nome *</span>
                    <input name="name" value="{{ old('name') }}" required maxlength="120" autocomplete="name" class="h-12 rounded-md border border-zinc-300 px-3 text-base focus:border-brand-dark focus:ring-2 focus:ring-brand/20 focus:outline-none">
                </label>
                <label class="grid gap-1.5">
                    <span class="text-sm font-semibold">WhatsApp com DDD *</span>
                    <input name="phone" value="{{ old('phone') }}" required inputmode="tel" autocomplete="tel" placeholder="(11) 90000-0000" class="h-12 rounded-md border border-zinc-300 px-3 text-base focus:border-brand-dark focus:ring-2 focus:ring-brand/20 focus:outline-none">
                </label>
                <label class="grid gap-1.5">
                    <span class="text-sm font-semibold">Placa</span>
                    <input name="plate" value="{{ old('plate') }}" maxlength="8" placeholder="ABC1D23" class="h-12 rounded-md border border-zinc-300 px-3 font-mono text-base tracking-widest uppercase focus:border-brand-dark focus:ring-2 focus:ring-brand/20 focus:outline-none">
                </label>
                <div class="grid grid-cols-[1fr_96px] gap-2">
                    <label class="grid gap-1.5">
                        <span class="text-sm font-semibold">Carro (marca e modelo)</span>
                        <input name="vehicle" value="{{ old('vehicle') }}" maxlength="120" placeholder="Ex.: Fiat Strada" class="h-12 rounded-md border border-zinc-300 px-3 text-base focus:border-brand-dark focus:ring-2 focus:ring-brand/20 focus:outline-none">
                    </label>
                    <label class="grid gap-1.5">
                        <span class="text-sm font-semibold">Ano</span>
                        <input name="year" value="{{ old('year') }}" maxlength="9" inputmode="numeric" placeholder="2021" class="h-12 rounded-md border border-zinc-300 px-3 text-base focus:border-brand-dark focus:ring-2 focus:ring-brand/20 focus:outline-none">
                    </label>
                </div>
            </div>

            @if (! empty($types))
                <fieldset class="grid gap-1.5">
                    <legend class="mb-1.5 text-sm font-semibold">O que você precisa?</legend>
                    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        @foreach ($types as $key => $label)
                            <label class="flex h-12 cursor-pointer items-center justify-center rounded-md border border-zinc-300 px-2 text-center text-sm font-semibold has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white">
                                <input type="radio" name="service_type" value="{{ $key }}" class="sr-only" @checked(old('service_type', 'defeito') === $key)>
                                {{ $label }}
                            </label>
                        @endforeach
                    </div>
                </fieldset>
            @endif

            <label class="grid gap-1.5">
                <span class="text-sm font-semibold">O que está acontecendo? *</span>
                <textarea name="complaint" required rows="5" maxlength="3000" placeholder="Ex.: barulho na roda dianteira quando freio; luz da injeção acesa; quero fazer a revisão dos 60 mil km…" class="rounded-md border border-zinc-300 px-3 py-2.5 text-base focus:border-brand-dark focus:ring-2 focus:ring-brand/20 focus:outline-none">{{ old('complaint') }}</textarea>
            </label>

            <label class="grid gap-1.5 sm:w-1/2">
                <span class="text-sm font-semibold">Melhor dia e horário (opcional)</span>
                <input type="datetime-local" name="preferred_at" value="{{ old('preferred_at') }}" class="h-12 rounded-md border border-zinc-300 px-3 text-base focus:border-brand-dark focus:ring-2 focus:ring-brand/20 focus:outline-none">
            </label>

            <label class="grid gap-1.5">
                <span class="text-sm font-semibold">Fotos (opcional, até 4)</span>
                <input id="fotos" type="file" name="photos[]" accept="image/*" multiple class="block w-full text-sm file:mr-3 file:h-11 file:rounded-md file:border-0 file:bg-zinc-900 file:px-4 file:font-semibold file:text-white">
                <span id="fotos-info" class="text-xs text-zinc-500">Painel com luz acesa, peça com vazamento, barulho (foto do local)…</span>
            </label>

            <label class="flex items-start gap-3 text-sm text-zinc-700">
                <input type="checkbox" name="consent" value="1" required class="mt-0.5 size-5 accent-[#d42a2a]" @checked(old('consent'))>
                <span>Autorizo a {{ $shop['name'] }} a usar estes dados para entrar em contato comigo sobre este atendimento.</span>
            </label>

            <button id="enviar" type="submit" class="h-14 rounded-md bg-brand-dark text-base font-bold text-white hover:bg-brand disabled:opacity-60">Enviar pedido</button>
        </form>

        {{-- Reduz as fotos no próprio celular antes de enviar (envio mais rápido, gasta menos internet) --}}
        <script nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}">
            (() => {
                const input = document.getElementById('fotos');
                const info = document.getElementById('fotos-info');
                const form = document.getElementById('agendar');
                const btn = document.getElementById('enviar');
                const shrink = (file) => new Promise((resolve) => {
                    if (!file.type.startsWith('image/')) return resolve(file);
                    const img = new Image();
                    img.onload = () => {
                        const s = Math.min(1, 1600 / Math.max(img.width, img.height));
                        const c = document.createElement('canvas');
                        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
                        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                        c.toBlob((b) => resolve(b ? new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', 0.85);
                        URL.revokeObjectURL(img.src);
                    };
                    img.onerror = () => resolve(file);
                    img.src = URL.createObjectURL(file);
                });
                input.addEventListener('change', async () => {
                    let files = [...input.files].slice(0, 4);
                    btn.disabled = true; info.textContent = 'Preparando fotos…';
                    try {
                        const out = await Promise.all(files.map(shrink));
                        const dt = new DataTransfer(); out.forEach((f) => dt.items.add(f)); input.files = dt.files;
                        info.textContent = out.length + (out.length === 1 ? ' foto pronta' : ' fotos prontas') + ' para envio.';
                    } catch (e) { info.textContent = files.length + ' foto(s) selecionada(s).'; }
                    btn.disabled = false;
                });
                form.addEventListener('submit', () => { btn.disabled = true; btn.textContent = 'Enviando…'; });
            })();
        </script>
    @endif
@endsection
