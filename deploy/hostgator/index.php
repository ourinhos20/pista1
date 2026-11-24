<?php

/*
 * index.php para HostGator (plano compartilhado).
 * Este arquivo fica em public_html/. O sistema fica FORA da pasta pública,
 * em /home/SEU_USUARIO/pista1, assim ninguém consegue baixar o .env nem o código.
 */

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$app_dir = __DIR__.'/../pista1';

if (file_exists($maintenance = $app_dir.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $app_dir.'/vendor/autoload.php';

$app = require_once $app_dir.'/bootstrap/app.php';

// os arquivos públicos (build, imagens) estão aqui em public_html
$app->usePublicPath(__DIR__);

$app->handleRequest(Request::capture());
