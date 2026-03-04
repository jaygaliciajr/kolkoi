create extension if not exists pgcrypto;

create table if not exists public.influencer_link_codes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  influencer_id uuid not null references public.influencers(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists influencer_link_codes_org_id_idx
  on public.influencer_link_codes(org_id);

create index if not exists influencer_link_codes_influencer_id_idx
  on public.influencer_link_codes(influencer_id);

create index if not exists influencer_link_codes_code_idx
  on public.influencer_link_codes(code);

alter table public.influencer_link_codes enable row level security;

drop policy if exists "admin_select_link_codes" on public.influencer_link_codes;
create policy "admin_select_link_codes"
on public.influencer_link_codes
for select
to authenticated
using (
  exists (
    select 1
    from public.org_members m
    where m.org_id = influencer_link_codes.org_id
      and m.user_id = auth.uid()
      and coalesce(m.role, m.role_type) in ('org_admin', 'campaign_manager', 'finance')
  )
);

drop policy if exists "admin_insert_link_codes" on public.influencer_link_codes;
create policy "admin_insert_link_codes"
on public.influencer_link_codes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.org_members m
    where m.org_id = influencer_link_codes.org_id
      and m.user_id = auth.uid()
      and coalesce(m.role, m.role_type) in ('org_admin', 'campaign_manager', 'finance')
  )
);

drop policy if exists "influencer_redeem_link_codes_select" on public.influencer_link_codes;
create policy "influencer_redeem_link_codes_select"
on public.influencer_link_codes
for select
to authenticated
using (
  used_at is null
  and expires_at > now()
  and exists (
    select 1
    from public.influencers i
    where i.id = influencer_link_codes.influencer_id
      and i.org_id = influencer_link_codes.org_id
  )
);

drop policy if exists "influencer_redeem_link_codes_update" on public.influencer_link_codes;
create policy "influencer_redeem_link_codes_update"
on public.influencer_link_codes
for update
to authenticated
using (
  used_at is null
  and expires_at > now()
  and exists (
    select 1
    from public.influencers i
    where i.id = influencer_link_codes.influencer_id
      and i.org_id = influencer_link_codes.org_id
  )
)
with check (
  used_at is not null
);

drop policy if exists "influencer_linking_select_influencer" on public.influencers;
create policy "influencer_linking_select_influencer"
on public.influencers
for select
to authenticated
using (
  exists (
    select 1
    from public.influencer_link_codes c
    where c.influencer_id = influencers.id
      and c.org_id = influencers.org_id
      and c.used_at is null
      and c.expires_at > now()
  )
);

drop policy if exists "influencer_linking_update_influencer" on public.influencers;
create policy "influencer_linking_update_influencer"
on public.influencers
for update
to authenticated
using (
  user_id is null
  and exists (
    select 1
    from public.influencer_link_codes c
    where c.influencer_id = influencers.id
      and c.org_id = influencers.org_id
      and c.used_at is null
      and c.expires_at > now()
  )
)
with check (
  user_id = auth.uid()
);
