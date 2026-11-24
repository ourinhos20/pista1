<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $shop['name'] }} · Mecânica automotiva em {{ $shop['city'] }}</title>
    <meta name="description" content="Revisão, freios, suspensão, injeção eletrônica, troca de óleo e elétrica. Orçamento antes de qualquer serviço e garantia de 90 dias. Agende pelo WhatsApp {{ $shop['phone'] }}.">
    <meta name="theme-color" content="#0b0b0d">
    <link rel="icon" href="/images/pista1-icon.svg" type="image/svg+xml">
    <link rel="canonical" href="{{ url('/') }}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{{ $shop['name'] }}">
    <meta property="og:description" content="Mecânica automotiva com orçamento aprovado por você e garantia de 90 dias.">
    <meta property="og:image" content="{{ url('/images/pista1-banner.jpg') }}">
    <meta property="og:url" content="{{ url('/') }}">
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700,800,900" rel="stylesheet">
    @vite('resources/css/site.css')
    <script type="application/ld+json" nonce="{{ \Illuminate\Support\Facades\Vite::cspNonce() }}">{!! $jsonLd !!}</script>
</head>
<body class="bg-white font-sans text-zinc-900 antialiased">

    {{-- Topo --}}
    <header class="sticky top-0 z-40 border-b border-white/10 bg-ink/95 text-white backdrop-blur">
        <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
            <a href="#inicio" class="shrink-0" aria-label="{{ $shop['name'] }}">
                <img src="/images/pista1-logo.png" alt="{{ $shop['name'] }}" class="h-10 w-auto" width="125" height="50">
            </a>
            <nav class="hidden items-center gap-7 text-sm font-medium text-zinc-300 md:flex" aria-label="Seções">
                <a href="#servicos" class="hover:text-white">Serviços</a>
                <a href="#como-funciona" class="hover:text-white">Como funciona</a>
                <a href="#contato" class="hover:text-white">Contato</a>
            </nav>
            <a href="{{ $wa }}" target="_blank" rel="noopener" class="inline-flex h-10 items-center gap-2 rounded-md bg-brand-dark px-4 text-sm font-semibold text-white hover:bg-brand">
                <svg viewBox="0 0 24 24" class="size-4 fill-current" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.7-.1 1.3Z"/></svg>
                <span class="hidden sm:inline">Agendar pelo</span> WhatsApp
            </a>
        </div>
    </header>

    <main id="inicio">
        {{-- Destaque --}}
        <section class="relative overflow-hidden bg-ink text-white">
            <div class="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_70%_40%,rgba(238,60,58,0.22),transparent_60%)] md:block" aria-hidden="true"></div>
            <div class="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.1fr_1fr] md:items-center md:py-24">
                <div>
                    <p class="mb-4 inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-brand uppercase">
                        <span class="h-0.5 w-8 bg-brand"></span> Mecânica automotiva
                    </p>
                    <h1 class="text-4xl leading-[1.05] font-black tracking-tight md:text-6xl">
                        Seu carro em boas mãos, <span class="text-brand">do diagnóstico à entrega.</span>
                    </h1>
                    <p class="mt-6 max-w-xl text-lg text-zinc-300">
                        Revisão, freios, suspensão, injeção eletrônica e elétrica. Você aprova o orçamento antes de qualquer serviço e sai com garantia de 90 dias.
                    </p>
                    <div class="mt-8 flex flex-col gap-3 sm:flex-row">
                        <a href="{{ $wa }}" target="_blank" rel="noopener" class="inline-flex h-14 items-center justify-center rounded-md bg-brand-dark px-7 text-base font-bold text-white hover:bg-brand">
                            Agendar pelo WhatsApp
                        </a>
                        <a href="#servicos" class="inline-flex h-14 items-center justify-center rounded-md border border-white/25 px-7 text-base font-semibold text-white hover:bg-white/10">
                            Ver serviços
                        </a>
                    </div>
                    <p class="mt-6 text-sm text-zinc-400">{{ $shop['phone'] }} · {{ $shop['instagram'] }}</p>
                </div>
                <div class="hidden md:block">
                    <img src="/images/pista1-logo.png" alt="" class="mx-auto w-full max-w-md opacity-95" width="1250" height="500">
                </div>
            </div>
        </section>

        {{-- Diferenciais --}}
        <section class="border-b border-zinc-200 bg-zinc-50">
            <div class="mx-auto grid max-w-6xl grid-cols-2 px-4 md:grid-cols-4">
                @foreach ($perks as [$big, $text])
                    <div class="border-zinc-200 py-7 pr-4 md:border-r md:px-6 md:last:border-r-0 md:first:pl-0">
                        <p class="text-2xl font-black tracking-tight break-words text-ink sm:text-3xl">{{ $big }}</p>
                        <p class="mt-1 text-sm text-zinc-600">{{ $text }}</p>
                    </div>
                @endforeach
            </div>
        </section>

        {{-- Serviços --}}
        <section id="servicos" class="scroll-mt-16 py-16 md:py-24">
            <div class="mx-auto max-w-6xl px-4">
                <p class="text-sm font-semibold tracking-wide text-brand-dark uppercase">Serviços</p>
                <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">O que fazemos pelo seu carro</h2>
                <div class="mt-10 grid gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4">
                    @foreach ($services as $i => [$title, $text])
                        <article class="bg-white p-6">
                            <span class="text-sm font-black text-brand-dark tabular-nums">{{ str_pad($i + 1, 2, '0', STR_PAD_LEFT) }}</span>
                            <h3 class="mt-3 text-lg font-bold">{{ $title }}</h3>
                            <p class="mt-2 text-[15px] leading-relaxed text-zinc-600">{{ $text }}</p>
                        </article>
                    @endforeach
                </div>
            </div>
        </section>

        {{-- Como funciona --}}
        <section id="como-funciona" class="scroll-mt-16 bg-ink py-16 text-white md:py-24">
            <div class="mx-auto max-w-6xl px-4">
                <p class="text-sm font-semibold tracking-wide text-brand uppercase">Como funciona</p>
                <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">Transparência em cada etapa</h2>
                <ol class="mt-10 grid gap-8 md:grid-cols-4">
                    @foreach ($steps as $i => [$title, $text])
                        <li class="border-t-2 border-brand pt-5">
                            <span class="text-sm font-bold text-zinc-400">Passo {{ $i + 1 }}</span>
                            <h3 class="mt-1 text-lg font-bold">{{ $title }}</h3>
                            <p class="mt-2 text-[15px] leading-relaxed text-zinc-400">{{ $text }}</p>
                        </li>
                    @endforeach
                </ol>
            </div>
        </section>

        {{-- Contato --}}
        <section id="contato" class="scroll-mt-16 py-16 md:py-24">
            <div class="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:items-center">
                <div>
                    <p class="text-sm font-semibold tracking-wide text-brand-dark uppercase">Contato</p>
                    <h2 class="mt-2 text-3xl font-black tracking-tight md:text-4xl">Agende uma avaliação</h2>
                    <p class="mt-4 max-w-md text-lg text-zinc-600">Mande uma mensagem contando o que está acontecendo. Respondemos com o melhor horário para você.</p>
                    <a href="{{ $wa }}" target="_blank" rel="noopener" class="mt-8 inline-flex h-14 items-center justify-center rounded-md bg-brand-dark px-7 text-base font-bold text-white hover:bg-brand">
                        Chamar no WhatsApp
                    </a>
                </div>
                <dl class="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
                    <div class="flex flex-col gap-1 p-5 sm:flex-row sm:justify-between">
                        <dt class="text-sm font-semibold text-zinc-500">WhatsApp</dt>
                        <dd class="text-lg font-bold"><a href="{{ $wa }}" target="_blank" rel="noopener" class="hover:text-brand-dark">{{ $shop['phone'] }}</a></dd>
                    </div>
                    <div class="flex flex-col gap-1 p-5 sm:flex-row sm:justify-between">
                        <dt class="text-sm font-semibold text-zinc-500">Instagram</dt>
                        <dd class="text-lg font-bold"><a href="{{ $instagramUrl }}" target="_blank" rel="noopener" class="hover:text-brand-dark">{{ $shop['instagram'] }}</a></dd>
                    </div>
                    <div class="flex flex-col gap-1 p-5 sm:flex-row sm:justify-between">
                        <dt class="text-sm font-semibold text-zinc-500">Horário</dt>
                        <dd class="text-right font-semibold sm:max-w-xs">{{ $shop['hours'] }}</dd>
                    </div>
                    <div class="flex flex-col gap-1 p-5 sm:flex-row sm:justify-between">
                        <dt class="text-sm font-semibold text-zinc-500">Endereço</dt>
                        <dd class="font-semibold sm:max-w-xs sm:text-right">
                            {{ $shop['address'] ?: $shop['city'] }}
                            @if ($mapsUrl)
                                <a href="{{ $mapsUrl }}" target="_blank" rel="noopener" class="mt-1 block text-sm text-brand-dark hover:underline">Como chegar →</a>
                            @endif
                        </dd>
                    </div>
                </dl>
            </div>
        </section>
    </main>

    <footer class="bg-ink py-10 text-sm text-zinc-400">
        <div class="mx-auto flex max-w-6xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between">
            <img src="/images/pista1-logo.png" alt="{{ $shop['name'] }}" class="h-9 w-auto" width="113" height="45" loading="lazy">
            <p>
                © {{ date('Y') }} {{ $shop['name'] }}
                @if ($shop['document']) · CNPJ {{ $shop['document'] }} @endif
            </p>
        </div>
    </footer>

    {{-- Botão flutuante no celular --}}
    <a href="{{ $wa }}" target="_blank" rel="noopener" aria-label="Chamar no WhatsApp"
       class="fixed right-4 bottom-4 z-50 grid size-14 place-items-center rounded-full bg-[#25d366] text-white shadow-lg md:hidden">
        <svg viewBox="0 0 24 24" class="size-7 fill-current" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.7-.1 1.3Z"/></svg>
    </a>
</body>
</html>
