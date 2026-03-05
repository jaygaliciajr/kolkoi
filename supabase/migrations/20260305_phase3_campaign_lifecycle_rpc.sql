create extension if not exists pgcrypto;

-- Ensure helpful indexes for lifecycle operations.
create unique index if not exists idx_campaigns_root_version_unique
  on public.campaigns (root_campaign_id, version_number);

create index if not exists idx_campaign_change_requests_campaign_status_created_at
  on public.campaign_change_requests (campaign_id, status, created_at desc);

create index if not exists idx_campaign_assignments_campaign_status
  on public.campaign_assignments (campaign_id, status);

alter table if exists public.campaign_change_requests
  add column if not exists resolution_note text;

-- Ensure every campaign has a stable root/version identity for versioning.
create or replace function public.ensure_campaign_root_version_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.root_campaign_id is null then
    new.root_campaign_id := new.id;
  end if;

  if new.version_number is null or new.version_number < 1 then
    new.version_number := 1;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_campaign_root_version_defaults_trigger on public.campaigns;
create trigger ensure_campaign_root_version_defaults_trigger
before insert on public.campaigns
for each row
execute function public.ensure_campaign_root_version_defaults();

-- Post-lock edits must go through change requests and versioning.
create or replace function public.block_locked_campaign_core_updates()
returns trigger
language plpgsql
as $$
begin
  if old.is_locked = true and (
    new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.objectives is distinct from old.objectives
    or new.start_date is distinct from old.start_date
    or new.end_date is distinct from old.end_date
    or new.timezone is distinct from old.timezone
    or new.brand_id is distinct from old.brand_id
    or new.owner_manager_user_id is distinct from old.owner_manager_user_id
  ) then
    raise exception 'Locked campaigns cannot be edited directly. Create a change request.';
  end if;

  return new;
end;
$$;

drop trigger if exists block_locked_campaign_core_updates_trigger on public.campaigns;
create trigger block_locked_campaign_core_updates_trigger
before update on public.campaigns
for each row
execute function public.block_locked_campaign_core_updates();

-- Ensure clients can safely read campaign and deliverable records tied to their brands.
alter table if exists public.campaigns enable row level security;
drop policy if exists "v2_campaigns_select_related" on public.campaigns;
create policy "v2_campaigns_select_related"
on public.campaigns
for select
to authenticated
using (
  public.is_super_admin()
  or public.is_manager_for_campaign(id)
  or public.is_client_for_campaign(id)
);

alter table if exists public.campaign_deliverables enable row level security;
drop policy if exists "v2_campaign_deliverables_select_related" on public.campaign_deliverables;
create policy "v2_campaign_deliverables_select_related"
on public.campaign_deliverables
for select
to authenticated
using (
  exists (
    select 1
    from public.campaigns c
    where c.id = campaign_deliverables.campaign_id
      and (
        public.is_super_admin()
        or public.is_manager_for_campaign(c.id)
        or public.is_client_for_campaign(c.id)
      )
  )
);

-- RPC: client approval before manager lock.
create or replace function public.client_approve_campaign(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_campaign public.campaigns%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if public.current_app_role() <> 'client'::public.app_role_type then
    raise exception 'Only clients can approve campaigns.';
  end if;

  if not public.is_client_for_campaign(p_campaign_id) then
    raise exception 'Client is not allowed to approve this campaign.';
  end if;

  select *
  into v_campaign
  from public.campaigns
  where id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campaign not found.';
  end if;

  if v_campaign.client_approved_at is not null then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'campaign_id', p_campaign_id,
      'client_approved_at', v_campaign.client_approved_at
    );
  end if;

  update public.campaigns
  set
    client_approved_at = now(),
    client_approved_by = v_user_id
  where id = p_campaign_id;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'campaign_id', p_campaign_id,
    'client_approved_at', now()
  );
end;
$$;

