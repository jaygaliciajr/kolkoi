create extension if not exists pgcrypto;

create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

-- Optional self visibility for troubleshooting.
drop policy if exists "platform_admin_self_select" on public.platform_admins;
create policy "platform_admin_self_select"
on public.platform_admins
for select
to authenticated
using (user_id = auth.uid() or public.is_super_admin());

alter table if exists public.organizations enable row level security;
drop policy if exists "super_admin_select_organizations" on public.organizations;
create policy "super_admin_select_organizations"
on public.organizations
for select
to authenticated
using (public.is_super_admin());

alter table if exists public.org_members enable row level security;
drop policy if exists "super_admin_select_org_members" on public.org_members;
create policy "super_admin_select_org_members"
on public.org_members
for select
to authenticated
using (public.is_super_admin());

alter table if exists public.influencers enable row level security;
drop policy if exists "super_admin_select_influencers" on public.influencers;
create policy "super_admin_select_influencers"
on public.influencers
for select
to authenticated
using (public.is_super_admin());

alter table if exists public.campaigns enable row level security;
drop policy if exists "super_admin_select_campaigns" on public.campaigns;
create policy "super_admin_select_campaigns"
on public.campaigns
for select
to authenticated
using (public.is_super_admin());

alter table if exists public.campaign_deliverables enable row level security;
drop policy if exists "super_admin_select_campaign_deliverables" on public.campaign_deliverables;
create policy "super_admin_select_campaign_deliverables"
on public.campaign_deliverables
for select
to authenticated
using (public.is_super_admin());

alter table if exists public.campaign_assignments enable row level security;
drop policy if exists "super_admin_select_campaign_assignments" on public.campaign_assignments;
create policy "super_admin_select_campaign_assignments"
on public.campaign_assignments
for select
to authenticated
using (public.is_super_admin());

alter table if exists public.content_submissions enable row level security;
drop policy if exists "super_admin_select_content_submissions" on public.content_submissions;
create policy "super_admin_select_content_submissions"
on public.content_submissions
for select
to authenticated
using (public.is_super_admin());

alter table if exists public.submission_comments enable row level security;
drop policy if exists "super_admin_select_submission_comments" on public.submission_comments;
create policy "super_admin_select_submission_comments"
on public.submission_comments
for select
to authenticated
using (public.is_super_admin());

alter table if exists public.post_proofs enable row level security;
drop policy if exists "super_admin_select_post_proofs" on public.post_proofs;
create policy "super_admin_select_post_proofs"
on public.post_proofs
for select
to authenticated
using (public.is_super_admin());

alter table if exists public.engagement_snapshots enable row level security;
drop policy if exists "super_admin_select_engagement_snapshots" on public.engagement_snapshots;
create policy "super_admin_select_engagement_snapshots"
on public.engagement_snapshots
for select
to authenticated
using (public.is_super_admin());

alter table if exists public.payment_milestones enable row level security;
drop policy if exists "super_admin_select_payment_milestones" on public.payment_milestones;
create policy "super_admin_select_payment_milestones"
on public.payment_milestones
for select
to authenticated
using (public.is_super_admin());

alter table if exists public.payment_transactions enable row level security;
drop policy if exists "super_admin_select_payment_transactions" on public.payment_transactions;
create policy "super_admin_select_payment_transactions"
on public.payment_transactions
for select
to authenticated
using (public.is_super_admin());
