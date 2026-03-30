# Polaroom

Documentação de arquitetura, funcionamento e manutenção do projeto.

Este repositório contém uma aplicação pessoal inspirada em "eras", com shell em React, módulos legados em JavaScript puro, autenticação via Supabase, sincronização de estado entre dispositivos e deploy em Cloudflare Workers.

O código principal da aplicação está em:

- ['sitezin sla'](./sitezin%20sla)

O projeto nasceu da ideia de ter um lugar próprio para salvar links, playlists, anotações e outras coisas que eu uso no dia a dia. A proposta sempre foi misturar organização pessoal com prática real de desenvolvimento, usando o projeto como espaço para testar ideias, exercitar conhecimentos e ir refinando a experiência aos poucos.

O Polaroom continua em andamento e recebe adições constantes. Ele também já tem seu próprio link público:

- [polaroom.page](https://polaroom.page)

Visualmente, o site é temático e usa cores inspiradas nas eras da Taylor Swift, o que faz parte da identidade do projeto e da motivação pessoal por trás dele.

## Visão geral

O projeto foi evoluindo em camadas. Hoje ele funciona assim:

1. A shell em React controla:
   - autenticação
   - tema light/dark
   - layout principal da aplicação
   - montagem inicial da interface
2. Depois do login, a aplicação inicializa módulos legados que ainda cuidam de boa parte da experiência interna:
   - navegação entre eras
   - busca
   - editor de perfil
   - dashboard GitHub
   - renderização das páginas por categoria
3. O estado da aplicação é salvo localmente e também pode ser sincronizado com o Supabase.
4. Existe um backend local opcional com Express + PostgreSQL para cenários legados e desenvolvimento local.
5. O frontend de produção é publicado via Cloudflare Workers usando assets gerados pelo Vite.

## Stack principal

- React 19
- Vite
- JavaScript ES Modules
- Supabase Auth + tabelas 'app_state' e 'app_state_versions'
- localStorage como camada local-first
- Express + PostgreSQL (backend local opcional)
- Cloudflare Workers para deploy do frontend estático

## Estrutura do repositório

```text
site - react etc/
|-- README.md                    -> este documento
|-- package.json                 -> dependência de CLI na raiz
|-- wrangler.jsonc               -> configuração de deploy Cloudflare
`-- sitezin sla/
    |-- package.json             -> scripts do frontend
    |-- .env.example             -> exemplo de variáveis
    |-- supabase-setup.sql       -> schema + RLS para Supabase
    |-- docker-compose.yml       -> PostgreSQL + backend local
    |-- src/
    |   |-- main.jsx             -> ponto de entrada React
    |   |-- App.jsx              -> shell React principal
    |   |-- hooks/useAuth.js     -> autenticação e sessão
    |   |-- lib/supabase.js      -> client Supabase do frontend
    |   |-- legacy/app.js        -> renderização das eras e modais
    |   |-- legacy/bootstrap.js  -> bindings de UI e interações globais
    |   |-- legacy/storage.js    -> persistência local e sync remoto
    |   |-- legacy/repositorios.js -> dashboard GitHub + destaques da home
    |   `-- styles/style.css     -> estilos globais
    |-- public/                  -> assets públicos
    |-- scripts/
    |   |-- check-encoding.mjs   -> bloqueia mojibake antes de build/dev
    |   `-- fix-ptbr-mojibake.mjs -> utilitário de correção
    `-- server/
        |-- package.json         -> scripts do backend local
        |-- init.sql             -> init do banco local
        `-- src/index.js         -> API Express
```

## Como a aplicação sobe

### 1. Shell React

Arquivo principal:

- ['sitezin sla/src/main.jsx'](./sitezin%20sla/src/main.jsx)

O React monta a aplicação no `#root` e carrega:

- ['sitezin sla/src/App.jsx'](./sitezin%20sla/src/App.jsx)

'App.jsx' é a shell principal. Ela:

- carrega o tema atual
- usa o hook de autenticação
- mostra a tela de login quando não há sessão
- inicializa os módulos legados após o login

### 2. Autenticação

Arquivos:

- ['sitezin sla/src/hooks/useAuth.js'](./sitezin%20sla/src/hooks/useAuth.js)
- ['sitezin sla/src/lib/supabase.js'](./sitezin%20sla/src/lib/supabase.js)

Fluxo:

1. `useAuth()` tenta obter a sessão atual no Supabase
2. escuta mudanças de auth (`onAuthStateChange`)
3. expõe os métodos:
   - login
   - cadastro
   - logout
   - reset de senha
   - update de senha
4. se as chaves do Supabase não existirem, o client fica `null` e a UI entra em fallback seguro

### 3. Boot da aplicação interna

Depois do login, 'App.jsx' carrega dinamicamente:

- `'legacy/storage.js'`
- `'legacy/app.js'`
- `'legacy/repositorios.js'`
- `'legacy/bootstrap.js'`

Ordem importante:

1. `Storage.setUser(...)`
2. `Storage.bootstrapPersistence()`
3. `initLegacyApp()`
4. `initShellInteractions()`
5. `initRepositorios()`

Isso garante que a UI tente hidratar do estado salvo antes de renderizar a aplicação interna.

## Modelo mental da app

A aplicação é organizada por "eras", que funcionam como áreas temáticas:

- Início
- Repositórios
- Música
- Notas
- Ferramentas
- Links
- Vídeos
- Resumos e Anotações
- Perfil
- Configurações

Grande parte dessas telas é renderizada pela camada legada em:

- ['sitezin sla/src/legacy/app.js'](./sitezin%20sla/src/legacy/app.js)

## Persistência e sincronização

Arquivo central:

- ['sitezin sla/src/legacy/storage.js'](./sitezin%20sla/src/legacy/storage.js)

Esse módulo é o núcleo de dados da aplicação.

Ele cuida de:

- itens por categoria
- ordenação manual
- pins
- recentes
- preferências de UI
- perfil
- avatar/header
- notificações
- histórico local de versões
- sincronização com Supabase

### Estratégia de persistência

O projeto é local-first.

Na prática:

1. o estado é salvo no `localStorage`
2. depois ele é sincronizado com o Supabase, quando disponível
3. o app mantém um status de sync para a UI
4. o app também mantém versões históricas do estado

### Tabelas remotas

No Supabase, o frontend trabalha principalmente com:

- 'app_state'
- 'app_state_versions'

Essas tabelas são criadas/configuradas por:

- ['sitezin sla/supabase-setup.sql'](./sitezin%20sla/supabase-setup.sql)

### Proteção de dados

O projeto foi ajustado para que cada usuário só acesse o próprio estado.

O SQL do Supabase:

- ativa RLS
- restringe leitura/escrita ao `auth.uid()`
- protege tanto o snapshot atual quanto o histórico de versões

## Perfil, shell e interações globais

Arquivo principal:

- ['sitezin sla/src/legacy/bootstrap.js'](./sitezin%20sla/src/legacy/bootstrap.js)

Esse módulo cuida de:

- navegação por hash e sidebar
- topbar
- busca
- abertura/fechamento de modais
- edição de perfil
- avatar e header
- toasts
- sincronização do indicador visual de sync
- atualização de partes da UI que não vivem no React

É a ponte entre o HTML renderizado pela shell e o comportamento interativo do restante da app.

## Dashboard GitHub

Arquivo:

- ['sitezin sla/src/legacy/repositorios.js'](./sitezin%20sla/src/legacy/repositorios.js)

Esse módulo cuida de:

- cards fixos da Fearless na home
- páginas recentes
- mais acessados
- painel de commits públicos
- heatmap de contribuições

Hoje o GitHub da home não precisa mais estar fixo no código:

- o usuário pode definir um perfil GitHub em 'Configurações'
- o dashboard lê esse valor e troca o usuário alvo
- há cache local para eventos e contribuições

## Backend local opcional

Pasta:

- ['sitezin sla/server'](./sitezin%20sla/server)

Arquivo principal:

- ['sitezin sla/server/src/index.js'](./sitezin%20sla/server/src/index.js)

Esse backend existe como camada auxiliar.

Ele oferece:

- `GET /health`
- API legacy de 'items' (desligada por padrão por segurança)
- endpoints protegidos para:
  - 'app_state'
  - 'app_state_versions'

Observação importante:

- hoje o fluxo principal da app é frontend + Supabase
- o backend local é opcional
- a API legacy de 'items' foi endurecida e fica bloqueada por padrão

## Variáveis de ambiente

Arquivo-base:

- ['sitezin sla/.env.example'](./sitezin%20sla/.env.example)

### Frontend

Obrigatórias para login/sync no Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Opcional:

- `VITE_ENABLE_WORKSPACES=false`

### Backend local

Usadas pelo Express / Postgres:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ALLOWED_ORIGINS`
- `ENABLE_UNSCOPED_ITEMS_API=false`

## Como rodar localmente

### Frontend

Na pasta da app:

```powershell
cd "C:\Users\Usuario\Desktop\site - react etc\sitezin sla"
npm ci
npm run dev
```

### Build local

```powershell
cd "C:\Users\Usuario\Desktop\site - react etc\sitezin sla"
npm run build
```

### Backend local

```powershell
cd "C:\Users\Usuario\Desktop\site - react etc\sitezin sla\server"
npm ci
npm run dev
```

### Docker Compose

Arquivo:

- ['sitezin sla/docker-compose.yml'](./sitezin%20sla/docker-compose.yml)

Objetivo:

- subir PostgreSQL
- subir backend local

## Scripts importantes

### Frontend

Arquivo:

- ['sitezin sla/package.json'](./sitezin%20sla/package.json)

Scripts principais:

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run check:encoding`
- `npm run fix:ptbr`

O `check:encoding` roda antes de `dev` e `build` para impedir que texto corrompido entre no bundle.

### Backend local

Arquivo:

- ['sitezin sla/server/package.json'](./sitezin%20sla/server/package.json)

Scripts:

- `npm run start`
- `npm run dev`

## Deploy

Configuração:

- ['wrangler.jsonc'](./wrangler.jsonc)

O deploy usa a raiz do repositório, mas publica os assets gerados em:

- 'sitezin sla/dist'

### Fluxo atual de deploy

1. a Cloudflare clona o repositório
2. o frontend é buildado dentro de 'sitezin sla'
3. o `wrangler deploy` publica os assets de 'dist'

Comando de deploy que costuma funcionar bem na Cloudflare:

```bash
npm ci --prefix "./sitezin sla" && npm run build --prefix "./sitezin sla" && npx wrangler deploy
```

Observações:

- `Root directory`: `/`
- o 'wrangler.jsonc' está na raiz
- os secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` precisam estar configurados na Cloudflare

## Decisões importantes de arquitetura

### 1. Shell React + núcleo legado

O projeto ainda não é uma SPA 100% React.

Isso significa:

- React monta e protege a shell
- módulos legados ainda fazem muito do trabalho interno

Essa divisão funciona, mas exige cuidado ao mexer em:

- inicialização
- ordem do boot
- sincronização entre DOM legado e estado React

### 2. Local-first

A app foi desenhada para continuar utilizável mesmo quando o sync remoto falha.

Consequências:

- o `localStorage` continua importante
- o status de sincronização precisa ser tratado com cuidado
- histórico de versões ajuda na recuperação

### 3. Segurança

Há duas camadas de proteção:

1. RLS no Supabase
2. validação de usuário/escopo no backend local

Isso é importante porque o projeto lida com:

- dados de perfil
- itens privados
- histórico de estado

## Arquivos que valem atenção ao editar

- ['sitezin sla/src/App.jsx'](./sitezin%20sla/src/App.jsx)
  - shell, login, layout base, montagem da app
- ['sitezin sla/src/legacy/storage.js'](./sitezin%20sla/src/legacy/storage.js)
  - persistência, sync, notificações, versões
- ['sitezin sla/src/legacy/bootstrap.js'](./sitezin%20sla/src/legacy/bootstrap.js)
  - modais, binds, busca, perfil, shell
- ['sitezin sla/src/legacy/app.js'](./sitezin%20sla/src/legacy/app.js)
  - render das eras, modais de item, telas internas
- ['sitezin sla/src/legacy/repositorios.js'](./sitezin%20sla/src/legacy/repositorios.js)
  - dashboard GitHub e destaques da home
- ['sitezin sla/src/styles/style.css'](./sitezin%20sla/src/styles/style.css)
  - estilos globais e responsividade

## Resumo prático

Se você for mexer no projeto no dia a dia, a ordem mental útil é:

1. 'App.jsx' monta a shell e autentica
2. 'storage.js' hidrata o estado e controla sync
3. 'app.js' renderiza as eras
4. 'bootstrap.js' pluga interações
5. 'repositorios.js' cuida da home/GitHub
6. 'style.css' amarra a camada visual

Se você estiver fazendo deploy:

1. builda o frontend em 'sitezin sla'
2. garante que 'dist' foi gerado
3. publica com `wrangler deploy`

Se você estiver resolvendo bug de dados:

1. olha 'storage.js'
2. confirma estado local
3. confirma estado remoto no Supabase
4. só depois mexe na UI
