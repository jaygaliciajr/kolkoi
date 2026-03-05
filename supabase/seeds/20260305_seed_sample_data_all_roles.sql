-- Kolkoi sample data seed (all roles)
-- Re-runnable: this script clears prior seed-tagged data before inserting.
-- Seed tag conventions:
--   org names: '[SEED] ...'
--   auth users: '*.seed@kolkoi.local'
--
-- Default password for all sample users:
--   SeedPass123!
--
-- Run cleanup-only anytime using:
--   supabase/seeds/20260305_cleanup_sample_data.sql

-- 1) Cleanup previous seed data
DO $$
DECLARE
  v_seed_emails text[] := ARRAY[
    'superadmin.seed@kolkoi.local',
    'client.seed@kolkoi.local',
    'admin.seed@kolkoi.local',
    'manager.seed@kolkoi.local',
    'finance.seed@kolkoi.local',
    'creator1.seed@kolkoi.local',
    'creator2.seed@kolkoi.local'
  ];

  v_seed_org_ids uuid[] := ARRAY[]::uuid[];
  v_seed_user_ids uuid[] := ARRAY[]::uuid[];
  v_seed_assignment_ids uuid[] := ARRAY[]::uuid[];
  v_seed_submission_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO v_seed_org_ids
  FROM public.organizations
  WHERE name LIKE '[SEED] %';

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO v_seed_user_ids
  FROM auth.users
  WHERE email = ANY(v_seed_emails);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO v_seed_assignment_ids
  FROM public.campaign_assignments
  WHERE org_id = ANY(v_seed_org_ids);

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO v_seed_submission_ids
  FROM public.content_submissions
  WHERE org_id = ANY(v_seed_org_ids);

  DELETE FROM public.submission_comments
  WHERE submission_id = ANY(v_seed_submission_ids);

  DELETE FROM public.content_submissions
  WHERE id = ANY(v_seed_submission_ids)
     OR org_id = ANY(v_seed_org_ids)
     OR assignment_id = ANY(v_seed_assignment_ids);

  DELETE FROM public.post_proofs
  WHERE org_id = ANY(v_seed_org_ids)
     OR assignment_id = ANY(v_seed_assignment_ids);

  DELETE FROM public.payment_transactions
  WHERE org_id = ANY(v_seed_org_ids)
     OR assignment_id = ANY(v_seed_assignment_ids);

  DELETE FROM public.payment_milestones
  WHERE org_id = ANY(v_seed_org_ids)
     OR assignment_id = ANY(v_seed_assignment_ids);

  DELETE FROM public.dispute_tickets
  WHERE assignment_id = ANY(v_seed_assignment_ids)
     OR opened_by = ANY(v_seed_user_ids)
     OR manager_user_id = ANY(v_seed_user_ids);

  DELETE FROM public.campaign_recommendations
  WHERE campaign_id IN (
    SELECT id
    FROM public.campaigns
    WHERE org_id = ANY(v_seed_org_ids)
  );

  DELETE FROM public.campaign_change_requests
  WHERE campaign_id IN (
    SELECT id
    FROM public.campaigns
    WHERE org_id = ANY(v_seed_org_ids)
  );

  DELETE FROM public.campaign_managers
  WHERE manager_user_id = ANY(v_seed_user_ids)
     OR campaign_id IN (
       SELECT id
       FROM public.campaigns
       WHERE org_id = ANY(v_seed_org_ids)
     );

  DELETE FROM public.manager_brand_access
  WHERE manager_user_id = ANY(v_seed_user_ids)
     OR brand_id IN (
       SELECT id
       FROM public.brands
       WHERE name LIKE '[SEED] %'
     );

  IF to_regclass('public.engagement_snapshots') IS NOT NULL THEN
    DELETE FROM public.engagement_snapshots
    WHERE org_id = ANY(v_seed_org_ids)
       OR assignment_id = ANY(v_seed_assignment_ids);
  END IF;

  DELETE FROM public.influencer_link_codes
  WHERE org_id = ANY(v_seed_org_ids);

  DELETE FROM public.campaign_assignments
  WHERE org_id = ANY(v_seed_org_ids);

  DELETE FROM public.campaign_deliverables
  WHERE org_id = ANY(v_seed_org_ids);

  DELETE FROM public.campaigns
  WHERE org_id = ANY(v_seed_org_ids);

  DELETE FROM public.influencers
  WHERE org_id = ANY(v_seed_org_ids)
     OR user_id = ANY(v_seed_user_ids);

  DELETE FROM public.org_members
  WHERE org_id = ANY(v_seed_org_ids)
     OR user_id = ANY(v_seed_user_ids);

  DELETE FROM public.platform_admins
  WHERE user_id = ANY(v_seed_user_ids);

  DELETE FROM public.brands
  WHERE name LIKE '[SEED] %';

  DELETE FROM public.clients
  WHERE user_id = ANY(v_seed_user_ids)
     OR company_name LIKE '[SEED] %';

  DELETE FROM public.user_profiles
  WHERE user_id = ANY(v_seed_user_ids);

  DELETE FROM public.organizations
  WHERE id = ANY(v_seed_org_ids)
     OR name LIKE '[SEED] %';

  DELETE FROM auth.identities
  WHERE user_id = ANY(v_seed_user_ids)
     OR provider_id = ANY(v_seed_emails)
     OR (identity_data->>'email') = ANY(v_seed_emails);

  DELETE FROM auth.users
  WHERE id = ANY(v_seed_user_ids)
     OR email = ANY(v_seed_emails);
