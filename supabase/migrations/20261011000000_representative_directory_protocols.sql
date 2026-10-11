alter table public.profiles
  add column if not exists uf text not null default 'RN';

alter table public.profiles
  drop constraint if exists profiles_uf_check;

alter table public.profiles
  add constraint profiles_uf_check check (uf ~ '^[A-Z]{2}$');

alter table public.protocols
  drop constraint if exists protocols_type_check;

alter table public.protocols
  add constraint protocols_type_check check (type in ('reclamacao', 'elogio', 'solicitacao', 'questionamento'));

alter table public.protocols
  add column if not exists due_at timestamptz;

update public.protocols
set due_at = created_at + interval '15 days'
where due_at is null;

alter table public.protocols
  alter column due_at set default (now() + interval '15 days'),
  alter column due_at set not null;

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

grant select on public.profiles to anon, authenticated;
