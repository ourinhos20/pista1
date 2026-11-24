# PISTA1 — Sistema da Pista 1 Mecânica Automotiva

Sistema web de gestão da oficina: clientes, veículos com histórico, ordens de serviço, fichas A4 para impressão e (em breve) finanças e saldo dos sócios.

**Tecnologia:** Laravel 12 (PHP 8.2+) + React/Inertia + Tailwind. Banco MySQL em produção (HostGator) e SQLite no desenvolvimento.

## Perfis de acesso

| Perfil | Vê | Não vê |
|---|---|---|
| Master (sócios) | Tudo, inclusive valores e usuários | — |
| Balcão | Clientes, OS, orçamentos, valores, impressão | Usuários |
| Mecânico | Só as OS dele: placa, carro, km, histórico, diagnóstico | CPF, telefone, endereço, e-mail, valores |

A regra de privacidade é aplicada no servidor (`app/Support/OsPresenter.php`) e coberta por testes (`tests/Feature/OficinaAccessTest.php`).

## Rodar no computador (desenvolvimento)

```powershell
composer install
npm install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
npm run build
php artisan serve
```

- O **site institucional** abre em http://127.0.0.1:8000.
- O **sistema** fica no endereço escondido definido em `PAINEL_PATH` (no computador é `sistema`): http://127.0.0.1:8000/sistema/login.

O `--seed` cria usuários e dados de demonstração (veja `database/seeders/DatabaseSeeder.php`). Em produção ele é bloqueado; lá use `php artisan pista1:criar-master`.

## Publicar na HostGator

Siga o passo a passo em [deploy/PUBLICAR-HOSTGATOR.md](deploy/PUBLICAR-HOSTGATOR.md). O pacote é gerado com `deploy\empacotar.ps1`.

## Testes

```powershell
php artisan test
```

## Dados da oficina nas fichas

Telefone, Instagram, endereço, CNPJ e o texto de prazo/garantia ficam em `config/oficina.php` (podem ser trocados pelo `.env`: `OFICINA_TELEFONE`, `OFICINA_ENDERECO`, `OFICINA_CNPJ`...).
