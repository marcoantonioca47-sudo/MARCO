-- DULEO: banco mínimo para sincronizar os dados do aplicativo
create table if not exists public.duleo_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.duleo_store enable row level security;

-- Como o DULEO usa a chave publishable no navegador, esta tabela precisa de
-- políticas para o cliente anon. Para produção, substitua o login local por
-- Supabase Auth e políticas por usuário.
drop policy if exists "DULEO anon read" on public.duleo_store;
drop policy if exists "DULEO anon insert" on public.duleo_store;
drop policy if exists "DULEO anon update" on public.duleo_store;

create policy "DULEO anon read"
on public.duleo_store for select to anon using (true);

create policy "DULEO anon insert"
on public.duleo_store for insert to anon with check (true);

create policy "DULEO anon update"
on public.duleo_store for update to anon using (true) with check (true);

create or replace function public.duleo_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists duleo_store_updated_at on public.duleo_store;
create trigger duleo_store_updated_at
before update on public.duleo_store
for each row execute function public.duleo_touch_updated_at();
