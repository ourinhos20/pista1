<?php

use App\Http\Controllers\AgendarController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\BotController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\MechanicController;
use App\Http\Controllers\OsPaymentController;
use App\Http\Controllers\PartnerController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\ServiceOrderController;
use App\Http\Controllers\ServiceOrderItemController;
use App\Http\Controllers\SiteController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VehicleCatalogController;
use App\Http\Controllers\VehicleController;
use Illuminate\Support\Facades\Route;

/*
| Site institucional (público) na raiz do domínio.
*/
Route::get('/', SiteController::class)->name('site');

// Cliente: pedir agendamento pelo site (com fotos)
Route::get('agendar', [AgendarController::class, 'form'])->name('agendar');
Route::post('agendar', [AgendarController::class, 'submit'])->middleware('throttle:5,10')->name('agendar.submit');
Route::get('agendar/enviado', [AgendarController::class, 'thanks'])->name('agendar.ok');
Route::get('agendar/modelos', [VehicleCatalogController::class, 'models'])->middleware('throttle:60,1')->name('agendar.modelos');

// Cliente: ver e aprovar o orçamento pelo link secreto enviado no WhatsApp
Route::get('orcamento/{token}', [BudgetController::class, 'show'])->middleware('throttle:60,1')->name('orcamento.show');
Route::post('orcamento/{token}', [BudgetController::class, 'decide'])->middleware('throttle:10,1')->name('orcamento.decide');
Route::get('orcamento/{token}/foto/{attachment}', [AttachmentController::class, 'showPublic'])->middleware('throttle:120,1')->name('orcamento.foto');

// Bot do WhatsApp: cria o agendamento (OS) direto no sistema. Protegido pelo BOT_TOKEN.
Route::post('api/bot/agendamento', [BotController::class, 'agendamento'])->middleware('throttle:30,1')->name('bot.agendamento');

/*
| Sistema da oficina, num endereço escondido configurável (PAINEL_PATH).
| Nada do site aponta para cá: só quem sabe o endereço chega na tela de login.
*/
Route::prefix(config('oficina.panel_path'))->group(function () {
    Route::get('/', fn () => to_route('dashboard'))->name('home');

    Route::middleware(['auth', 'auth.session', 'role:master,balcao,mecanico'])->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');

        // Todos os perfis (o servidor esconde dados sensíveis do mecânico)
        Route::get('mecanico', [MechanicController::class, 'index'])->name('mecanico.index');
        Route::get('buscar-placa', [VehicleController::class, 'lookup'])->name('veiculos.lookup');
        Route::get('catalogo/marcas', [VehicleCatalogController::class, 'brands'])->name('catalogo.marcas');
        Route::get('catalogo/modelos', [VehicleCatalogController::class, 'models'])->name('catalogo.modelos');
        Route::get('veiculos/{vehicle}', [VehicleController::class, 'show'])->name('veiculos.show');
        Route::get('os/{os}', [ServiceOrderController::class, 'show'])->name('os.show')->whereNumber('os');
        Route::patch('os/{os}/status', [ServiceOrderController::class, 'status'])->name('os.status');
        Route::patch('os/{os}/diagnostico', [ServiceOrderController::class, 'diagnosis'])->name('os.diagnosis');
        Route::patch('os/{os}/revisao', [ServiceOrderController::class, 'revision'])->name('os.revision');
        Route::patch('os/{os}/vistoria', [ServiceOrderController::class, 'vistoria'])->name('os.vistoria');
        Route::post('os/{os}/assumir', [ServiceOrderController::class, 'assume'])->name('os.assume');
        Route::post('os/{os}/itens', [ServiceOrderItemController::class, 'store'])->name('os.items.store');
        Route::get('os/{os}/imprimir/{tipo}', [ServiceOrderController::class, 'print'])->name('os.print');
        Route::get('fichas/{tipo}', [ServiceOrderController::class, 'blankForm'])->name('fichas.branco');
        Route::post('os/{os}/fotos', [AttachmentController::class, 'store'])->middleware('throttle:30,1')->name('os.photos.store');
        Route::patch('os/{os}/fotos/{attachment}', [AttachmentController::class, 'update'])->name('os.photos.update');
        Route::delete('os/{os}/fotos/{attachment}', [AttachmentController::class, 'destroy'])->name('os.photos.destroy');
        Route::get('anexos/{attachment}', [AttachmentController::class, 'show'])->name('anexos.show');

        // Balcão e master
        Route::middleware('role:master,balcao')->group(function () {
            Route::get('os', [ServiceOrderController::class, 'index'])->name('os.index');
            Route::get('os/nova', [ServiceOrderController::class, 'create'])->name('os.create');
            Route::post('os', [ServiceOrderController::class, 'store'])->name('os.store');
            Route::patch('os/{os}', [ServiceOrderController::class, 'update'])->name('os.update');
            Route::put('os/{os}/cadastro', [ServiceOrderController::class, 'cadastro'])->name('os.cadastro');
            Route::post('os/{os}/chegou', [ServiceOrderController::class, 'checkin'])->name('os.checkin');
            Route::patch('os/{os}/itens/{item}/aprovacao', [ServiceOrderItemController::class, 'approval'])->name('os.items.approval');
            Route::get('clientes/buscar', [ClientController::class, 'lookup'])->name('clientes.lookup');
            Route::put('os/{os}/itens/{item}', [ServiceOrderItemController::class, 'update'])->name('os.items.update');
            Route::delete('os/{os}/itens/{item}', [ServiceOrderItemController::class, 'destroy'])->name('os.items.destroy');
            Route::post('os/{os}/pagamentos', [OsPaymentController::class, 'store'])->name('os.payments.store');
            Route::delete('os/{os}/pagamentos/{entry}', [OsPaymentController::class, 'destroy'])->name('os.payments.destroy');

            // Fornecedores e compras de peças
            Route::get('fornecedores', [SupplierController::class, 'index'])->name('fornecedores.index');
            Route::post('fornecedores', [SupplierController::class, 'store'])->name('fornecedores.store');
            Route::get('fornecedores/{supplier}', [SupplierController::class, 'show'])->name('fornecedores.show');
            Route::put('fornecedores/{supplier}', [SupplierController::class, 'update'])->name('fornecedores.update');
            Route::get('compras', [PurchaseController::class, 'index'])->name('compras.index');
            Route::post('compras', [PurchaseController::class, 'store'])->name('compras.store');
            Route::delete('compras/{purchase}', [PurchaseController::class, 'destroy'])->name('compras.destroy');

            Route::get('clientes', [ClientController::class, 'index'])->name('clientes.index');
            Route::post('clientes', [ClientController::class, 'store'])->name('clientes.store');
            Route::get('clientes/{client}', [ClientController::class, 'show'])->name('clientes.show');
            Route::put('clientes/{client}', [ClientController::class, 'update'])->name('clientes.update');

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
});
