  -- Execute este SQL no Supabase Dashboard > SQL Editor
  -- Objetivo:
  -- 1) garantir que cada usuario so leia/escreva o proprio estado
  -- 2) impedir vazamento entre usuarios via anon/authenticated
  -- 3) manter o schema compativel com o frontend atual

  -- Tabela de estado do app (snapshot completo do frontend)
  create table if not exists public.app_state (
    id serial primary key,
    scope uuid unique not null,
    state jsonb not null default '{}'::jsonb,
    updated_at timestamp with time zone default now()
  );

  -- Historico de versoes para rollback
  create table if not exists public.app_state_versions (
    id bigserial primary key,
    scope uuid not null,
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
    and scope::text = auth.uid()::text
  );

  create policy "app_state_insert_own"
  on public.app_state
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and scope::text = auth.uid()::text
  );

  create policy "app_state_update_own"
  on public.app_state
  for update
  to authenticated
  using (
    auth.uid() is not null
    and scope::text = auth.uid()::text
  )
  with check (
    auth.uid() is not null
    and scope::text = auth.uid()::text
  );

  create policy "app_state_delete_own"
  on public.app_state
  for delete
  to authenticated
  using (
    auth.uid() is not null
    and scope::text = auth.uid()::text
  );

  create policy "app_state_versions_select_own"
  on public.app_state_versions
  for select
  to authenticated
  using (
    auth.uid() is not null
    and scope::text = auth.uid()::text
  );

  create policy "app_state_versions_insert_own"
  on public.app_state_versions
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and scope::text = auth.uid()::text
  );

  create policy "app_state_versions_update_own"
  on public.app_state_versions
  for update
  to authenticated
  using (
    auth.uid() is not null
    and scope::text = auth.uid()::text
  )
  with check (
    auth.uid() is not null
    and scope::text = auth.uid()::text
  );

  create policy "app_state_versions_delete_own"
  on public.app_state_versions
  for delete
  to authenticated
  using (
    auth.uid() is not null
    and scope::text = auth.uid()::text
  );

  -- Mantem updated_at consistente sem depender do frontend/backend.
  create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

  drop trigger if exists trg_app_state_set_updated_at on public.app_state;
  create trigger trg_app_state_set_updated_at
  before update on public.app_state
  for each row
  execute function public.set_updated_at();

  -- Limpeza opcional de historico para controlar crescimento da tabela.
  -- Uso:
  -- select public.prune_app_state_versions();
  -- select public.prune_app_state_versions(100, interval '365 days');
  create or replace function public.prune_app_state_versions(
    p_keep_per_scope integer default 50,
    p_max_age interval default interval '180 days'
  )
  returns integer
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_deleted integer := 0;
  begin
    if p_keep_per_scope < 1 then
      raise exception 'p_keep_per_scope deve ser >= 1';
    end if;

    with ranked as (
      select
        id,
        scope,
        created_at,
        row_number() over (partition by scope order by created_at desc, id desc) as rn
      from public.app_state_versions
    ),
    to_delete as (
      select id
      from ranked
      where rn > p_keep_per_scope
         or created_at < now() - p_max_age
    )
    delete from public.app_state_versions v
    using to_delete d
    where v.id = d.id;

    get diagnostics v_deleted = row_count;
    return v_deleted;
  end;
  $$;

  -- Migracao segura de scope TEXT/VARCHAR para UUID.
  -- O cast so acontece quando todos os valores sao convertiveis, evitando quebra parcial.
  do $$
  declare
    v_app_state_data_type text;
    v_versions_data_type text;
    v_invalid_count integer;
  begin
    select c.data_type
    into v_app_state_data_type
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'app_state'
      and c.column_name = 'scope';

    if v_app_state_data_type <> 'uuid' then
      -- Normaliza legados no formato <uuid>:default quando aplicavel.
      update public.app_state
      set scope = split_part(scope::text, ':', 1)
      where scope::text like '%:%'
        and split_part(scope::text, ':', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

      select count(*)
      into v_invalid_count
      from public.app_state
      where scope::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

      if v_invalid_count = 0 then
        alter table public.app_state
          alter column scope type uuid using scope::uuid;
      else
        raise notice 'app_state.scope nao convertido para UUID: % valor(es) invalidos.', v_invalid_count;
      end if;
    end if;

    select c.data_type
    into v_versions_data_type
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'app_state_versions'
      and c.column_name = 'scope';

    if v_versions_data_type <> 'uuid' then
      update public.app_state_versions
      set scope = split_part(scope::text, ':', 1)
      where scope::text like '%:%'
        and split_part(scope::text, ':', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

      select count(*)
      into v_invalid_count
      from public.app_state_versions
      where scope::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

      if v_invalid_count = 0 then
        alter table public.app_state_versions
          alter column scope type uuid using scope::uuid;
      else
        raise notice 'app_state_versions.scope nao convertido para UUID: % valor(es) invalidos.', v_invalid_count;
      end if;
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'app_state_scope_uuid_v4_like'
    ) and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'app_state'
        and column_name = 'scope'
        and data_type <> 'uuid'
    ) and not exists (
      select 1
      from public.app_state
      where scope::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ) then
      alter table public.app_state
        add constraint app_state_scope_uuid_v4_like
        check (scope::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'app_state_versions_scope_uuid_v4_like'
    ) and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'app_state_versions'
        and column_name = 'scope'
        and data_type <> 'uuid'
    ) and not exists (
      select 1
      from public.app_state_versions
      where scope::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ) then
      alter table public.app_state_versions
        add constraint app_state_versions_scope_uuid_v4_like
        check (scope::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');
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
  -- where scope::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
  --
  -- select scope from public.app_state_versions
  -- where scope::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
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

  -- ---------- Polaroom Media Storage (Lover) ----------
  insert into storage.buckets (id, name, public)
  values ('polaroom-media', 'polaroom-media', true)
  on conflict (id) do nothing;

  drop policy if exists "polaroom_media_select_own" on storage.objects;
  drop policy if exists "polaroom_media_insert_own" on storage.objects;
  drop policy if exists "polaroom_media_update_own" on storage.objects;
  drop policy if exists "polaroom_media_delete_own" on storage.objects;

  create policy "polaroom_media_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'polaroom-media'
    and auth.uid() is not null
    and name like auth.uid()::text || '/%'
  );

  create policy "polaroom_media_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'polaroom-media'
    and auth.uid() is not null
    and name like auth.uid()::text || '/%'
  );

  create policy "polaroom_media_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'polaroom-media'
    and auth.uid() is not null
    and name like auth.uid()::text || '/%'
  )
  with check (
    bucket_id = 'polaroom-media'
    and auth.uid() is not null
    and name like auth.uid()::text || '/%'
  );

  create policy "polaroom_media_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'polaroom-media'
    and auth.uid() is not null
    and name like auth.uid()::text || '/%'
  );