END
$$;

-- 2) Helper for auth user creation
CREATE OR REPLACE FUNCTION public._seed_create_auth_user(p_email text, p_password text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_instance_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = lower(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT COALESCE((SELECT id FROM auth.instances LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid)
    INTO v_instance_id;

    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
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
    VALUES (
      v_instance_id,
      v_user_id,
      'authenticated',
      'authenticated',
      lower(p_email),
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
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
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email)),
    'email',
    lower(p_email),
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  RETURN v_user_id;
END;
$$;

-- 3) Seed full sample dataset
DO $$
DECLARE
  v_password text := 'SeedPass123!';

  u_super uuid;
  u_admin uuid;
  u_manager uuid;
  u_finance uuid;
  u_creator1 uuid;
  u_creator2 uuid;

  org_atlas uuid;
  org_beacon uuid;

  inf_aria uuid;
  inf_neo uuid;
  inf_luna uuid;
  inf_mika uuid;
  inf_bea uuid;

  camp_alpha uuid;
  camp_beta uuid;
  camp_gamma uuid;
  camp_beacon uuid;

  deliv_alpha_ig uuid;
  deliv_alpha_fb uuid;
  deliv_alpha_ig_story uuid;
  deliv_gamma_ig uuid;
  deliv_beacon_fb uuid;

  asg_alpha_aria uuid;
  asg_alpha_neo uuid;
  asg_alpha_luna uuid;
  asg_alpha_mika uuid;
  asg_gamma_aria uuid;
  asg_beacon_bea uuid;

  sub_alpha_aria_ig uuid;
  sub_alpha_aria_fb uuid;
  sub_alpha_neo_ig uuid;
  sub_gamma_aria uuid;

  ms_alpha_aria_approved uuid;
  ms_alpha_aria_verified uuid;
  ms_alpha_neo_approved uuid;
  ms_alpha_neo_verified uuid;
  ms_gamma_aria_approved uuid;
  ms_gamma_aria_verified uuid;
BEGIN
  -- Auth users
  u_super    := public._seed_create_auth_user('superadmin.seed@kolkoi.local', v_password);
  u_admin    := public._seed_create_auth_user('admin.seed@kolkoi.local', v_password);
  u_manager  := public._seed_create_auth_user('manager.seed@kolkoi.local', v_password);
  u_finance  := public._seed_create_auth_user('finance.seed@kolkoi.local', v_password);
  u_creator1 := public._seed_create_auth_user('creator1.seed@kolkoi.local', v_password);
  u_creator2 := public._seed_create_auth_user('creator2.seed@kolkoi.local', v_password);

  -- Organizations
  INSERT INTO public.organizations (name, tier, created_by, logo_url)
  VALUES ('[SEED] Atlas Media Group', 'pro', u_admin, 'https://dummyimage.com/128x128/2563eb/ffffff&text=AM')
  RETURNING id INTO org_atlas;

  INSERT INTO public.organizations (name, tier, created_by, logo_url)
  VALUES ('[SEED] Beacon Creator Studio', 'starter', u_manager, 'https://dummyimage.com/128x128/0ea5e9/ffffff&text=BC')
  RETURNING id INTO org_beacon;

  -- Org memberships / roles
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES
    (org_atlas, u_admin,   'org_admin'::public.role_type),
    (org_atlas, u_manager, 'campaign_manager'::public.role_type),
    (org_atlas, u_finance, 'finance'::public.role_type),
    (org_beacon, u_manager, 'org_admin'::public.role_type),
    (org_beacon, u_admin,   'campaign_manager'::public.role_type);

  -- Super admin grant
  INSERT INTO public.platform_admins (user_id)
  VALUES (u_super)
  ON CONFLICT (user_id) DO NOTHING;

  -- Influencers (two linked to auth creators)
  INSERT INTO public.influencers (
    org_id, created_by, full_name, email, phone, location, notes,
    fb_page_url, ig_handle, follower_count, engagement_rate, tags, user_id
  ) VALUES
    (org_atlas, u_manager, 'Aria Santos', 'creator1.seed@kolkoi.local', '+63-900-111-1111', 'Manila', 'Top performer, beauty niche', 'https://facebook.com/aria.santos.page', 'aria.santos', 185000, 4.8, ARRAY['beauty','lifestyle'], u_creator1),
    (org_atlas, u_manager, 'Neo Ramirez', 'creator2.seed@kolkoi.local', '+63-900-222-2222', 'Cebu', 'Gaming and tech creator', 'https://facebook.com/neo.ramirez.page', 'neo.ramirez', 240000, 5.2, ARRAY['gaming','tech'], u_creator2),
    (org_atlas, u_manager, 'Luna Cruz', 'luna.seed@kolkoi.local', '+63-900-333-3333', 'Davao', 'Pending account linking', 'https://facebook.com/luna.cruz.page', 'luna.cruz', 99000, 3.9, ARRAY['fashion','lifestyle'], NULL),
    (org_atlas, u_manager, 'Mika Reyes', 'mika.seed@kolkoi.local', '+63-900-444-4444', 'Quezon City', 'Occasional collaborator', 'https://facebook.com/mika.reyes.page', 'mika.reyes', 52000, 3.3, ARRAY['food','vlog'], NULL),
    (org_beacon, u_admin, 'Bea Lim', 'bea.seed@kolkoi.local', '+63-900-555-5555', 'Iloilo', 'Beacon studio creator', 'https://facebook.com/bea.lim.page', 'bea.lim', 73000, 4.1, ARRAY['travel','lifestyle'], NULL);

  -- Capture influencer ids deterministically by name
  SELECT id INTO inf_aria FROM public.influencers WHERE org_id = org_atlas AND full_name = 'Aria Santos' LIMIT 1;
  SELECT id INTO inf_neo  FROM public.influencers WHERE org_id = org_atlas AND full_name = 'Neo Ramirez' LIMIT 1;
  SELECT id INTO inf_luna FROM public.influencers WHERE org_id = org_atlas AND full_name = 'Luna Cruz' LIMIT 1;
  SELECT id INTO inf_mika FROM public.influencers WHERE org_id = org_atlas AND full_name = 'Mika Reyes' LIMIT 1;
  SELECT id INTO inf_bea  FROM public.influencers WHERE org_id = org_beacon AND full_name = 'Bea Lim' LIMIT 1;

  -- Campaigns
  INSERT INTO public.campaigns (
    org_id, created_by, title, description, objectives, status, start_date, end_date
  ) VALUES
    (
      org_atlas,
      u_manager,
      '[SEED] Spring Launch 2026',
      'Spring campaign focused on launch awareness and conversion.',
      'Drive reach, boost saves, increase conversion clicks.',
      'active',
      (now() - interval '6 day')::date,
      (now() + interval '24 day')::date
    ),
    (
      org_atlas,
      u_manager,
      '[SEED] Creator Bootcamp',
      'Onboarding campaign for new creators.',
      'Collect baseline outputs and QA feedback.',
      'draft',
      (now() + interval '5 day')::date,
      (now() + interval '45 day')::date
    ),
    (
      org_atlas,
      u_manager,
      '[SEED] Holiday Recap 2025',
      'Completed holiday recap promotions.',
      'Post-season engagement and reporting.',
      'completed',
      (now() - interval '110 day')::date,
      (now() - interval '72 day')::date
    ),
    (
      org_beacon,
      u_admin,
      '[SEED] Beacon Brand Push',
      'Brand awareness burst for Beacon studio.',
      'Lift page traffic and creator inquiries.',
      'active',
      (now() - interval '2 day')::date,
      (now() + interval '18 day')::date
    );

  SELECT id INTO camp_alpha FROM public.campaigns WHERE org_id = org_atlas AND title = '[SEED] Spring Launch 2026' LIMIT 1;
  SELECT id INTO camp_beta  FROM public.campaigns WHERE org_id = org_atlas AND title = '[SEED] Creator Bootcamp' LIMIT 1;
  SELECT id INTO camp_gamma FROM public.campaigns WHERE org_id = org_atlas AND title = '[SEED] Holiday Recap 2025' LIMIT 1;
  SELECT id INTO camp_beacon FROM public.campaigns WHERE org_id = org_beacon AND title = '[SEED] Beacon Brand Push' LIMIT 1;

  -- Deliverables
  INSERT INTO public.campaign_deliverables (
    org_id,
    campaign_id,
    platform,
    required_post_count,
    required_hashtags,
    talking_points,
    due_at,
    payout_amount
  ) VALUES
    (
      org_atlas,
      camp_alpha,
      'instagram',
      1,
      ARRAY['atlaslaunch','spring2026'],
      ARRAY['Highlight product benefits','Mention limited-time promo'],
      now() + interval '5 day',
      900
    ),
    (
      org_atlas,
      camp_alpha,
      'facebook_page',
      1,
      ARRAY['atlaslaunch','communityfirst'],
      ARRAY['Show before/after','Invite followers to comment'],
      now() + interval '7 day',
      600
    ),
    (
      org_atlas,
      camp_alpha,
      'instagram',
      1,
      ARRAY['atlaslaunch','storydrop'],
      ARRAY['Use vertical format','Include CTA swipe-up text'],
      now() + interval '10 day',
      400
    ),
    (
      org_atlas,
      camp_gamma,
      'instagram',
      1,
      ARRAY['holidayrecap','atlas2025'],
      ARRAY['Recap campaign highlights','Tag official brand page'],
      now() - interval '80 day',
      1000
    ),
    (
      org_beacon,
      camp_beacon,
      'facebook_page',
      1,
      ARRAY['beaconpush','creatorstudio'],
      ARRAY['Explain creator benefits','Show workspace shots'],
      now() + interval '8 day',
      700
    );

  SELECT id INTO deliv_alpha_ig FROM public.campaign_deliverables WHERE campaign_id = camp_alpha AND platform = 'instagram' ORDER BY payout_amount DESC LIMIT 1;
  SELECT id INTO deliv_alpha_fb FROM public.campaign_deliverables WHERE campaign_id = camp_alpha AND platform = 'facebook_page' LIMIT 1;
  SELECT id INTO deliv_alpha_ig_story FROM public.campaign_deliverables WHERE campaign_id = camp_alpha AND platform = 'instagram' ORDER BY payout_amount ASC LIMIT 1;
  SELECT id INTO deliv_gamma_ig FROM public.campaign_deliverables WHERE campaign_id = camp_gamma LIMIT 1;
  SELECT id INTO deliv_beacon_fb FROM public.campaign_deliverables WHERE campaign_id = camp_beacon LIMIT 1;

  -- Assignments / invites
  INSERT INTO public.campaign_assignments (
    org_id, campaign_id, influencer_id, status, invited_at, responded_at, accepted_at, decline_note
  ) VALUES
    (org_atlas, camp_alpha, inf_aria,  'accepted', now() - interval '4 day', now() - interval '4 day', now() - interval '4 day', NULL),
    (org_atlas, camp_alpha, inf_neo,   'accepted', now() - interval '3 day', now() - interval '3 day', now() - interval '3 day', NULL),
    (org_atlas, camp_alpha, inf_luna,  'invited',  now() - interval '2 day', NULL, NULL, NULL),
    (org_atlas, camp_alpha, inf_mika,  'declined', now() - interval '2 day', now() - interval '1 day', NULL, 'Unavailable this week'),
    (org_atlas, camp_gamma, inf_aria,  'accepted', now() - interval '95 day', now() - interval '94 day', now() - interval '94 day', NULL),
    (org_beacon, camp_beacon, inf_bea, 'invited',  now() - interval '1 day', NULL, NULL, NULL);

  SELECT id INTO asg_alpha_aria FROM public.campaign_assignments WHERE campaign_id = camp_alpha AND influencer_id = inf_aria LIMIT 1;
  SELECT id INTO asg_alpha_neo FROM public.campaign_assignments WHERE campaign_id = camp_alpha AND influencer_id = inf_neo LIMIT 1;
  SELECT id INTO asg_alpha_luna FROM public.campaign_assignments WHERE campaign_id = camp_alpha AND influencer_id = inf_luna LIMIT 1;
  SELECT id INTO asg_alpha_mika FROM public.campaign_assignments WHERE campaign_id = camp_alpha AND influencer_id = inf_mika LIMIT 1;
  SELECT id INTO asg_gamma_aria FROM public.campaign_assignments WHERE campaign_id = camp_gamma AND influencer_id = inf_aria LIMIT 1;
  SELECT id INTO asg_beacon_bea FROM public.campaign_assignments WHERE campaign_id = camp_beacon AND influencer_id = inf_bea LIMIT 1;

  -- Draft submissions (for approvals queue + influencer revisions)
  INSERT INTO public.content_submissions (
    org_id, assignment_id, deliverable_id, version, status,
    submitted_at, caption, notes, media_urls, reviewed_at, reviewed_by, updated_at
  ) VALUES
    (
      org_atlas,
      asg_alpha_aria,
      deliv_alpha_ig,
      1,
      'submitted',
      now() - interval '14 hour',
      'Spring look reveal with Atlas essentials.',
      'Awaiting campaign manager feedback.',
      ARRAY['seed/submissions/aria-alpha-ig-v1.jpg'],
      NULL,
      NULL,
      now() - interval '14 hour'
    ),
    (
      org_atlas,
      asg_alpha_aria,
      deliv_alpha_fb,
      1,
      'approved',
      now() - interval '3 day',
      'Community-centered product walkthrough.',
      'Approved and ready for posting.',
      ARRAY['seed/submissions/aria-alpha-fb-v1.jpg'],
      now() - interval '2 day',
      u_manager,
      now() - interval '2 day'
    ),
    (
      org_atlas,
      asg_alpha_neo,
      deliv_alpha_ig,
      1,
      'needs_revision',
      now() - interval '20 hour',
      'Tech-heavy launch concept draft.',
      'Need stronger product CTA in first line.',
      ARRAY['seed/submissions/neo-alpha-ig-v1.jpg'],
      now() - interval '8 hour',
      u_manager,
      now() - interval '8 hour'
    ),
    (
      org_atlas,
      asg_gamma_aria,
      deliv_gamma_ig,
      1,
      'approved',
      now() - interval '90 day',
      'Holiday recap highlight reel.',
      'Completed campaign reference draft.',
      ARRAY['seed/submissions/aria-gamma-ig-v1.jpg'],
      now() - interval '89 day',
      u_manager,
      now() - interval '89 day'
    );

  SELECT id INTO sub_alpha_aria_ig FROM public.content_submissions WHERE assignment_id = asg_alpha_aria AND deliverable_id = deliv_alpha_ig LIMIT 1;
  SELECT id INTO sub_alpha_aria_fb FROM public.content_submissions WHERE assignment_id = asg_alpha_aria AND deliverable_id = deliv_alpha_fb LIMIT 1;
  SELECT id INTO sub_alpha_neo_ig FROM public.content_submissions WHERE assignment_id = asg_alpha_neo AND deliverable_id = deliv_alpha_ig LIMIT 1;
  SELECT id INTO sub_gamma_aria FROM public.content_submissions WHERE assignment_id = asg_gamma_aria AND deliverable_id = deliv_gamma_ig LIMIT 1;

  INSERT INTO public.submission_comments (submission_id, user_id, body)
  VALUES
    (sub_alpha_aria_ig, u_manager, 'Looks good overall. Checking legal hashtags before approval.'),
    (sub_alpha_neo_ig, u_manager, 'Please improve CTA and add one benefit line in the first sentence.'),
    (sub_alpha_neo_ig, u_creator2, 'Noted. I will resubmit a new version with stronger CTA.');

  -- Proof rows (for proofs queue)
  INSERT INTO public.post_proofs (
    org_id, assignment_id, deliverable_id, status,
    post_url, screenshot_urls, posted_at, verified_at, verified_by, reject_reason
  ) VALUES
    (
      org_atlas,
      asg_alpha_aria,
      deliv_alpha_ig,
      'posted_pending',
      'https://instagram.com/p/seed-alpha-aria-ig',
      ARRAY['seed/proofs/aria-alpha-ig-proof-1.png'],
      now() - interval '6 hour',
      NULL,
      NULL,
      NULL
    ),
    (
      org_atlas,
      asg_alpha_aria,
      deliv_alpha_fb,
      'verified',
      'https://facebook.com/aria.santos.page/posts/seed-alpha-fb',
      ARRAY['seed/proofs/aria-alpha-fb-proof-1.png'],
      now() - interval '2 day',
      now() - interval '1 day',
      u_manager,
      NULL
    ),
    (
      org_atlas,
      asg_alpha_aria,
      deliv_alpha_ig_story,
      'needs_url',
      NULL,
      ARRAY['seed/proofs/aria-alpha-story-proof-1.png'],
      now() - interval '10 hour',
      NULL,
      NULL,
      NULL
    ),
    (
      org_atlas,
      asg_alpha_neo,
      deliv_alpha_ig,
      'rejected',
      'https://instagram.com/p/seed-alpha-neo-ig',
      ARRAY['seed/proofs/neo-alpha-ig-proof-1.png'],
      now() - interval '18 hour',
      NULL,
      NULL,
      'Caption missed required brand claim.'
    ),
    (
      org_atlas,
      asg_gamma_aria,
      deliv_gamma_ig,
      'verified',
      'https://instagram.com/p/seed-gamma-aria-ig',
      ARRAY['seed/proofs/aria-gamma-ig-proof-1.png'],
      now() - interval '88 day',
      now() - interval '87 day',
      u_manager,
      NULL
    );

  -- Payment milestones
  INSERT INTO public.payment_milestones (
    org_id, assignment_id, label, percent, amount, status, ready_at, paid_at, paid_by
  ) VALUES
    (org_atlas, asg_alpha_aria, 'Approved 40', 40, 760, 'paid',  now() - interval '2 day', now() - interval '1 day', u_finance),
    (org_atlas, asg_alpha_aria, 'Verified 60', 60, 1140, 'ready', now() - interval '4 hour', NULL, NULL),
    (org_atlas, asg_alpha_neo,  'Approved 40', 40, 760, 'pending', NULL, NULL, NULL),
    (org_atlas, asg_alpha_neo,  'Verified 60', 60, 1140, 'pending', NULL, NULL, NULL),
    (org_atlas, asg_gamma_aria, 'Approved 40', 40, 400, 'paid', now() - interval '90 day', now() - interval '89 day', u_finance),
    (org_atlas, asg_gamma_aria, 'Verified 60', 60, 600, 'paid', now() - interval '88 day', now() - interval '87 day', u_finance);

  SELECT id INTO ms_alpha_aria_approved FROM public.payment_milestones WHERE assignment_id = asg_alpha_aria AND label ILIKE 'Approved%' LIMIT 1;
  SELECT id INTO ms_alpha_aria_verified FROM public.payment_milestones WHERE assignment_id = asg_alpha_aria AND label ILIKE 'Verified%' LIMIT 1;
  SELECT id INTO ms_alpha_neo_approved FROM public.payment_milestones WHERE assignment_id = asg_alpha_neo AND label ILIKE 'Approved%' LIMIT 1;
  SELECT id INTO ms_alpha_neo_verified FROM public.payment_milestones WHERE assignment_id = asg_alpha_neo AND label ILIKE 'Verified%' LIMIT 1;
  SELECT id INTO ms_gamma_aria_approved FROM public.payment_milestones WHERE assignment_id = asg_gamma_aria AND label ILIKE 'Approved%' LIMIT 1;
  SELECT id INTO ms_gamma_aria_verified FROM public.payment_milestones WHERE assignment_id = asg_gamma_aria AND label ILIKE 'Verified%' LIMIT 1;

  -- Payment transactions for paid milestones
  INSERT INTO public.payment_transactions (
    org_id, assignment_id, milestone_id, method, reference_no, amount, notes, created_by, created_at
  ) VALUES
    (org_atlas, asg_alpha_aria, ms_alpha_aria_approved, 'Bank Transfer', 'SEED-TXN-0001', 760, 'Initial approved payout', u_finance, now() - interval '1 day'),
    (org_atlas, asg_gamma_aria, ms_gamma_aria_approved, 'GCash', 'SEED-TXN-0002', 400, 'Historical approved payout', u_finance, now() - interval '89 day'),
    (org_atlas, asg_gamma_aria, ms_gamma_aria_verified, 'GCash', 'SEED-TXN-0003', 600, 'Historical verified payout', u_finance, now() - interval '87 day');

  -- Optional link code for unlinked influencer
  INSERT INTO public.influencer_link_codes (
    org_id, influencer_id, code, expires_at
  ) VALUES (
    org_atlas,
    inf_luna,
    'SEED-LINK-LUNA-001',
    now() + interval '7 day'
  );

END
$$;

DROP FUNCTION IF EXISTS public._seed_create_auth_user(text, text);

-- 4) Verification output
SELECT
  u.email,
  CASE
    WHEN u.email = 'superadmin.seed@kolkoi.local' THEN 'super_admin'
    WHEN u.email = 'admin.seed@kolkoi.local' THEN 'org_admin'
    WHEN u.email = 'manager.seed@kolkoi.local' THEN 'campaign_manager'
    WHEN u.email = 'finance.seed@kolkoi.local' THEN 'finance'
    ELSE 'influencer_user'
  END AS seeded_role,
  u.id AS auth_user_id
