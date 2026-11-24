<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/** Uso: ->middleware('role:master,balcao') */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        // usuário desativado por um sócio cai fora na hora, mesmo já logado
        if ($user && ! $user->active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return to_route('login');
        }

        if (! $user || ! in_array($user->role, $roles, true)) {
            abort(403, 'Você não tem acesso a esta área.');
        }

        return $next($request);
    }
}