-- RPC: manager lock after client approval.
create or replace function public.manager_lock_campaign(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_campaign public.campaigns%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if public.current_app_role() <> 'manager'::public.app_role_type then
    raise exception 'Only managers can lock campaigns.';
  end if;

  if not public.is_manager_for_campaign(p_campaign_id) then
    raise exception 'Manager is not allowed to lock this campaign.';
  end if;

  select *
  into v_campaign
  from public.campaigns
  where id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campaign not found.';
  end if;

  if v_campaign.is_locked then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'campaign_id', p_campaign_id,
      'locked_at', v_campaign.locked_at
    );
  end if;

  if v_campaign.client_approved_at is null then
    raise exception 'Campaign requires client approval before lock.';
  end if;

  update public.campaigns
  set
    is_locked = true,
    locked_at = now(),
    locked_by = v_user_id
  where id = p_campaign_id;

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'campaign_id', p_campaign_id,
    'locked_at', now()
  );
end;
$$;

-- RPC: client creates post-lock change request.
create or replace function public.client_create_change_request(
  p_campaign_id uuid,
  p_request_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_campaign public.campaigns%rowtype;
  v_request_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if public.current_app_role() <> 'client'::public.app_role_type then
    raise exception 'Only clients can create change requests.';
  end if;

  if p_request_note is null or btrim(p_request_note) = '' then
    raise exception 'Change request note is required.';
  end if;

  if not public.is_client_for_campaign(p_campaign_id) then
    raise exception 'Client is not allowed to request changes for this campaign.';
  end if;

  select *
  into v_campaign
  from public.campaigns
  where id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campaign not found.';
  end if;

  if v_campaign.is_locked is distinct from true then
    raise exception 'Campaign must be locked before a change request can be submitted.';
  end if;

  insert into public.campaign_change_requests (
    campaign_id,
    requested_by,
    request_note,
    status
  )
  values (
    p_campaign_id,
    v_user_id,
    btrim(p_request_note),
    'open'
  )
  returning id into v_request_id;

  return jsonb_build_object(
    'ok', true,
    'change_request_id', v_request_id,
    'campaign_id', p_campaign_id
  );
end;
$$;

-- RPC: manager rejects a change request.
create or replace function public.manager_reject_change_request(
  p_change_request_id uuid,
  p_review_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_request public.campaign_change_requests%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if public.current_app_role() <> 'manager'::public.app_role_type then
    raise exception 'Only managers can reject change requests.';
  end if;

  select *
  into v_request
  from public.campaign_change_requests
  where id = p_change_request_id
  for update;

  if not found then
    raise exception 'Change request not found.';
  end if;

  if not public.is_manager_for_campaign(v_request.campaign_id) then
    raise exception 'Manager is not allowed to review this change request.';
  end if;

  if v_request.status <> 'open' then
    raise exception 'Only open change requests can be rejected.';
  end if;

  update public.campaign_change_requests
  set
    status = 'rejected',
    reviewed_by = v_user_id,
    reviewed_at = now(),
    updated_at = now(),
    resolution_note = case
      when p_review_note is null or btrim(p_review_note) = '' then resolution_note
      else btrim(p_review_note)
    end
  where id = p_change_request_id;

  return jsonb_build_object(
    'ok', true,
    'change_request_id', p_change_request_id,
    'status', 'rejected'
  );
end;
$$;

-- RPC: manager approves request and creates new campaign version atomically.
create or replace function public.manager_approve_change_request(
  p_change_request_id uuid,
  p_review_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_request public.campaign_change_requests%rowtype;
  v_old_campaign public.campaigns%rowtype;
  v_root_campaign_id uuid;
  v_next_version integer;
  v_new_campaign_id uuid;
  v_canceled_count integer := 0;
  v_now timestamptz := now();
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if public.current_app_role() <> 'manager'::public.app_role_type then
    raise exception 'Only managers can approve change requests.';
  end if;

  select *
  into v_request
  from public.campaign_change_requests
  where id = p_change_request_id
  for update;

  if not found then
    raise exception 'Change request not found.';
  end if;

  if v_request.status <> 'open' then
    raise exception 'Only open change requests can be approved.';
  end if;

  if not public.is_manager_for_campaign(v_request.campaign_id) then
    raise exception 'Manager is not allowed to review this change request.';
  end if;

  select *
  into v_old_campaign
  from public.campaigns
  where id = v_request.campaign_id
  for update;

  if not found then
    raise exception 'Source campaign not found.';
  end if;

  if v_old_campaign.is_locked is distinct from true then
    raise exception 'Campaign must be locked before implementing a change request.';
  end if;

  v_root_campaign_id := coalesce(v_old_campaign.root_campaign_id, v_old_campaign.id);

  if v_old_campaign.superseded_at is not null then
    raise exception 'Campaign has already been superseded by a newer version.';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(v_root_campaign_id::text),
    hashtext(v_root_campaign_id::text || ':campaign_version')
  );

  select coalesce(max(c.version_number), 0) + 1
  into v_next_version
  from public.campaigns c
  where c.root_campaign_id = v_root_campaign_id;

  insert into public.campaigns (
    org_id,
    brand_id,
    owner_manager_user_id,
    created_by,
    title,
    description,
    objectives,
    status,
    start_date,
    end_date,
    timezone,
    root_campaign_id,
    version_number,
    change_note,
    is_locked,
    client_approved_at,
    client_approved_by,
    locked_at,
    locked_by,
    superseded_at
  )
  values (
    v_old_campaign.org_id,
    v_old_campaign.brand_id,
    v_old_campaign.owner_manager_user_id,
    v_user_id,
    v_old_campaign.title,
    v_old_campaign.description,
    v_old_campaign.objectives,
    'draft',
    v_old_campaign.start_date,
    v_old_campaign.end_date,
    v_old_campaign.timezone,
    v_root_campaign_id,
    v_next_version,
    coalesce(nullif(btrim(p_review_note), ''), v_request.request_note),
    false,
    null,
    null,
    null,
    null,
    null
  )
  returning id into v_new_campaign_id;

  insert into public.campaign_deliverables (
    org_id,
    campaign_id,
    created_by,
    platform,
    required_post_count,
    required_hashtags,
    talking_points,
    due_at,
    payout_amount
  )
  select
    d.org_id,
    v_new_campaign_id,
    coalesce(d.created_by, v_user_id),
    d.platform,
    d.required_post_count,
    d.required_hashtags,
    d.talking_points,
    d.due_at,
    d.payout_amount
  from public.campaign_deliverables d
  where d.campaign_id = v_old_campaign.id;

  update public.campaign_assignments a
  set
    status = 'removed',
    canceled_at = v_now,
    canceled_by = v_user_id,
    canceled_reason = 'Campaign version updated'
  where a.campaign_id = v_old_campaign.id
    and a.status in ('invited', 'accepted');

  get diagnostics v_canceled_count = row_count;

  update public.campaigns
  set
    status = 'archived',
    superseded_at = v_now
  where id = v_old_campaign.id;

  update public.campaign_change_requests
  set
    status = 'implemented',
    reviewed_by = v_user_id,
    reviewed_at = v_now,
    implemented_campaign_id = v_new_campaign_id,
    updated_at = v_now,
    resolution_note =
      coalesce(
        nullif(btrim(p_review_note), ''),
        'Implemented change request'
      )
      || format(' (Canceled invites: %s)', v_canceled_count)
  where id = p_change_request_id;

  return jsonb_build_object(
    'ok', true,
    'change_request_id', p_change_request_id,
    'old_campaign_id', v_old_campaign.id,
    'new_campaign_id', v_new_campaign_id,
    'canceled_assignment_count', v_canceled_count
  );
end;
$$;

revoke all on function public.client_approve_campaign(uuid) from public;
revoke all on function public.manager_lock_campaign(uuid) from public;
revoke all on function public.client_create_change_request(uuid, text) from public;
revoke all on function public.manager_reject_change_request(uuid, text) from public;
revoke all on function public.manager_approve_change_request(uuid, text) from public;

grant execute on function public.client_approve_campaign(uuid) to authenticated;
grant execute on function public.manager_lock_campaign(uuid) to authenticated;
grant execute on function public.client_create_change_request(uuid, text) to authenticated;
grant execute on function public.manager_reject_change_request(uuid, text) to authenticated;
grant execute on function public.manager_approve_change_request(uuid, text) to authenticated;
