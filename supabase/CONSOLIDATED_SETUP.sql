-- Voz Cidada RN - setup consolidado para Supabase SQL Editor
-- Em um projeto novo, crie primeiro o usuario dyhoreson.daniel@gmail.com em Authentication > Users,
-- confirme o e-mail e entao execute este arquivo inteiro uma unica vez.
-- A migration promove esse usuario a super_admin, caso ja exista.
-- Nao execute este arquivo como substituto de uma revisao de migrations em banco com dados.

-- ============================================================================
-- Consolidado de: supabase/migrations/20261007000000_initial_schema.sql
-- ============================================================================

-- Voz Cidadã RN — schema inicial para executar no Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'cidadao' check (role in ('cidadao','politico','empresa','admin')),
  municipio text,
  uf text not null default 'RN' check (uf ~ '^[A-Z]{2}$'),
  sector text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists sector text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, municipio)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), new.raw_user_meta_data->>'municipio')
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role is distinct from new.role
     and auth.uid() = old.id
     and coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'Role can only be changed by an administrator';
  end if;
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard before update on public.profiles for each row execute procedure public.guard_profile_role();

create or replace function public.has_profile_role(allowed_roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = any(allowed_roles));
$$;

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  category text not null,
  title text not null,
  description text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  municipality text not null,
  neighborhood text not null default '',
  status text not null default 'Aguardando Resposta' check (status in ('Aguardando Resposta','Em Reparo','Reparo Realizado','Improcedente')),
  image_url text,
  confirmations_count integer not null default 0 check (confirmations_count >= 0),
  official_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists incidents_created_at_idx on public.incidents (created_at desc);
create index if not exists incidents_assigned_to_idx on public.incidents (assigned_to, status);

create table if not exists public.incident_confirmations (
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (incident_id, user_id)
);

create or replace function public.bump_incident_confirmation_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.incidents set confirmations_count = confirmations_count + 1, updated_at = now() where id = new.incident_id;
    return new;
  end if;
  update public.incidents set confirmations_count = greatest(0, confirmations_count - 1), updated_at = now() where id = old.incident_id;
  return old;
end;
$$;
drop trigger if exists incident_confirmation_count_insert on public.incident_confirmations;
create trigger incident_confirmation_count_insert after insert on public.incident_confirmations for each row execute procedure public.bump_incident_confirmation_count();
drop trigger if exists incident_confirmation_count_delete on public.incident_confirmations;
create trigger incident_confirmation_count_delete after delete on public.incident_confirmations for each row execute procedure public.bump_incident_confirmation_count();

create table if not exists public.incident_status_history (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  status text not null check (status in ('Aguardando Resposta','Em Reparo','Reparo Realizado','Improcedente')),
  response text not null,
  created_at timestamptz not null default now()
);
create index if not exists incident_status_history_incident_idx on public.incident_status_history (incident_id, created_at desc);

create or replace function public.confirm_incident(p_incident_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare current_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.incident_confirmations (incident_id, user_id) values (p_incident_id, auth.uid());
  select confirmations_count into current_count from public.incidents where id = p_incident_id;
  if current_count is null then raise exception 'Incident not found'; end if;
  return current_count;
end;
$$;

create or replace function public.update_incident_status(p_incident_id uuid, p_status text, p_response text)
returns public.incidents language plpgsql security definer set search_path = public as $$
declare target public.incidents;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.has_profile_role(array['politico','empresa','admin']) then raise exception 'Institutional role required'; end if;
  if p_status not in ('Aguardando Resposta','Em Reparo','Reparo Realizado','Improcedente') then raise exception 'Invalid incident status'; end if;
  if nullif(trim(p_response),'') is null then raise exception 'A public response is required'; end if;
  update public.incidents i set status = p_status, official_response = trim(p_response), updated_at = now()
  where i.id = p_incident_id and (i.assigned_to = auth.uid() or public.has_profile_role(array['admin']))
  returning i.* into target;
  if target.id is null then raise exception 'Incident is not assigned to this profile'; end if;
  insert into public.incident_status_history (incident_id, actor_id, status, response)
  values (target.id, auth.uid(), p_status, trim(p_response));
  return target;
end;
$$;

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  author text not null,
  author_id uuid references public.profiles(id) on delete set null,
  document_url text,
  status text not null default 'Em tramitação' check (status in ('Em tramitação','Em votação','Votado')),
  created_at timestamptz not null default now()
);
create index if not exists bills_created_at_idx on public.bills (created_at desc);

