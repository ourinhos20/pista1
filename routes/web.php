<?php

use App\Http\Controllers\ClientController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\MechanicController;
use App\Http\Controllers\OsPaymentController;
use App\Http\Controllers\PartnerController;
use App\Http\Controllers\ServiceOrderController;
use App\Http\Controllers\ServiceOrderItemController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VehicleController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('home');

Route::middleware(['auth', 'role:master,balcao,mecanico'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Todos os perfis (o servidor esconde dados sensíveis do mecânico)
    Route::get('mecanico', [MechanicController::class, 'index'])->name('mecanico.index');
    Route::get('buscar-placa', [VehicleController::class, 'lookup'])->name('veiculos.lookup');
    Route::get('veiculos/{vehicle}', [VehicleController::class, 'show'])->name('veiculos.show');
    Route::get('os/{os}', [ServiceOrderController::class, 'show'])->name('os.show')->whereNumber('os');
    Route::patch('os/{os}/status', [ServiceOrderController::class, 'status'])->name('os.status');
    Route::patch('os/{os}/diagnostico', [ServiceOrderController::class, 'diagnosis'])->name('os.diagnosis');
    Route::patch('os/{os}/revisao', [ServiceOrderController::class, 'revision'])->name('os.revision');
    Route::post('os/{os}/assumir', [ServiceOrderController::class, 'assume'])->name('os.assume');
    Route::post('os/{os}/itens', [ServiceOrderItemController::class, 'store'])->name('os.items.store');
    Route::get('os/{os}/imprimir/{tipo}', [ServiceOrderController::class, 'print'])->name('os.print');

    // Balcão e master
    Route::middleware('role:master,balcao')->group(function () {
        Route::get('os', [ServiceOrderController::class, 'index'])->name('os.index');
        Route::get('os/nova', [ServiceOrderController::class, 'create'])->name('os.create');
        Route::post('os', [ServiceOrderController::class, 'store'])->name('os.store');
        Route::patch('os/{os}', [ServiceOrderController::class, 'update'])->name('os.update');
        Route::put('os/{os}/itens/{item}', [ServiceOrderItemController::class, 'update'])->name('os.items.update');
        Route::delete('os/{os}/itens/{item}', [ServiceOrderItemController::class, 'destroy'])->name('os.items.destroy');

        Route::get('clientes', [ClientController::class, 'index'])->name('clientes.index');
        Route::post('clientes', [ClientController::class, 'store'])->name('clientes.store');
        Route::get('clientes/{client}', [ClientController::class, 'show'])->name('clientes.show');
        Route::put('clientes/{client}', [ClientController::class, 'update'])->name('clientes.update');

        Route::post('os/{os}/pagamentos', [OsPaymentController::class, 'store'])->name('os.payments.store');
        Route::delete('os/{os}/pagamentos/{entry}', [OsPaymentController::class, 'destroy'])->name('os.payments.destroy');

        Route::post('veiculos', [VehicleController::class, 'store'])->name('veiculos.store');
        Route::put('veiculos/{vehicle}', [VehicleController::class, 'update'])->name('veiculos.update');
    });

    // Somente master (sócios)
    Route::middleware('role:master')->group(function () {
        Route::delete('os/{os}', [ServiceOrderController::class, 'destroy'])->name('os.destroy');
        Route::get('usuarios', [UserController::class, 'index'])->name('usuarios.index');
        Route::post('usuarios', [UserController::class, 'store'])->name('usuarios.store');
        Route::put('usuarios/{user}', [UserController::class, 'update'])->name('usuarios.update');

        // Financeiro
        Route::get('financeiro', [FinanceController::class, 'dashboard'])->name('financeiro.index');
        Route::get('financeiro/lancamentos', [FinanceController::class, 'entries'])->name('financeiro.entries');
        Route::post('financeiro/lancamentos', [FinanceController::class, 'store'])->name('financeiro.entries.store');
        Route::put('financeiro/lancamentos/{entry}', [FinanceController::class, 'update'])->name('financeiro.entries.update');
        Route::patch('financeiro/lancamentos/{entry}/baixa', [FinanceController::class, 'pay'])->name('financeiro.entries.pay');
        Route::patch('financeiro/lancamentos/{entry}/estorno', [FinanceController::class, 'unpay'])->name('financeiro.entries.unpay');
        Route::delete('financeiro/lancamentos/{entry}', [FinanceController::class, 'destroy'])->name('financeiro.entries.destroy');

        Route::get('financeiro/socios', [PartnerController::class, 'index'])->name('financeiro.partners');
        Route::post('financeiro/socios', [PartnerController::class, 'storePartner'])->name('financeiro.partners.store');
        Route::put('financeiro/socios/{partner}', [PartnerController::class, 'updatePartner'])->name('financeiro.partners.update');
        Route::post('financeiro/socios/movimentos', [PartnerController::class, 'storeMovement'])->name('financeiro.movements.store');
        Route::delete('financeiro/socios/movimentos/{movement}', [PartnerController::class, 'destroyMovement'])->name('financeiro.movements.destroy');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
