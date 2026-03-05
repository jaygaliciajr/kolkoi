-- V2 bridge seed: role mapping + base client/brand/manager links
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create or replace function public._seed_create_auth_user(p_email text, p_password text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_instance_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = lower(p_email)
  limit 1;

  if v_user_id is null then
    select coalesce((select id from auth.instances limit 1), '00000000-0000-0000-0000-000000000000'::uuid)
    into v_instance_id;

    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      is_sso_user,
      is_anonymous
    )
    values (
      v_instance_id,
      v_user_id,
      'authenticated',
      'authenticated',
      lower(p_email),
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email']),
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      '',
      false,
      false
    );
  else
    update auth.users
    set
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
    where id = v_user_id;
  end if;

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email)),
    'email',
    lower(p_email),
    now(),
    now(),
    now()
  )
  on conflict (provider, provider_id)
  do update set
    user_id = excluded.user_id,
    identity_data = excluded.identity_data,
    updated_at = now();

  return v_user_id;
end;
$$;

do $$
declare
  v_password text := 'SeedPass123!';
  u_super uuid;
  u_client uuid;
  u_manager uuid;
  u_creator1 uuid;
  u_creator2 uuid;
  v_client_id uuid;
  v_brand_id uuid;
begin
  u_super := public._seed_create_auth_user('superadmin.seed@kolkoi.local', v_password);
  u_client := public._seed_create_auth_user('client.seed@kolkoi.local', v_password);
  u_manager := public._seed_create_auth_user('manager.seed@kolkoi.local', v_password);
  u_creator1 := public._seed_create_auth_user('creator1.seed@kolkoi.local', v_password);
  u_creator2 := public._seed_create_auth_user('creator2.seed@kolkoi.local', v_password);

  insert into public.user_profiles (user_id, app_role, display_name)
  values
    (u_super, 'superadmin'::public.app_role_type, 'Seed Super Admin'),
    (u_client, 'client'::public.app_role_type, 'Seed Client'),
    (u_manager, 'manager'::public.app_role_type, 'Seed Manager'),
    (u_creator1, 'influencer'::public.app_role_type, 'Seed Creator One'),
    (u_creator2, 'influencer'::public.app_role_type, 'Seed Creator Two')
  on conflict (user_id)
  do update set
    app_role = excluded.app_role,
    display_name = excluded.display_name,
    updated_at = now();

  insert into public.platform_admins (user_id)
  values (u_super)
  on conflict (user_id) do nothing;

  insert into public.clients (user_id, company_name)
  values (u_client, '[SEED] Acme Client Group')
  on conflict (user_id)
  do update set
    company_name = excluded.company_name,
    updated_at = now()
  returning id into v_client_id;

  if v_client_id is null then
    select id into v_client_id
    from public.clients
    where user_id = u_client
    limit 1;
  end if;

  insert into public.brands (client_id, name, description, timezone)
  values (v_client_id, '[SEED] Acme Snacks', 'Seed brand for V2 client-manager workflow', 'Asia/Manila')
  on conflict (client_id, lower(name))
  do update set
    description = excluded.description,
    timezone = excluded.timezone,
    updated_at = now()
  returning id into v_brand_id;

  if v_brand_id is null then
    select id into v_brand_id
    from public.brands
    where client_id = v_client_id
      and lower(name) = lower('[SEED] Acme Snacks')
    limit 1;
  end if;

  insert into public.manager_brand_access (manager_user_id, brand_id, assigned_by)
  values (u_manager, v_brand_id, u_client)
  on conflict (manager_user_id, brand_id) do nothing;
end
$$;

drop function if exists public._seed_create_auth_user(text, text);

select
  u.email,
  up.app_role,
  c.company_name,
  b.name as brand_name
from auth.users u
left join public.user_profiles up on up.user_id = u.id
left join public.clients c on c.user_id = u.id
left join public.brands b on b.client_id = c.id
where u.email in (
  'superadmin.seed@kolkoi.local',
  'client.seed@kolkoi.local',
  'manager.seed@kolkoi.local',
  'creator1.seed@kolkoi.local',
  'creator2.seed@kolkoi.local'
)
order by u.email;
