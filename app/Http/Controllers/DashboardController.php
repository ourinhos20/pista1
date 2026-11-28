<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Tela inicial. Mecânico vai para a agenda; balcão e sócios para as ordens de serviço
     * (com os agendados de hoje no topo). Faturamento fica só no Financeiro.
     */
    public function __invoke(Request $request)
    {
        return $request->user()->isMechanic() ? to_route('mecanico.index') : to_route('os.index');
    }
}
