<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use Illuminate\Support\Facades\Route;

// "Minha conta": nome, e-mail, senha e tema. Excluir a própria conta foi
// desativado de propósito (quem remove acesso é um sócio, em Usuários).
Route::middleware(['auth', 'auth.session', 'role:master,balcao,mecanico'])->group(function () {
    Route::get('minha-conta', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('minha-conta', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('minha-conta/senha', [PasswordController::class, 'update'])->name('password.update')->middleware('throttle:6,1');
});
