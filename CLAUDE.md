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
- `routes/web.php`: o site fica em `/`, mais `/agendar` (o cliente agenda e já vira OS), `/orcamento/{token}` (o cliente aprova item por item) e `/api/bot/agendamento` (bot). **Todo o sistema** fica sob o prefixo escondido `PAINEL_PATH` (local: `/sistema`). No frontend, use sempre `route('nome')` e nunca caminhos fixos.
- `app/Support/OsPresenter.php`: **é aqui que se esconde dos mecânicos** o que eles não podem ver.
- `app/Enums/OsStatus.php` e `resources/js/lib/os.ts`: as etapas da OS e quem faz cada uma.
- `resources/js/components/erp.tsx`: componentes visuais (Block, Grid, Field, ReadOnly, Tool, Tabs, Situacao, Placa) e o menu.
- `resources/js/pages/print/*`: fichas A4 impressas. O menu **Fichas** do topo abre as mesmas fichas em branco (`/fichas/{tipo}`); a via do cliente em branco é só do balcão/master. As fichas abrem **na mesma aba** e o botão **Voltar** retorna à tela anterior (não usar nova aba nem `window.close`).
- Menu: **Nova OS não fica no menu** (é o botão + Nova OS na tela Ordens de serviço, ou F2).
- `config/oficina.php`: dados da oficina (telefone, endereço, termos de garantia) e o `panel_path`.

## Regras de negócio (decididas pelo dono — não mudar sem ele pedir)
- **Perfis:** `master` (sócios: tudo, inclusive financeiro e usuários), `balcao` (atendimento) e `mecanico`.
- **O mecânico nunca recebe** CPF, telefone, endereço, e-mail nem valores. O cliente aparece só pelo primeiro nome. Essa filtragem acontece **no servidor**, não basta esconder na tela.
- **Todos os mecânicos veem a agenda inteira** da oficina.
- **Fluxo da OS (sem gargalos):**
  1. Agendado: pelo bot, pelo site (`/agendar`) ou pelo balcão. Só dados básicos (nome, telefone, carro/ano, placa opcional, tipo, relato, horário). **O agendamento já cria a OS**; cliente e carro entram no cadastro sozinhos (`app/Support/OsIntake.php`). Na Nova OS dá para achar o cliente que já veio por nome, CPF, telefone ou placa.
  2. Recebido: o balcão clica em "Cliente chegou", confere a **placa (obrigatória aqui)** e completa o cadastro. O cadastro pode ser editado a qualquer momento. Se a placa já existir, a OS passa para o carro já cadastrado.
  3. Em diagnóstico: o mecânico faz **primeiro a vistoria de entrada** (km, combustível, itens, avarias) e só depois consegue "Enviar para o balcão".
  4. Aguardando orçamento: o balcão lança os valores e manda o link pelo WhatsApp (ou imprime a via do cliente).
  5. Aguardando aprovação: o cliente aprova **item por item** no link. Não aprovou nada → volta para o balcão (se cobrar diagnóstico, o balcão inclui o item "Taxa de diagnóstico").
  6. Aguardando peças (opcional): ao lançar a compra ligada à OS, ela volta sozinha para execução.
  7. Em execução: item novo vira **complementar**; o cliente aprova pelo link sem parar o que já foi aprovado.
  8. Pronto. 9. Entregue (balcão).
  - Cada OS guarda desde quando está na etapa (`status_changed_at`); o painel acusa o que está parado há muito tempo.
  - **O tipo de serviço define a ficha do mecânico:** revisão/preventiva → só o checklist; defeito/outro → só relato e diagnóstico (sem tipo, as duas). O Imprimir da OS segue a mesma regra (`workFor` em `resources/js/lib/os.ts`).
  - O master faz e altera tudo.
- **Bot do WhatsApp:** `POST /api/bot/agendamento` com `Authorization: Bearer <BOT_TOKEN>`. Com `BOT_TOKEN` vazio, a rota fica desligada. Detalhes em `deploy/PUBLICAR-HOSTGATOR.md`.
- **Só o balcão ou o master lançam valores.** O mecânico pode pedir peça, mas sem preço.
- **Revisão:** o checklist é preenchido no celular e grava sozinho a cada toque. Critério (impresso na ficha e na tela): OK = bom; Atenção = funciona mas perto do limite, avisar e trocar na próxima; Trocar = entra no orçamento; em branco = não verificado/não se aplica. Botão "Resto OK" por grupo. Itens em `resources/js/lib/revisao.ts` (não renomear chaves já usadas: perde o que foi marcado nas OS antigas).
- **Financeiro:**
  - só master;
  - regime de caixa;
  - o equilíbrio dos sócios compara aportes − retiradas com a parte ideal pela participação (%);
  - pagamentos da OS e compras de peças viram lançamentos automaticamente.
  - entrada pode ser **vinculada a uma OS** (puxa cliente e o valor que falta); o pagamento aparece na própria OS. Despesa nunca é ligada a OS;
  - o painel lista **carros prontos/entregues sem pagamento lançado** (`Finance::ordersToReceive`);
  - despesa paga do bolso do sócio vira **aporte** dele, e receita que ficou com o sócio vira **retirada** (ligadas ao lançamento: excluir/estornar desfaz);
  - "Baixar" pede a data e a forma de pagamento.
- **Sem catálogo de peças e sem controle de estoque** (foram removidos a pedido). Na compra e na OS, a peça é só uma descrição digitada.
- **Veículo:** marca e modelo vêm do **catálogo FIPE** (`database/data/veiculos-fipe.json`, carregado pela migração; componente `resources/js/components/vehicle-picker.tsx`). O modelo já traz versão e motor; dá para digitar livre se não estiver no catálogo. Também há **cor** e **chassi** (o mecânico anota o chassi na vistoria; o balcão também pode, pelo documento). Para atualizar o catálogo: `php artisan pista1:catalogo-fipe` (precisa de internet; `--so-importar` só recarrega o arquivo).
- **Fornecedores** ficam em Cadastros e em Compras. A ficha do fornecedor mostra o histórico de compras por mês.
- **Compras:** a OS é escolhida numa lista (puxa as peças pedidas). Por padrão **não** lança as peças de novo na OS (já estão no orçamento); só o custo entra na margem. A mesma NF do mesmo fornecedor não entra duas vezes. A tela mostra os carros "aguardando peças" com botão Comprar.

## Visual (importante)
- Estilo **ERP**, como Consinco/Bluesoft: barra de menus, código da tela (ATD001, FIN010…), barra de ferramentas com teclas F, grades densas, barra de status.
- O dono **não quer** "dashboard genérico com cara de IA": nada de cartões grandes, saudações ou gradientes.
- Cores: preto `#0f1012`, branco e cinza, vermelho `#d42a2a` só para ações e alertas. Fonte Inter.
- No celular do mecânico: botões grandes, ação principal no rodapé.
- Navegação: computador = barra de menus no topo; **tablet** (768–1023 px) = botão **Menu** no topo que abre a lista completa; **celular** = barra no rodapé (Painel, Ordens, Agenda, Clientes, Mais).
- **Sequência do mecânico** na OS (recebido/diagnóstico): 1 Vistoria → 2 Diagnóstico/Checklist ("Concluir" grava `work_done_at`) → 3 Peças → 4 Fotos (opcional). Abas seguintes ficam apagadas e bloqueadas; o envio ao balcão exige vistoria e etapa 2 concluídas.
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
