-- Hotfix: resolve conflicting RLS policies that block org bootstrap creation.
-- Safe scope: organizations + org_members only.

alter table if exists public.organizations enable row level security;
alter table if exists public.org_members enable row level security;

-- Remove all existing policies on target tables to avoid restrictive-policy collisions.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'organizations'
  loop
    execute format('drop policy if exists %I on public.organizations', p.policyname);
  end loop;

  for p in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'org_members'
  loop
    execute format('drop policy if exists %I on public.org_members', p.policyname);
  end loop;
end
$$;

-- organizations
create policy "organizations_select_related_or_superadmin"
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

create policy "organizations_insert_self_or_superadmin"
on public.organizations
for insert
to authenticated
with check (
  public.is_super_admin()
  or created_by = auth.uid()
);

create policy "organizations_update_creator_or_superadmin"
on public.organizations
for update
to authenticated
using (
  public.is_super_admin()
  or created_by = auth.uid()
)
with check (
  public.is_super_admin()
  or created_by = auth.uid()
);

-- org_members
create policy "org_members_select_self_or_superadmin"
on public.org_members
for select
to authenticated
using (
  public.is_super_admin()
  or user_id = auth.uid()
);

create policy "org_members_insert_self_bootstrap_or_superadmin"
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

create policy "org_members_update_self_or_superadmin"
on public.org_members
for update
to authenticated
using (
  public.is_super_admin()
  or user_id = auth.uid()
)
with check (
  public.is_super_admin()
  or user_id = auth.uid()
);