FROM auth.users u
WHERE u.email LIKE '%.seed@kolkoi.local'
ORDER BY seeded_role, u.email;

SELECT
  o.name,
  COUNT(DISTINCT c.id) AS campaigns,
  COUNT(DISTINCT i.id) AS influencers,
  COUNT(DISTINCT a.id) AS assignments,
  COUNT(DISTINCT s.id) AS submissions,
  COUNT(DISTINCT p.id) AS proofs,
  COUNT(DISTINCT m.id) AS milestones
FROM public.organizations o
LEFT JOIN public.campaigns c ON c.org_id = o.id
LEFT JOIN public.influencers i ON i.org_id = o.id
LEFT JOIN public.campaign_assignments a ON a.org_id = o.id
LEFT JOIN public.content_submissions s ON s.org_id = o.id
LEFT JOIN public.post_proofs p ON p.org_id = o.id
LEFT JOIN public.payment_milestones m ON m.org_id = o.id
WHERE o.name LIKE '[SEED] %'
GROUP BY o.name
ORDER BY o.name;

-- Sample login credentials (all share one password in seed)
-- password: SeedPass123!
-- superadmin.seed@kolkoi.local
-- admin.seed@kolkoi.local
-- manager.seed@kolkoi.local
-- finance.seed@kolkoi.local
-- creator1.seed@kolkoi.local
-- creator2.seed@kolkoi.local
