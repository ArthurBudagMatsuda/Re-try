# Publicar RE:TRY na Vercel

O projeto foi adaptado para Next.js com runtime Node.js, banco libSQL e autenticação administrativa própria. O deploy não depende de Cloudflare Workers ou dos cabeçalhos de autenticação do Sites.

## 1. Preparar o ambiente local

No primeiro clone, copie `.env.example` para `.env`. No PowerShell:

```powershell
Copy-Item .env.example .env
npm ci
npm run admin:setup
npm run db:migrate
npm run dev
```

Nesta workspace, o `.env` já foi criado: não o sobrescreva. `admin:setup` pede seu e-mail e uma senha de 12–512 caracteres, com entrada oculta. Ele salva apenas o hash scrypt e gera `AUTH_SECRET` se necessário. Acesse `/admin` para entrar; os controles aparecem na página inicial.

## 2. Configurar um banco remoto libSQL

Use um banco libSQL remoto, por exemplo no Turso. Depois de criar o banco e obter sua URL e token, configure no `.env`:

```dotenv
DATABASE_URL=libsql://SEU-BANCO-SEU-GRUPO.turso.io
DATABASE_AUTH_TOKEN=SEU_TOKEN_DO_BANCO
```

Execute `npm run db:migrate` com essa configuração para aplicar as migrations no banco de destino. As migrations são versionadas e podem ser executadas novamente. Não execute `db:generate` para inicializar produção.

Em desenvolvimento, `DATABASE_URL=file:./retry.db` permite usar SQLite sem serviço remoto. Na Vercel, arquivos locais não são usados como banco: o código recusa URLs `file:` e `:memory:` nesse ambiente. Cada banco vazio começa com a tentativa #001 e a CA configurada em `lib/retry/config.ts`. A migration 0003 remove apenas os antigos registros com mints explicitamente simulados.

Os registros do D1 do Site original não são transferidos automaticamente. Para levá-los ao novo banco, exporte a tabela `attempts` e importe seus registros no banco já migrado, preservando IDs, mints, datas e snapshots, antes do primeiro acesso. Não copie credenciais ou tabelas de autenticação antigas.

## 3. Importar o GitHub na Vercel

Importe `ArthurBudagMatsuda/Re-try` e selecione a branch `main`.

- Root Directory: a raiz do repositório.
- Framework Preset: Next.js.
- Node.js: 22.x ou outra versão suportada com Node 22.13+.
- Install Command: `npm ci`.
- Build Command: `npm run build`.
- Output Directory: mantenha o padrão do Next.js.

O arquivo `vercel.json` já define framework, instalação e build. A aplicação usa `next dev`, `next build` e `next start`; o build não conecta ao banco nem aplica migrations.

## 4. Variáveis da Vercel

Em **Project Settings → Environment Variables**, adicione:

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | URL remota libSQL do banco de destino |
| `DATABASE_AUTH_TOKEN` | Token de acesso ao banco |
| `RETRY_ADMIN_EMAIL` | E-mail escolhido em `admin:setup` |
| `RETRY_ADMIN_PASSWORD_HASH` | Valor scrypt gerado no `.env` por `admin:setup` |
| `AUTH_SECRET` | Valor aleatório gerado no `.env` |

Todas são privadas do servidor: não adicione `NEXT_PUBLIC_`. Não coloque a senha em texto puro na Vercel nem envie `.env` ao GitHub. Se o painel recebe o valor copiado de uma atribuição com aspas no `.env`, copie apenas o conteúdo, sem as aspas delimitadoras.

Configure Production e os outros ambientes que utilizar. Para previews, use um banco separado para evitar alterações nos dados de produção. Depois de mudar variáveis, faça um novo deploy para aplicá-las.

## 5. Verificar

```sh
npm run build
npm run test:vercel
```

O teste usa um banco descartável local, não o banco configurado no `.env`. Após o deploy, confira `/`, `/cemetery` e `/admin`. O login usa um cookie HttpOnly, SameSite=Strict e Secure em produção; a sessão dura oito horas. Sem configuração administrativa válida, o login e as alterações administrativas permanecem indisponíveis. Leituras continuam disponíveis quando o banco está configurado.

Fechar uma tentativa salva seu snapshot; uma nova tentativa começa apenas após registro manual. O monitor consulta a API pública do DEX Screener a cada 30 segundos. Usa o par de maior liquidez em que a CA é o token base. Volume, buys, sells e transações são janelas de 24h desse par; não representam totais desde o lançamento. Holders e histórico de preços não são inventados. Valores indisponíveis aparecem como —; uma falha no provedor não encerra a tentativa.

Sem DATABASE_URL, o site público funciona com a tentativa configurada no código e Cemetery vazio, sem gravações nem painel administrativo. Para persistir histórico e administrar tentativas, configure o banco remoto e as cinco variáveis acima. Não há fallback silencioso se um banco configurado falhar.

Referências oficiais: [Next.js na Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [variáveis de ambiente da Vercel](https://vercel.com/docs/environment-variables), [cliente libSQL](https://docs.turso.tech/sdk/ts/reference).
