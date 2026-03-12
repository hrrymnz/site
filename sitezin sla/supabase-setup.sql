  -- Execute este SQL no Supabase Dashboard > SQL Editor
  -- Objetivo:
  -- 1) garantir que cada usuario so leia/escreva o proprio estado
  -- 2) impedir vazamento entre usuarios via anon/authenticated
  -- 3) manter o schema compativel com o frontend atual

  -- Tabela de estado do app (snapshot completo do frontend)
  create table if not exists public.app_state (
    id serial primary key,
    scope varchar(100) unique not null,
    state jsonb not null default '{}'::jsonb,
    updated_at timestamp with time zone default now()
  );

  -- Historico de versoes para rollback
  create table if not exists public.app_state_versions (
    id bigserial primary key,
    scope varchar(100) not null,
    state jsonb not null,
    label varchar(255),
    created_at timestamp with time zone default now()
  );

  -- Indexes
  create index if not exists idx_app_state_scope on public.app_state(scope);
  create index if not exists idx_app_state_versions_scope on public.app_state_versions(scope, created_at desc);

  -- RLS obrigatorio em tabelas expostas pelo schema public
  alter table public.app_state enable row level security;
  alter table public.app_state_versions enable row level security;

  -- Limpa policies antigas/permissivas
  drop policy if exists "Allow all on app_state" on public.app_state;
  drop policy if exists "Allow all on app_state_versions" on public.app_state_versions;
  drop policy if exists "User owns scope" on public.app_state;
  drop policy if exists "User owns version scope" on public.app_state_versions;
  drop policy if exists "app_state_select_own" on public.app_state;
  drop policy if exists "app_state_insert_own" on public.app_state;
  drop policy if exists "app_state_update_own" on public.app_state;
  drop policy if exists "app_state_delete_own" on public.app_state;
  drop policy if exists "app_state_versions_select_own" on public.app_state_versions;
  drop policy if exists "app_state_versions_insert_own" on public.app_state_versions;
  drop policy if exists "app_state_versions_update_own" on public.app_state_versions;
  drop policy if exists "app_state_versions_delete_own" on public.app_state_versions;

  -- Politicas explicitas por operacao.
  -- Recomendacao do Supabase: checar auth.uid() is not null e usar TO authenticated.
  create policy "app_state_select_own"
  on public.app_state
  for select
  to authenticated
  using (
    auth.uid() is not null
    and scope = auth.uid()::text
  );

  create policy "app_state_insert_own"
  on public.app_state
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and scope = auth.uid()::text
  );

  create policy "app_state_update_own"
  on public.app_state
  for update
  to authenticated
  using (
    auth.uid() is not null
    and scope = auth.uid()::text
  )
  with check (
    auth.uid() is not null
    and scope = auth.uid()::text
  );

  create policy "app_state_delete_own"
  on public.app_state
  for delete
  to authenticated
  using (
    auth.uid() is not null
    and scope = auth.uid()::text
  );

  create policy "app_state_versions_select_own"
  on public.app_state_versions
  for select
  to authenticated
  using (
    auth.uid() is not null
    and scope = auth.uid()::text
  );

  create policy "app_state_versions_insert_own"
  on public.app_state_versions
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and scope = auth.uid()::text
  );

  create policy "app_state_versions_update_own"
  on public.app_state_versions
  for update
  to authenticated
  using (
    auth.uid() is not null
    and scope = auth.uid()::text
  )
  with check (
    auth.uid() is not null
    and scope = auth.uid()::text
  );

  create policy "app_state_versions_delete_own"
  on public.app_state_versions
  for delete
  to authenticated
  using (
    auth.uid() is not null
    and scope = auth.uid()::text
  );

  -- Opcional, mas util para evitar escopos invalidos.
  -- Este passo so e aplicado automaticamente se nao houver linhas legadas.
  -- Se houver dados antigos (ex.: "<user_id>:default"), o bloco apenas ignora
  -- a criacao do CHECK para nao quebrar a execucao inteira do script.
  do $$
  begin
    if not exists (
      select 1
      from pg_constraint
      where conname = 'app_state_scope_uuid_like'
    ) and not exists (
      select 1
      from public.app_state
      where scope !~* '^[0-9a-f-]{36}$'
    ) then
      alter table public.app_state
        add constraint app_state_scope_uuid_like
        check (scope ~* '^[0-9a-f-]{36}$');
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'app_state_versions_scope_uuid_like'
    ) and not exists (
      select 1
      from public.app_state_versions
      where scope !~* '^[0-9a-f-]{36}$'
    ) then
      alter table public.app_state_versions
        add constraint app_state_versions_scope_uuid_like
        check (scope ~* '^[0-9a-f-]{36}$');
    end if;
  end $$;

  -- IMPORTANTE:
  -- Se voce tiver dados antigos com scope no formato "<user_id>:default",
  -- as policies acima vao bloquear leitura desses registros.
  -- Antes de depender desse RLS estrito, migre os escopos legados uma unica vez.
  --
  -- Diagnostico rapido:
  --
  -- select scope from public.app_state
  -- where scope !~* '^[0-9a-f-]{36}$';
  --
  -- select scope from public.app_state_versions
  -- where scope !~* '^[0-9a-f-]{36}$';
  --
  -- Exemplo de migracao (somente se workspaces estiverem desativados):
  --
  -- update public.app_state
  -- set scope = split_part(scope, ':', 1)
  -- where scope like '%:default';
  --
  -- update public.app_state_versions
  -- set scope = split_part(scope, ':', 1)
  -- where scope like '%:default';
