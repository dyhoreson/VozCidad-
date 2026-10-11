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
