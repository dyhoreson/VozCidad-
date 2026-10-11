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