create table if not exists public.bill_votes (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('favoravel','desfavoravel','nulo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bill_id, user_id)
);
create index if not exists bill_votes_bill_idx on public.bill_votes (bill_id, vote_type);
create or replace view public.bill_vote_totals with (security_invoker = false) as
  select bill_id,
    count(*) filter (where vote_type = 'favoravel')::integer as favor,
    count(*) filter (where vote_type = 'desfavoravel')::integer as against,
    count(*) filter (where vote_type = 'nulo')::integer as nulo
  from public.bill_votes group by bill_id;

create table if not exists public.protocols (
  id uuid primary key default gen_random_uuid(),
  protocol_number text not null unique default ('RN-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  user_id uuid not null references public.profiles(id) on delete restrict,
  recipient_id uuid not null references public.profiles(id) on delete restrict,
  type text not null check (type in ('reclamacao','elogio','solicitacao','questionamento')),
  subject text not null,
  message text not null,
  attachment_urls text[] not null default '{}',
  status text not null default 'enviado' check (status in ('enviado','lido','respondido','arquivado')),
  response text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  due_at timestamptz not null default (now() + interval '15 days'),
  updated_at timestamptz not null default now()
);
alter table public.protocols add column if not exists attachment_urls text[] not null default '{}';
alter table public.protocols add column if not exists due_at timestamptz not null default (now() + interval '15 days');
alter table public.protocols drop constraint if exists protocols_type_check;
alter table public.protocols add constraint protocols_type_check check (type in ('reclamacao','elogio','solicitacao','questionamento'));

create or replace function public.set_protocol_response_deadline()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  end if;
  new.due_at := new.created_at + interval '15 days';
  return new;
end;
$$;
drop trigger if exists protocols_response_deadline on public.protocols;
create trigger protocols_response_deadline
before insert or update on public.protocols
for each row execute function public.set_protocol_response_deadline();
create index if not exists protocols_user_idx on public.protocols (user_id, created_at desc);
create index if not exists protocols_recipient_idx on public.protocols (recipient_id, status, created_at desc);

create or replace function public.update_protocol(p_protocol_id uuid, p_status text, p_response text default null)
returns public.protocols language plpgsql security definer set search_path = public as $$
declare target public.protocols;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.has_profile_role(array['politico','empresa','admin']) then raise exception 'Institutional role required'; end if;
  if p_status not in ('lido','respondido','arquivado') then raise exception 'Invalid protocol status'; end if;
  if p_status = 'respondido' and nullif(trim(p_response),'') is null then raise exception 'Response text is required'; end if;
  update public.protocols p set status = p_status,
    response = case when p_status = 'respondido' then trim(p_response) else p.response end,
    responded_at = case when p_status = 'respondido' then now() else p.responded_at end,
    updated_at = now()
  where p.id = p_protocol_id and (p.recipient_id = auth.uid() or public.has_profile_role(array['admin']))
  returning p.* into target;
  if target.id is null then raise exception 'Protocol is not addressed to this profile'; end if;
  return target;
end;
$$;

create or replace function public.set_protocol_attachments(p_protocol_id uuid, p_paths text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.protocols set attachment_urls = coalesce(p_paths, '{}'), updated_at = now()
  where id = p_protocol_id and user_id = auth.uid();
  if not found then raise exception 'Protocol does not belong to this user'; end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_confirmations enable row level security;
alter table public.incident_status_history enable row level security;
alter table public.bills enable row level security;
alter table public.bill_votes enable row level security;
alter table public.protocols enable row level security;

drop policy if exists profiles_read_public_roles on public.profiles;
create policy profiles_read_public_roles on public.profiles for select using (id = auth.uid() or role in ('politico','empresa'));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update using (id = auth.uid() or public.has_profile_role(array['admin'])) with check (id = auth.uid() or public.has_profile_role(array['admin']));

drop policy if exists incidents_public_read on public.incidents;
create policy incidents_public_read on public.incidents for select using (true);
drop policy if exists incidents_authenticated_insert on public.incidents;
create policy incidents_authenticated_insert on public.incidents for insert to authenticated with check (user_id = auth.uid());
drop policy if exists incidents_assigned_update on public.incidents;
create policy incidents_assigned_update on public.incidents for update to authenticated using (assigned_to = auth.uid() or public.has_profile_role(array['admin'])) with check (assigned_to = auth.uid() or public.has_profile_role(array['admin']));

drop policy if exists incident_confirmations_read on public.incident_confirmations;
drop policy if exists incident_confirmations_self_read on public.incident_confirmations;
create policy incident_confirmations_self_read on public.incident_confirmations for select to authenticated using (user_id = auth.uid());
drop policy if exists incident_confirmations_insert_self on public.incident_confirmations;
create policy incident_confirmations_insert_self on public.incident_confirmations for insert to authenticated with check (user_id = auth.uid());
drop policy if exists incident_confirmations_delete_self on public.incident_confirmations;
create policy incident_confirmations_delete_self on public.incident_confirmations for delete to authenticated using (user_id = auth.uid());

drop policy if exists incident_history_public_read on public.incident_status_history;
create policy incident_history_public_read on public.incident_status_history for select using (true);

drop policy if exists bills_public_read on public.bills;
create policy bills_public_read on public.bills for select using (true);
drop policy if exists bills_institution_insert on public.bills;
create policy bills_institution_insert on public.bills for insert to authenticated with check (author_id = auth.uid() and public.has_profile_role(array['politico','empresa','admin']));
drop policy if exists bills_author_update on public.bills;
create policy bills_author_update on public.bills for update to authenticated using (author_id = auth.uid() or public.has_profile_role(array['admin'])) with check (author_id = auth.uid() or public.has_profile_role(array['admin']));

drop policy if exists bill_votes_public_read on public.bill_votes;
drop policy if exists bill_votes_self_read on public.bill_votes;
create policy bill_votes_self_read on public.bill_votes for select to authenticated using (user_id = auth.uid() or public.has_profile_role(array['admin']));
drop policy if exists bill_votes_insert_self on public.bill_votes;
create policy bill_votes_insert_self on public.bill_votes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists bill_votes_update_self on public.bill_votes;
create policy bill_votes_update_self on public.bill_votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists protocols_participant_read on public.protocols;
create policy protocols_participant_read on public.protocols for select to authenticated using (user_id = auth.uid() or recipient_id = auth.uid() or public.has_profile_role(array['admin']));
drop policy if exists protocols_sender_insert on public.protocols;
create policy protocols_sender_insert on public.protocols for insert to authenticated with check (user_id = auth.uid());

revoke all on function public.confirm_incident(uuid) from public;
grant execute on function public.confirm_incident(uuid) to authenticated;
revoke all on function public.update_incident_status(uuid,text,text) from public;
grant execute on function public.update_incident_status(uuid,text,text) to authenticated;
revoke all on function public.update_protocol(uuid,text,text) from public;
grant execute on function public.update_protocol(uuid,text,text) to authenticated;
revoke all on function public.set_protocol_attachments(uuid,text[]) from public;
grant execute on function public.set_protocol_attachments(uuid,text[]) to authenticated;

grant select on public.profiles, public.incidents, public.incident_confirmations, public.incident_status_history, public.bills, public.bill_votes to anon, authenticated;
grant select on public.bill_vote_totals to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant insert on public.incidents, public.incident_confirmations, public.protocols, public.bill_votes to authenticated;
grant update, delete on public.incident_confirmations to authenticated;
grant update on public.bills, public.bill_votes to authenticated;

-- Anexos: crie os buckets no Storage se desejar habilitar upload direto do cliente.
insert into storage.buckets (id, name, public) values
  ('incident-images','incident-images',true),
  ('bill-documents','bill-documents',true),
  ('protocol-attachments','protocol-attachments',false)
on conflict (id) do nothing;

drop policy if exists incident_images_public_read on storage.objects;
create policy incident_images_public_read on storage.objects for select using (bucket_id = 'incident-images');
drop policy if exists incident_images_owner_upload on storage.objects;
create policy incident_images_owner_upload on storage.objects for insert to authenticated with check (bucket_id = 'incident-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists bill_documents_public_read on storage.objects;
create policy bill_documents_public_read on storage.objects for select using (bucket_id = 'bill-documents');
drop policy if exists bill_documents_institution_upload on storage.objects;
create policy bill_documents_institution_upload on storage.objects for insert to authenticated with check (bucket_id = 'bill-documents' and (storage.foldername(name))[1] = auth.uid()::text and public.has_profile_role(array['politico','empresa','admin']));
drop policy if exists protocol_attachments_participant_read on storage.objects;
create policy protocol_attachments_participant_read on storage.objects for select to authenticated using (bucket_id = 'protocol-attachments' and exists (select 1 from public.protocols p where p.id::text = (storage.foldername(name))[1] and (p.user_id = auth.uid() or p.recipient_id = auth.uid() or public.has_profile_role(array['admin']))));
drop policy if exists protocol_attachments_sender_upload on storage.objects;
create policy protocol_attachments_sender_upload on storage.objects for insert to authenticated with check (bucket_id = 'protocol-attachments' and exists (select 1 from public.protocols p where p.id::text = (storage.foldername(name))[1] and p.user_id = auth.uid()));


-- ============================================================================
-- Consolidado de: frontend/VozCidada/supabase/migrations/20261007_gamification_admin.sql
-- ============================================================================

-- Run after creating the designated super admin auth account.
alter table public.profiles add column if not exists points integer not null default 0 check (points >= 0);
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('cidadao','politico','empresa','admin','super_admin'));

insert into public.profiles (id, full_name, role)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Super administrador'), 'super_admin'
from auth.users u where lower(u.email) = 'dyhoreson.daniel@gmail.com'
on conflict (id) do update set role = 'super_admin';

create table if not exists public.incident_point_awards (
  incident_id uuid primary key references public.incidents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null default 100 check (points > 0),
  awarded_at timestamptz not null default now()
);
alter table public.incident_point_awards enable row level security;
drop policy if exists incident_point_awards_read_own on public.incident_point_awards;
create policy incident_point_awards_read_own on public.incident_point_awards for select to authenticated using (user_id = auth.uid());

create or replace function public.credit_completed_incident()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'Reparo Realizado' and old.status is distinct from new.status then
    insert into public.incident_point_awards (incident_id, user_id, points)
    values (new.id, new.user_id, 100) on conflict (incident_id) do nothing;
    if found then update public.profiles set points = points + 100 where id = new.user_id; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists award_points_for_completed_incident on public.incidents;
create trigger award_points_for_completed_incident after update of status on public.incidents
for each row execute function public.credit_completed_incident();


-- ============================================================================
-- Consolidado de: frontend/VozCidada/supabase/migrations/20261008_incident_award_50.sql
-- ============================================================================

-- Keep point awards atomic with the status transition and award 50 points once per incident.
alter table public.incident_point_awards alter column points set default 50;

create or replace function public.credit_completed_incident()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'Reparo Realizado' and old.status is distinct from new.status then
    insert into public.incident_point_awards (incident_id, user_id, points)
    values (new.id, new.user_id, 50) on conflict (incident_id) do nothing;
    if found then update public.profiles set points = points + 50 where id = new.user_id; end if;
  end if;
  return new;
end;
$$;


-- ============================================================================
-- Consolidado de: frontend/VozCidada/supabase/migrations/20261009_profiles_politicians.sql
-- ============================================================================

alter table public.profiles
  add column if not exists avatar_url text;

create table if not exists public.profile_private (
  id uuid primary key references public.profiles(id) on delete cascade,
  age integer check (age is null or age between 16 and 120),
  address text,
  cep text,
  updated_at timestamptz not null default now()
);
alter table public.profile_private enable row level security;
drop policy if exists profile_private_read_own on public.profile_private;
create policy profile_private_read_own on public.profile_private for select to authenticated using (id = auth.uid());
drop policy if exists profile_private_insert_own on public.profile_private;
create policy profile_private_insert_own on public.profile_private for insert to authenticated with check (id = auth.uid());
drop policy if exists profile_private_update_own on public.profile_private;
create policy profile_private_update_own on public.profile_private for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
grant select, insert, update on public.profile_private to authenticated;

insert into public.profile_private (id, age, address, cep)
select id, nullif(raw_user_meta_data->>'age', '')::integer, raw_user_meta_data->>'address', raw_user_meta_data->>'cep'
from auth.users on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, municipio, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.raw_user_meta_data->>'municipio',
    new.raw_user_meta_data->>'avatar_url'
  ) on conflict (id) do nothing;
  insert into public.profile_private (id, age, address, cep)
  values (new.id, nullif(new.raw_user_meta_data->>'age', '')::integer, new.raw_user_meta_data->>'address', new.raw_user_meta_data->>'cep')
  on conflict (id) do nothing;
  return new;
end;
$$;

insert into storage.buckets (id, name, public) values ('profile-avatars','profile-avatars',true) on conflict (id) do nothing;
drop policy if exists profile_avatars_public_read on storage.objects;
create policy profile_avatars_public_read on storage.objects for select using (bucket_id = 'profile-avatars');
drop policy if exists profile_avatars_owner_upload on storage.objects;
create policy profile_avatars_owner_upload on storage.objects for insert to authenticated with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists profile_avatars_owner_update on storage.objects;
create policy profile_avatars_owner_update on storage.objects for update to authenticated using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists profile_avatars_owner_delete on storage.objects;
create policy profile_avatars_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.politician_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  party text,
  party_color text,
  current_office text,
  current_term_start date,
  current_term_end date,
  previous_offices jsonb not null default '[]'::jsonb,
  last_election_votes integer,
  biography text,
  photo_url text,
  updated_at timestamptz not null default now()
);
create table if not exists public.approved_projects (
  id uuid primary key default gen_random_uuid(),
  politician_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  summary text,
  approved_at date not null,
  created_at timestamptz not null default now()
);
create table if not exists public.parliamentary_amendments (
  id uuid primary key default gen_random_uuid(),
  politician_id uuid not null references public.profiles(id) on delete cascade,
  period text not null,
  amount numeric(14,2) not null check (amount >= 0),
  destination text not null,
  municipality text,
  category text,
  event_name text,
  created_at timestamptz not null default now()
);
alter table public.politician_details enable row level security;
alter table public.approved_projects enable row level security;
alter table public.parliamentary_amendments enable row level security;
drop policy if exists politician_details_public_read on public.politician_details;
create policy politician_details_public_read on public.politician_details for select using (true);
drop policy if exists approved_projects_public_read on public.approved_projects;
create policy approved_projects_public_read on public.approved_projects for select using (true);
drop policy if exists amendments_public_read on public.parliamentary_amendments;
create policy amendments_public_read on public.parliamentary_amendments for select using (true);
grant select on public.politician_details, public.approved_projects, public.parliamentary_amendments to anon, authenticated;


-- ============================================================================
-- Consolidado de: frontend/VozCidada/supabase/migrations/20261010_politicians_waze_profile.sql
-- ============================================================================

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
