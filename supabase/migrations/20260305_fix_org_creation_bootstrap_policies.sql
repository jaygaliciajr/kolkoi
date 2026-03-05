-- Fix: allow first-time manager bootstrap org creation under RLS.
-- This keeps write scope narrow: user can create org with created_by=self
-- and add only themselves as an org member for that org.

alter table if exists public.organizations enable row level security;
alter table if exists public.org_members enable row level security;

drop policy if exists "v2_organizations_insert_self_or_superadmin" on public.organizations;
create policy "v2_organizations_insert_self_or_superadmin"
on public.organizations
for insert
to authenticated
with check (
  public.is_super_admin()
  or created_by = auth.uid()
);

drop policy if exists "v2_organizations_select_related_or_superadmin" on public.organizations;
create policy "v2_organizations_select_related_or_superadmin"
on public.organizations
for select
to authenticated
using (
  public.is_super_admin()
  or created_by = auth.uid()
  or exists (
    select 1
    from public.org_members m
    where m.org_id = organizations.id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "v2_org_members_select_self_or_superadmin" on public.org_members;
create policy "v2_org_members_select_self_or_superadmin"
on public.org_members
for select
to authenticated
using (
  public.is_super_admin()
  or user_id = auth.uid()
);

drop policy if exists "v2_org_members_insert_self_bootstrap_or_superadmin" on public.org_members;
create policy "v2_org_members_insert_self_bootstrap_or_superadmin"
on public.org_members
for insert
to authenticated
with check (
  public.is_super_admin()
  or (
    user_id = auth.uid()
    and exists (
      select 1
      from public.organizations o
      where o.id = org_members.org_id
        and o.created_by = auth.uid()
    )
  )
);
