-- Cleanup script for Kolkoi sample data
-- Safe to run multiple times.
-- It only deletes rows tied to:
--   - organizations with name like '[SEED] %'
--   - users with email ending in '.seed@kolkoi.local'

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

  -- Child tables first
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

  -- Auth cleanup
  DELETE FROM auth.identities
  WHERE user_id = ANY(v_seed_user_ids)
     OR provider_id = ANY(v_seed_emails)
     OR (identity_data->>'email') = ANY(v_seed_emails);

  DELETE FROM auth.users
  WHERE id = ANY(v_seed_user_ids)
     OR email = ANY(v_seed_emails);
END
$$;

-- quick verification
SELECT
  (SELECT COUNT(*) FROM public.organizations WHERE name LIKE '[SEED] %') AS seed_orgs_remaining,
  (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%.seed@kolkoi.local') AS seed_auth_users_remaining;
