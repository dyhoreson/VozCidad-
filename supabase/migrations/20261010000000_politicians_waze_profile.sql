-- Esquema cívico complementar. Execute após schema.sql e
-- 20261009_profiles_politicians.sql no SQL Editor do Supabase.

-- O diretório público usa perfis autenticados como identidade dos políticos.
-- Assim, politicians.id é o mesmo UUID de profiles.id.
create table if not exists public.politicians (
  id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null default '',
  party text,
  current_office text,
  office_period text,
  previous_offices jsonb not null default '[]'::jsonb,
  approved_projects jsonb not null default '[]'::jsonb,
  last_election_votes integer check (last_election_votes is null or last_election_votes >= 0),
  photo_url text,
  created_at timestamptz not null default now()
);

-- Migra perfis políticos existentes sem sobrescrever registros já cadastrados.
insert into public.politicians (id, full_name, party, current_office,
  office_period, previous_offices, last_election_votes, photo_url)
select p.id, p.full_name, d.party, d.current_office,
  case
    when d.current_term_start is null and d.current_term_end is null then null
    else concat_ws(' a ', d.current_term_start::text, d.current_term_end::text)
  end,
  coalesce(d.previous_offices, '[]'::jsonb), d.last_election_votes,
  coalesce(d.photo_url, p.avatar_url)
from public.profiles p
left join public.politician_details d on d.profile_id = p.id
where p.role = 'politico'
on conflict (id) do nothing;

alter table public.politicians enable row level security;
drop policy if exists politicians_public_read on public.politicians;
create policy politicians_public_read on public.politicians
  for select to anon, authenticated using (true);
grant select on public.politicians to anon, authenticated;

-- A idade, o endereço e o CEP são dados pessoais. Permanecem em profile_private,
-- protegidos por RLS de proprietário, em vez de serem expostos no perfil público.
create table if not exists public.profile_private (
  id uuid primary key references public.profiles(id) on delete cascade,
  age integer check (age is null or age between 16 and 120),
  cep text,
  address text,
  updated_at timestamptz not null default now()
);
alter table public.profile_private add column if not exists age integer;
alter table public.profile_private add column if not exists cep text;
alter table public.profile_private add column if not exists address text;
alter table public.profile_private enable row level security;
drop policy if exists profile_private_read_own on public.profile_private;
create policy profile_private_read_own on public.profile_private
  for select to authenticated using (id = auth.uid());
drop policy if exists profile_private_insert_own on public.profile_private;
create policy profile_private_insert_own on public.profile_private
  for insert to authenticated with check (id = auth.uid());
drop policy if exists profile_private_update_own on public.profile_private;
create policy profile_private_update_own on public.profile_private
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
grant select, insert, update on public.profile_private to authenticated;

alter table public.profiles add column if not exists avatar_url text;

-- category continua text para aceitar os rótulos legados da aplicação e os slugs
-- novos: alagamento, poda_arvore, semaforo_quebrado e acidente_transito.
alter table public.incidents alter column category type text using category::text;
comment on column public.incidents.category is
  'Categoria textual do reporte; aceita alagamento, poda_arvore, semaforo_quebrado e acidente_transito, além das categorias legadas.';

-- Cria ou estende a tabela já usada pelo frontend. As colunas amount/destination,
-- category/event_name são mantidas por compatibilidade com versões existentes.
create table if not exists public.parliamentary_amendments (
  id uuid primary key default gen_random_uuid(),
  politician_id uuid not null references public.politicians(id) on delete cascade,
  period text not null,
  amount_value numeric(14,2) not null check (amount_value >= 0),
  destination_type text not null,
  description text not null,
  municipality text,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  destination text not null default '',
  category text,
  event_name text,
  created_at timestamptz not null default now()
);

alter table public.parliamentary_amendments
  add column if not exists amount_value numeric(14,2),
  add column if not exists destination_type text,
  add column if not exists description text;

-- Preenche os novos campos para instalações que já possuíam a tabela anterior.
update public.parliamentary_amendments
set amount_value = coalesce(amount_value, amount, 0),
    destination_type = coalesce(destination_type, category, 'outros'),
    description = coalesce(description, nullif(event_name, ''), nullif(destination, ''), 'Sem descrição cadastrada')
where amount_value is null or destination_type is null or description is null;

alter table public.parliamentary_amendments
  alter column amount_value set not null,
  alter column destination_type set not null,
  alter column description set not null;

-- Vincula também a politicians. NOT VALID preserva linhas antigas; a constraint
-- passa a validar novos vínculos e pode ser validada após a revisão dos dados.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'parliamentary_amendments_politician_directory_fkey'
      and conrelid = 'public.parliamentary_amendments'::regclass
  ) then
    alter table public.parliamentary_amendments
      add constraint parliamentary_amendments_politician_directory_fkey
      foreign key (politician_id) references public.politicians(id)
      on delete cascade not valid;
  end if;
end $$;

alter table public.parliamentary_amendments enable row level security;
drop policy if exists amendments_public_read on public.parliamentary_amendments;
create policy amendments_public_read on public.parliamentary_amendments
  for select to anon, authenticated using (true);
grant select on public.parliamentary_amendments to anon, authenticated;

create index if not exists parliamentary_amendments_politician_period_idx
  on public.parliamentary_amendments (politician_id, period desc);
