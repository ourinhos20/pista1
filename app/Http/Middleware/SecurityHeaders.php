<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

/**
 * Cabeçalhos de segurança em todas as respostas.
 * A política de conteúdo (CSP) só vale em produção, porque o servidor de
 * desenvolvimento do Vite precisa carregar scripts de outra porta.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $h = $response->headers;

        $h->set('X-Content-Type-Options', 'nosniff');
        $h->set('X-Frame-Options', 'SAMEORIGIN');
        $h->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $h->set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()');
        $h->set('Cross-Origin-Opener-Policy', 'same-origin');
        $h->remove('X-Powered-By');
        if (function_exists('header_remove')) {
            @header_remove('X-Powered-By');
        }

        // O sistema não deve aparecer no Google
        $panel = config('oficina.panel_path');
        if ($request->is($panel, $panel.'/*')) {
            $h->set('X-Robots-Tag', 'noindex, nofollow, noarchive');
            $h->set('Cache-Control', 'no-store, private');
        }

        if (app()->isProduction()) {
            if ($request->isSecure()) {
                $h->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            }
            $nonce = Vite::cspNonce();
            $h->set('Content-Security-Policy', implode('; ', [
                "default-src 'self'",
                "script-src 'self' 'nonce-{$nonce}'",
                "style-src 'self' 'unsafe-inline' https://fonts.bunny.net",
                "font-src 'self' data: https://fonts.bunny.net",
                "img-src 'self' data: blob:",
                "connect-src 'self'",
                "frame-ancestors 'self'",
                "form-action 'self'",
                "base-uri 'self'",
                "object-src 'none'",
            ]));
        }

        return $response;
    }
}
