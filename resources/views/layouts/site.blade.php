<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title') · {{ $shop['name'] }}</title>
    @hasSection('noindex')
        <meta name="robots" content="noindex, nofollow">
    @endif
    <meta name="theme-color" content="#0b0b0d">
    <link rel="icon" href="/images/pista1-icon.svg" type="image/svg+xml">
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700,800,900" rel="stylesheet">
    @vite('resources/css/site.css')
</head>
<body class="min-h-svh bg-zinc-100 font-sans text-zinc-900 antialiased">
    <header class="bg-ink text-white">
        <div class="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4">
            <a href="{{ route('site') }}" aria-label="{{ $shop['name'] }}">
                <img src="/images/pista1-logo.png" alt="{{ $shop['name'] }}" class="h-10 w-auto" width="125" height="50">
            </a>
            <span class="text-sm text-zinc-400">{{ $shop['phone'] }}</span>
        </div>
    </header>

    <main class="mx-auto max-w-3xl px-4 py-8">
        @yield('content')
    </main>

    <footer class="pb-10 text-center text-xs text-zinc-500">
        © {{ date('Y') }} {{ $shop['name'] }} · {{ $shop['instagram'] }}
    </footer>
</body>
</html>
