# Publicar o PISTA1 na HostGator (plano compartilhado)

O site institucional fica em `https://seudominio.com.br/` e o sistema fica num endereço escondido, por exemplo `https://seudominio.com.br/p1-gestao-7k2q/login`. Nenhum link do site aponta para o sistema.

## Antes de começar (uma vez só, no cPanel)

1. **SSL grátis**: em *SSL/TLS Status*, ative o certificado do domínio. O sistema só funciona em HTTPS.
2. **Versão do PHP**: em *MultiPHP Manager* (ou *Selecionar versão do PHP*), escolha **PHP 8.3** (mínimo 8.2) para o domínio. Deixe ativas as extensões `pdo_mysql`, `mbstring`, `intl`, `fileinfo`, `openssl`, `tokenizer`, `xml`, `ctype`, `bcmath`, `zip` e `gd`.
3. **Banco MySQL**: em *Bancos de dados MySQL*:
   - crie um banco (ex.: `usuario_pista1`);
   - crie um usuário com **senha forte**;
   - adicione o usuário ao banco com **todos os privilégios**.
4. **Acesso SSH**: em *Acesso SSH* (ou *Terminal*), confirme que o SSH está liberado. Ele é usado para rodar os comandos de instalação.

## 1. Gerar o pacote (no seu computador)

Na pasta do projeto:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\empacotar.ps1
```

O arquivo `deploy\saida\pista1-AAAAMMDD-HHMM.zip` sai com duas pastas: `pista1` e `public_html`.

## 2. Enviar os arquivos

Pelo *Gerenciador de Arquivos* do cPanel (ou FTP):

1. Envie o zip para `/home/SEU_USUARIO/` e use **Extrair**.
2. A pasta `pista1` deve ficar em `/home/SEU_USUARIO/pista1`, **fora** do `public_html`.
3. Mova o **conteúdo** da pasta `public_html` extraída para dentro do `public_html` do servidor. Faça backup antes, se houver um site antigo lá.

## 3. Configurar o `.env`

1. Em `/home/SEU_USUARIO/pista1`, copie `.env.producao.exemplo` para `.env`.
2. Preencha o `.env`:
   - `APP_URL`: o seu domínio, com https;
   - `DB_DATABASE`, `DB_USERNAME` e `DB_PASSWORD`: os dados do banco criado no cPanel;
   - `PAINEL_PATH`: um endereço secreto, só com letras, números e hífen (ex.: `p1-gestao-7k2q`). **Anote esse endereço.**
   - `OFICINA_ENDERECO` e os demais dados da oficina.
3. Confira que `APP_DEBUG=false`. Com `true`, um erro mostraria senhas na tela.

## 4. Instalar (pelo Terminal/SSH)

```bash
cd ~/pista1
php artisan key:generate --force
php artisan migrate --force
php artisan pista1:criar-master
php artisan config:cache
php artisan route:cache
php artisan view:cache
chmod -R 775 storage bootstrap/cache
chmod 600 .env
```

- Se `php` não for a versão 8.3 no terminal, use `/opt/cpanel/ea-php83/root/usr/bin/php` no lugar de `php`.
- O comando `pista1:criar-master` pede nome, e-mail e senha do primeiro sócio. Depois de entrar no sistema, ele cria os outros acessos em **Sistema › Usuários**.
- **Não** rode `db:seed` em produção. Os dados de demonstração são bloqueados lá de propósito.

## 5. Testar

- `https://seudominio.com.br/` abre o site.
- `https://seudominio.com.br/SEU-PAINEL_PATH/login` abre o login do sistema.
- `https://seudominio.com.br/login` e `https://seudominio.com.br/.env` devem dar **erro** (404 ou 403).

## Atualizar uma versão nova

1. Gere um pacote novo (passo 1).
2. Envie e substitua os arquivos em `pista1/` e `public_html/`. **Não apague** o `.env` nem a pasta `pista1/storage`.
3. No terminal:

```bash
cd ~/pista1
php artisan down
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
php artisan up
```

## Backup

- Ative o backup automático da HostGator, se o plano tiver.
- Uma vez por semana, exporte o banco em *phpMyAdmin › Exportar* e guarde o arquivo fora do servidor (Google Drive, por exemplo).
- **Fotos das OS e dos pedidos do site** ficam em `~/pista1/storage/app/private`. Inclua essa pasta no backup (no Gerenciador de Arquivos: *Compactar* e baixar). Nunca apague essa pasta numa atualização.

## Links públicos (para divulgar)

- `https://seudominio.com.br/agendar`: o cliente pede um horário e manda fotos. O pedido aparece em **Atendimento › Pedidos do site**. Vale colocar esse link na bio do Instagram e na mensagem automática do WhatsApp Business.
- `https://seudominio.com.br/orcamento/...`: link individual de cada OS, que o próprio sistema monta ao clicar em **Orçamento no WhatsApp**. Não precisa divulgar.
- As fotos são reduzidas no próprio celular antes do envio (cerca de 300 KB cada), então o limite de upload padrão da HostGator é suficiente.

## Segurança já configurada no sistema

- O sistema fica escondido em `PAINEL_PATH`. Não há cadastro público nem "esqueci a senha": só um sócio cria e redefine acessos.
- Login limitado a 5 tentativas por e-mail. A sessão cai se a senha for trocada ou se o usuário for desativado.
- Senhas com no mínimo 8 caracteres, com letras e números.
- O mecânico não recebe CPF, telefone, endereço nem valores (o filtro é feito no servidor).
- Cabeçalhos de segurança em todas as respostas:
  - política de conteúdo (CSP);
  - HSTS;
  - proteção contra o sistema ser aberto dentro de outro site;
  - sistema marcado como "não indexar" no Google.
- Cookies de sessão criptografados e enviados só por HTTPS. O código e o `.env` ficam fora da pasta pública.
