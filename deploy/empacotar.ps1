# Gera o pacote para publicar na HostGator (plano compartilhado).
# Uso (na pasta do projeto):  powershell -ExecutionPolicy Bypass -File deploy\empacotar.ps1
# Resultado: deploy\saida\pista1-AAAAMMDD-HHMM.zip com duas pastas:
#   pista1\        -> enviar para /home/SEU_USUARIO/pista1   (fora do public_html)
#   public_html\   -> conteúdo para /home/SEU_USUARIO/public_html

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$out = Join-Path $root 'deploy\saida'
$stage = Join-Path $out "pista1-$stamp"
$app = Join-Path $stage 'pista1'
$pub = Join-Path $stage 'public_html'

Write-Host '1/5 Compilando a interface (npm run build)...'
npm run build | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Falha no npm run build' }

Write-Host '2/5 Copiando o sistema (sem node_modules, testes, .env e banco local)...'
New-Item -ItemType Directory -Force $app, $pub | Out-Null
$excludeDirs = @('node_modules', 'vendor', '.git', '.github', '.claude', 'tests', 'deploy', 'public', '.idea', '.vscode')
robocopy $root $app /E /NFL /NDL /NJH /NJS /NP /XD $excludeDirs /XF '.env' '.env.backup' 'database.sqlite' '*.log' '.phpunit.result.cache' | Out-Null
# limpa caches compilados e sessões locais
Get-ChildItem "$app\storage\framework\views", "$app\storage\framework\sessions", "$app\storage\framework\cache\data" -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne '.gitignore' } | Remove-Item -Force
Get-ChildItem "$app\bootstrap\cache" -Filter '*.php' -ErrorAction SilentlyContinue | Remove-Item -Force
Copy-Item "$root\deploy\hostgator\env-producao.exemplo" "$app\.env.producao.exemplo"

Write-Host '3/5 Instalando dependências PHP de produção (composer --no-dev)...'
composer install --working-dir="$app" --no-dev --optimize-autoloader --no-interaction --no-progress --quiet
if ($LASTEXITCODE -ne 0) { throw 'Falha no composer install' }

Write-Host '4/5 Montando public_html...'
robocopy "$root\public" $pub /E /NFL /NDL /NJH /NJS /NP /XF 'hot' 'index.php' '.htaccess' | Out-Null
Copy-Item "$root\deploy\hostgator\index.php" "$pub\index.php"
Copy-Item "$root\deploy\hostgator\.htaccess" "$pub\.htaccess"

Write-Host '5/5 Compactando...'
$zip = Join-Path $out "pista1-$stamp.zip"
Compress-Archive -Path "$stage\*" -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force

Write-Host ''
Write-Host "Pacote pronto: $zip" -ForegroundColor Green
Write-Host 'Siga o passo a passo em deploy\PUBLICAR-HOSTGATOR.md'
