-- DULEO: autenticação online + permissões por filial
-- Execute no Supabase SQL Editor.
-- IMPORTANTE: crie primeiro o usuário MARCO em Authentication > Users.

create table if not exists public.duleo_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null default 'usuario' check (tipo in ('autor','usuario','gestor')),
  created_at timestamptz not null default now()
);

create table if not exists public.duleo_user_branches (
  user_id uuid not null references auth.users(id) on delete cascade,
  filial_id text not null,
  primary key (user_id, filial_id)
);

create table if not exists public.duleo_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  filial_id text not null,
  data_key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, filial_id, data_key)
);

alter table public.duleo_profiles enable row level security;
alter table public.duleo_user_branches enable row level security;
alter table public.duleo_data enable row level security;

drop policy if exists "DULEO profile own read" on public.duleo_profiles;
create policy "DULEO profile own read" on public.duleo_profiles
for select to authenticated using (id = auth.uid());

drop policy if exists "DULEO profile own insert" on public.duleo_profiles;
create policy "DULEO profile own insert" on public.duleo_profiles
for insert to authenticated with check (id = auth.uid());

drop policy if exists "DULEO branch own read" on public.duleo_user_branches;
create policy "DULEO branch own read" on public.duleo_user_branches
for select to authenticated using (user_id = auth.uid());

drop policy if exists "DULEO data branch read" on public.duleo_data;
create policy "DULEO data branch read" on public.duleo_data
for select to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.duleo_user_branches b
    where b.user_id = auth.uid() and b.filial_id = duleo_data.filial_id
  )
);

drop policy if exists "DULEO data branch insert" on public.duleo_data;
create policy "DULEO data branch insert" on public.duleo_data
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.duleo_user_branches b
    where b.user_id = auth.uid() and b.filial_id = duleo_data.filial_id
  )
);

drop policy if exists "DULEO data branch update" on public.duleo_data;
create policy "DULEO data branch update" on public.duleo_data
for update to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.duleo_user_branches b
    where b.user_id = auth.uid() and b.filial_id = duleo_data.filial_id
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.duleo_user_branches b
    where b.user_id = auth.uid() and b.filial_id = duleo_data.filial_id
  )
);

drop policy if exists "DULEO data branch delete" on public.duleo_data;
create policy "DULEO data branch delete" on public.duleo_data
for delete to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.duleo_user_branches b
    where b.user_id = auth.uid() and b.filial_id = duleo_data.filial_id
  )
);

-- Depois de criar o usuário MARCO, substitua o e-mail abaixo pelo e-mail dele.
-- O ID é obtido automaticamente do auth.users.
-- Exemplo:
-- insert into public.duleo_profiles (id,nome,tipo)
-- select id,'MARCO','autor' from auth.users where email='SEU_EMAIL';
-- insert into public.duleo_user_branches (user_id,filial_id)
-- select id,'ID_DA_FILIAL' from auth.users where email='SEU_EMAIL';

-- Para usuários comuns, crie o usuário em Authentication > Users e depois:
-- insert into public.duleo_profiles (id,nome,tipo) values ('UUID','NOME','usuario');
-- insert into public.duleo_user_branches (user_id,filial_id) values ('UUID','ID_DA_FILIAL');

-- O aplicativo usa Auth + RLS. A chave secreta/service_role NUNCA deve ir para o navegador.
