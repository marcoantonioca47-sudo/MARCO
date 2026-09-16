-- DULEO: Supabase Auth + login por nome de usuário + permissões por filial.
-- Execute este arquivo no Supabase SQL Editor.
-- Nunca coloque a service_role/secret key no navegador.

create table if not exists public.duleo_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  usuario text,
  tipo text not null default 'usuario' check (tipo in ('autor','usuario','gestor')),
  created_at timestamptz not null default now()
);

alter table public.duleo_profiles add column if not exists usuario text;
update public.duleo_profiles set usuario=upper(trim(nome)) where usuario is null or trim(usuario)='';
alter table public.duleo_profiles alter column usuario set not null;
create unique index if not exists duleo_profiles_usuario_lower_idx on public.duleo_profiles(lower(usuario));

create table if not exists public.duleo_branches (
  id text primary key,
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.duleo_user_branches (
  user_id uuid not null references auth.users(id) on delete cascade,
  filial_id text not null references public.duleo_branches(id) on delete cascade,
  primary key (user_id, filial_id)
);

create table if not exists public.duleo_data (
  filial_id text not null references public.duleo_branches(id) on delete cascade,
  data_key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (filial_id, data_key)
);

create index if not exists duleo_user_branches_user_idx on public.duleo_user_branches(user_id);
create index if not exists duleo_data_branch_idx on public.duleo_data(filial_id);

create schema if not exists private;

create or replace function private.duleo_is_author()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.duleo_profiles p where p.id=(select auth.uid()) and p.tipo='autor');
$$;
revoke all on function private.duleo_is_author() from public;
grant execute on function private.duleo_is_author() to authenticated;

-- Resolve o nome de usuário para o e-mail interno usado pelo Supabase Auth.
-- A função não exige que o visitante esteja autenticado.
create or replace function public.duleo_login_email(p_usuario text)
returns table(email text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email::text
  from auth.users u
  join public.duleo_profiles p on p.id=u.id
  where lower(p.usuario)=lower(trim(p_usuario))
    and u.email is not null
  limit 1;
$$;
revoke all on function public.duleo_login_email(text) from public;
grant execute on function public.duleo_login_email(text) to anon, authenticated;

alter table public.duleo_profiles enable row level security;
alter table public.duleo_branches enable row level security;
alter table public.duleo_user_branches enable row level security;
alter table public.duleo_data enable row level security;

revoke all on public.duleo_profiles from anon;
revoke all on public.duleo_branches from anon;
revoke all on public.duleo_user_branches from anon;
revoke all on public.duleo_data from anon;

grant select, insert, update on public.duleo_profiles to authenticated;
grant select on public.duleo_branches to authenticated;
grant select on public.duleo_user_branches to authenticated;
grant select, insert, update, delete on public.duleo_data to authenticated;

drop policy if exists "DULEO profile own read" on public.duleo_profiles;
create policy "DULEO profile own read" on public.duleo_profiles for select to authenticated using (id=(select auth.uid()));
drop policy if exists "DULEO profile own insert" on public.duleo_profiles;
create policy "DULEO profile own insert" on public.duleo_profiles for insert to authenticated with check (id=(select auth.uid()));
drop policy if exists "DULEO profile own update" on public.duleo_profiles;
create policy "DULEO profile own update" on public.duleo_profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));

drop policy if exists "DULEO branch authenticated read" on public.duleo_branches;
create policy "DULEO branch authenticated read" on public.duleo_branches for select to authenticated using (ativo=true);

drop policy if exists "DULEO membership own read" on public.duleo_user_branches;
create policy "DULEO membership own read" on public.duleo_user_branches for select to authenticated using (user_id=(select auth.uid()) or (select private.duleo_is_author()));

drop policy if exists "DULEO data branch read" on public.duleo_data;
create policy "DULEO data branch read" on public.duleo_data for select to authenticated using ((select private.duleo_is_author()) or exists(select 1 from public.duleo_user_branches b where b.user_id=(select auth.uid()) and b.filial_id=duleo_data.filial_id));
drop policy if exists "DULEO data branch insert" on public.duleo_data;
create policy "DULEO data branch insert" on public.duleo_data for insert to authenticated with check ((select private.duleo_is_author()) or exists(select 1 from public.duleo_user_branches b where b.user_id=(select auth.uid()) and b.filial_id=duleo_data.filial_id));
drop policy if exists "DULEO data branch update" on public.duleo_data;
create policy "DULEO data branch update" on public.duleo_data for update to authenticated using ((select private.duleo_is_author()) or exists(select 1 from public.duleo_user_branches b where b.user_id=(select auth.uid()) and b.filial_id=duleo_data.filial_id)) with check ((select private.duleo_is_author()) or exists(select 1 from public.duleo_user_branches b where b.user_id=(select auth.uid()) and b.filial_id=duleo_data.filial_id));
drop policy if exists "DULEO data branch delete" on public.duleo_data;
create policy "DULEO data branch delete" on public.duleo_data for delete to authenticated using ((select private.duleo_is_author()) or exists(select 1 from public.duleo_user_branches b where b.user_id=(select auth.uid()) and b.filial_id=duleo_data.filial_id));

-- CONFIGURAÇÃO DO MARCO:
-- 1) Authentication > Users: crie/tenha um usuário com e-mail e senha forte.
-- 2) Execute, trocando SEU_EMAIL pelo e-mail real da conta:
-- insert into public.duleo_profiles(id,nome,usuario,tipo)
-- select id,'MARCO','MARCO','autor' from auth.users where email='SEU_EMAIL'
-- on conflict(id) do update set nome='MARCO',usuario='MARCO',tipo='autor';
-- 3) Cadastre as filiais em duleo_branches e vincule-as ao MARCO:
-- insert into public.duleo_user_branches(user_id,filial_id)
-- select id,'ID_DA_FILIAL' from auth.users where email='SEU_EMAIL'
-- on conflict do nothing;
-- Como MARCO é autor, o aplicativo permitirá visualizar todas as filiais ativas.

-- Usuário comum:
-- insert into public.duleo_profiles(id,nome,usuario,tipo) values ('UUID','Nome','usuario','usuario');
-- insert into public.duleo_user_branches(user_id,filial_id) values ('UUID','ID_DA_FILIAL');
