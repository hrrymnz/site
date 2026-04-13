# Projeto - Fluxo Atual

## Stack oficial
- Frontend: Vite + React
- Backend de dados e auth: Supabase
- Deploy: Cloudflare

## Observacoes importantes
- Docker nao faz parte do fluxo atual deste repositorio.
- O backend Node em server/ existe para uso local opcional (localhost), nao como caminho principal de deploy.

## Setup rapido
1. Copie .env.example para .env.
2. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
3. Execute npm install.
4. Execute npm run dev.

## Banco (Supabase)
- Use supabase-setup.sql no SQL Editor do projeto Supabase para aplicar tabelas, RLS e funcoes.

## Quando usar o backend Node local
- Apenas para testes locais especificos via localhost.
- Mantenha ENABLE_UNSCOPED_ITEMS_API=false por padrao.
