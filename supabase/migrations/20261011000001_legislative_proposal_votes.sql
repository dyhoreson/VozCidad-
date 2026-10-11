create table if not exists public.legislative_proposal_votes (
  proposal_id bigint not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('favoravel', 'desfavoravel', 'nulo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (proposal_id, user_id)
);

create index if not exists legislative_proposal_votes_proposal_idx
  on public.legislative_proposal_votes (proposal_id, vote_type);

alter table public.legislative_proposal_votes enable row level security;

drop policy if exists legislative_proposal_votes_self_read on public.legislative_proposal_votes;
create policy legislative_proposal_votes_self_read
  on public.legislative_proposal_votes for select to authenticated
  using (user_id = auth.uid() or public.has_profile_role(array['admin']));

drop policy if exists legislative_proposal_votes_insert_self on public.legislative_proposal_votes;
create policy legislative_proposal_votes_insert_self
  on public.legislative_proposal_votes for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists legislative_proposal_votes_update_self on public.legislative_proposal_votes;
create policy legislative_proposal_votes_update_self
  on public.legislative_proposal_votes for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace view public.legislative_proposal_vote_totals
  with (security_invoker = false) as
  select proposal_id,
    count(*) filter (where vote_type = 'favoravel')::integer as favor,
    count(*) filter (where vote_type = 'desfavoravel')::integer as against,
    count(*) filter (where vote_type = 'nulo')::integer as nulo
  from public.legislative_proposal_votes
  group by proposal_id;

grant select on public.legislative_proposal_vote_totals to anon, authenticated;
grant select on public.legislative_proposal_votes to authenticated;
grant insert, update on public.legislative_proposal_votes to authenticated;
