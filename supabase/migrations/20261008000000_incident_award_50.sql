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
