# PISTA1 — instruções para o Claude

## Idioma e tom
- **Responda sempre em português do Brasil.** Textos da interface, mensagens de commit e comentários no código também em PT-BR.
- O dono não é programador. Explique em linguagem simples, sem jargão, e diga o que muda no dia a dia da oficina.
- Faça commit/push **só quando ele pedir**. Mensagens de commit em PT-BR.

## O que é
Sistema de gestão da oficina **Pista 1 Mecânica Automotiva** (atendimento, OS, fichas A4, financeiro dos sócios, compras de peças) + **site institucional** público. Hospedagem: **HostGator, plano compartilhado** (ainda não publicado).

## Tecnologia e comandos
Laravel 12 (PHP 8.2+) + Inertia + React/TypeScript + Tailwind 4. Banco **SQLite** local, **MySQL** em produção.

```bash
composer install && npm install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed      # dados de demonstração (usuários em database/seeders/DatabaseSeeder.php)
npm run build && php artisan serve
php artisan test                # testes (rodar sempre antes de entregar)
npx tsc --noEmit                # checagem de tipos do frontend
```
Publicação: `deploy/empacotar.ps1` gera o zip; passo a passo em `deploy/PUBLICAR-HOSTGATOR.md`.

## Onde fica cada coisa
- `routes/web.php`: o site fica em `/`, mais `/agendar` (pedido do cliente com fotos) e `/orcamento/{token}` (o cliente aprova o orçamento). **Todo o sistema** fica sob o prefixo escondido `PAINEL_PATH` (local: `/sistema`). No frontend, use sempre `route('nome')` e nunca caminhos fixos.
- `app/Support/OsPresenter.php`: **é aqui que se esconde dos mecânicos** o que eles não podem ver.
- `app/Enums/OsStatus.php` e `resources/js/lib/os.ts`: as etapas da OS e quem faz cada uma.
- `resources/js/components/erp.tsx`: componentes visuais (Block, Grid, Field, ReadOnly, Tool, Tabs, Situacao, Placa) e o menu.
- `resources/js/pages/print/*`: fichas A4 impressas.
- `config/oficina.php`: dados da oficina (telefone, endereço, termos de garantia) e o `panel_path`.

## Regras de negócio (decididas pelo dono — não mudar sem ele pedir)
- **Perfis:** `master` (sócios: tudo, inclusive financeiro e usuários), `balcao` (atendimento) e `mecanico`.
- **O mecânico nunca recebe** CPF, telefone, endereço, e-mail nem valores. O cliente aparece só pelo primeiro nome. Essa filtragem acontece **no servidor**, não basta esconder na tela.
- **Todos os mecânicos veem a agenda inteira** da oficina.
- **Fluxo da OS:**
  1. Agendado (balcão).
  2. Em diagnóstico (mecânico).
  3. Aguardando orçamento: o mecânico "envia para o balcão".
  4. Aguardando aprovação: o balcão lança os valores e manda o link pelo WhatsApp.
  5. Em execução: o cliente aprova pelo link ou o balcão marca.
  6. Pronto.
  7. Entregue (balcão).
- **Só o balcão ou o master lançam valores.** O mecânico pode pedir peça, mas sem preço.
- **Revisão:** o checklist é preenchido no celular e grava sozinho a cada toque.
- **Financeiro:**
  - só master;
  - regime de caixa;
  - o equilíbrio dos sócios compara aportes − retiradas com a parte ideal pela participação (%);
  - pagamentos da OS e compras de peças viram lançamentos automaticamente.
- **Sem catálogo de peças e sem controle de estoque** (foram removidos a pedido). Na compra e na OS, a peça é só uma descrição digitada.
- **Fornecedores** ficam em Cadastros e em Compras. A ficha do fornecedor mostra o histórico de compras por mês.

## Visual (importante)
- Estilo **ERP**, como Consinco/Bluesoft: barra de menus, código da tela (ATD001, FIN010…), barra de ferramentas com teclas F, grades densas, barra de status.
- O dono **não quer** "dashboard genérico com cara de IA": nada de cartões grandes, saudações ou gradientes.
- Cores: preto `#0f1012`, branco e cinza, vermelho `#d42a2a` só para ações e alertas. Fonte Inter.
- No celular do mecânico: botões grandes, ação principal no rodapé.
- **As fichas A4 precisam caber em uma folha.** Confira a altura do conteúdo de `.print-sheet`: deve ser ≤ ~1047 px com largura de 794 px.

## Segurança (já configurada — manter)
- Não recriar cadastro público, "esqueci a senha" nem "excluir minha conta". Quem cria e redefine acessos é um sócio, na tela Usuários.
- **Em produção há CSP com nonce:** todo `<script>` inline em Blade precisa de `nonce="{{ Vite::cspNonce() }}"`.
- Fotos ficam em `storage/app/private`, reduzidas e sem EXIF/GPS, e só saem por rota autenticada ou pelo link secreto do orçamento.
- Os dados de demonstração são bloqueados em produção. O primeiro sócio é criado com `php artisan pista1:criar-master`.
- Nunca fazer commit de `.env`, `database.sqlite` ou `deploy/saida`.

## Pendências
- Publicar na HostGator: faltam o domínio, o endereço da oficina e o SSH liberado no cPanel.
- Ainda não foi testado em MySQL de verdade; o primeiro `migrate` em produção vai confirmar.
