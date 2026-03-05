create extension if not exists pgcrypto;

-- V2 role model enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'app_role_type'
  ) THEN
    CREATE TYPE public.app_role_type AS ENUM ('superadmin', 'client', 'manager', 'influencer');
  END IF;
END
$$;

-- Core role profile table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  app_role public.app_role_type NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Client + brand model
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  timezone text NOT NULL DEFAULT 'Asia/Manila',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_brands_updated_at ON public.brands;
CREATE TRIGGER set_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_client_name_unique
  ON public.brands (client_id, lower(name));

CREATE TABLE IF NOT EXISTS public.manager_brand_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (manager_user_id, brand_id)
);

ALTER TABLE public.manager_brand_access ENABLE ROW LEVEL SECURITY;

-- Campaign manager collaborators
CREATE TABLE IF NOT EXISTS public.campaign_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  manager_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_owner boolean NOT NULL DEFAULT false,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, manager_user_id)
);

ALTER TABLE public.campaign_managers ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_managers_owner_unique
  ON public.campaign_managers (campaign_id)
  WHERE is_owner = true;

-- Campaign V2 fields (lock, versioning, ownership)
ALTER TABLE IF EXISTS public.campaigns
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner_manager_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Manila',
  ADD COLUMN IF NOT EXISTS root_campaign_id uuid,
  ADD COLUMN IF NOT EXISTS version_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz,
  ADD COLUMN IF NOT EXISTS change_note text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_root_campaign_fk'
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_root_campaign_fk
      FOREIGN KEY (root_campaign_id)
      REFERENCES public.campaigns(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

UPDATE public.campaigns
SET root_campaign_id = id
WHERE root_campaign_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_root_version_unique
  ON public.campaigns (root_campaign_id, version_number);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_version_positive'
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_version_positive
      CHECK (version_number > 0);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.enforce_campaign_lock_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_locked = true AND NEW.is_locked = false THEN
    RAISE EXCEPTION 'Locked campaigns cannot be unlocked.';
  END IF;

  IF OLD.is_locked = false
     AND NEW.is_locked = true
     AND NEW.client_approved_at IS NULL THEN
    RAISE EXCEPTION 'Campaign must be client-approved before locking.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_campaign_lock_rules_trigger ON public.campaigns;
CREATE TRIGGER enforce_campaign_lock_rules_trigger
BEFORE UPDATE OF is_locked, client_approved_at ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.enforce_campaign_lock_rules();

CREATE OR REPLACE FUNCTION public.block_locked_campaign_deliverable_mutations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_campaign_id uuid;
  v_locked boolean;
BEGIN
  v_campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);

  SELECT c.is_locked
  INTO v_locked
  FROM public.campaigns c
  WHERE c.id = v_campaign_id;

  IF v_locked THEN
    RAISE EXCEPTION 'Deliverables cannot be modified once a campaign is locked.';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS block_locked_campaign_deliverables_insert ON public.campaign_deliverables;
CREATE TRIGGER block_locked_campaign_deliverables_insert
BEFORE INSERT ON public.campaign_deliverables
FOR EACH ROW
EXECUTE FUNCTION public.block_locked_campaign_deliverable_mutations();

DROP TRIGGER IF EXISTS block_locked_campaign_deliverables_update ON public.campaign_deliverables;
CREATE TRIGGER block_locked_campaign_deliverables_update
BEFORE UPDATE ON public.campaign_deliverables
FOR EACH ROW
EXECUTE FUNCTION public.block_locked_campaign_deliverable_mutations();

DROP TRIGGER IF EXISTS block_locked_campaign_deliverables_delete ON public.campaign_deliverables;
CREATE TRIGGER block_locked_campaign_deliverables_delete
BEFORE DELETE ON public.campaign_deliverables
FOR EACH ROW
EXECUTE FUNCTION public.block_locked_campaign_deliverable_mutations();

-- Deliverable platform support: add TikTok in enum/text models
DO $$
DECLARE
  v_udt_name text;
BEGIN
  SELECT c.udt_name
  INTO v_udt_name
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'campaign_deliverables'
    AND c.column_name = 'platform'
  LIMIT 1;

  IF v_udt_name IS NULL THEN
    RETURN;
  END IF;

  IF v_udt_name = 'text' OR v_udt_name = 'varchar' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'campaign_deliverables_platform_v2_check'
    ) THEN
      ALTER TABLE public.campaign_deliverables
        ADD CONSTRAINT campaign_deliverables_platform_v2_check
        CHECK (platform IN ('facebook_page', 'instagram', 'tiktok'));
    END IF;
  ELSE
    BEGIN
      EXECUTE format('ALTER TYPE public.%I ADD VALUE IF NOT EXISTS %L', v_udt_name, 'tiktok');
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END IF;
END
$$;

-- Assignment invite controls
ALTER TABLE IF EXISTS public.campaign_assignments
  ADD COLUMN IF NOT EXISTS invited_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS canceled_reason text;

UPDATE public.campaign_assignments
SET invited_expires_at = COALESCE(invited_at, now()) + interval '7 days'
WHERE status = 'invited'
  AND invited_expires_at IS NULL;

CREATE OR REPLACE FUNCTION public.ensure_invite_expiry_default()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'invited' AND NEW.invited_expires_at IS NULL THEN
    NEW.invited_expires_at := COALESCE(NEW.invited_at, now()) + interval '7 days';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_invite_expiry_default_trigger ON public.campaign_assignments;
CREATE TRIGGER ensure_invite_expiry_default_trigger
BEFORE INSERT OR UPDATE OF status, invited_at ON public.campaign_assignments
FOR EACH ROW
EXECUTE FUNCTION public.ensure_invite_expiry_default();

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY campaign_id, influencer_id
      ORDER BY COALESCE(invited_at, responded_at, accepted_at, now()) DESC, id DESC
    ) AS rn
  FROM public.campaign_assignments
)
UPDATE public.campaign_assignments a
SET status = 'removed'
FROM ranked r
WHERE a.id = r.id
  AND r.rn > 1
  AND a.status <> 'removed';

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_assignments_campaign_influencer_unique_active
  ON public.campaign_assignments (campaign_id, influencer_id)
  WHERE status <> 'removed';

-- Change requests + recommendations + disputes
CREATE TABLE IF NOT EXISTS public.campaign_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  request_note text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'approved', 'rejected', 'implemented')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  implemented_campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_change_requests ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_campaign_change_requests_updated_at ON public.campaign_change_requests;
CREATE TRIGGER set_campaign_change_requests_updated_at
BEFORE UPDATE ON public.campaign_change_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TABLE IF NOT EXISTS public.campaign_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  influencer_id uuid NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  alias text NOT NULL,
  region text,
  age_bucket text,
  gender text,
  followers bigint,
  page_likes bigint,
  posts_count bigint,
  engagement_rate numeric(6,2),
  avg_reacts bigint,
  manager_score numeric(5,2) CHECK (manager_score BETWEEN 0 AND 100),
  performance_score numeric(5,2) CHECK (performance_score BETWEEN 0 AND 100),
  audience_match_score numeric(5,2) CHECK (audience_match_score BETWEEN 0 AND 100),
  fit_score numeric(5,2) CHECK (fit_score BETWEEN 0 AND 100),
  scoring_window_days integer NOT NULL DEFAULT 90,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, influencer_id),
  UNIQUE (campaign_id, alias)
);

ALTER TABLE public.campaign_recommendations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.dispute_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.campaign_assignments(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  opened_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  manager_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'rejected')),
  resolution_note text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dispute_tickets ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_dispute_tickets_updated_at ON public.dispute_tickets;
CREATE TRIGGER set_dispute_tickets_updated_at
BEFORE UPDATE ON public.dispute_tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Payments: required reference + exact milestone amount
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_transactions'
      AND column_name = 'reference_no'
  ) THEN
    UPDATE public.payment_transactions
    SET reference_no = CONCAT('LEGACY-', id::text)
    WHERE reference_no IS NULL OR btrim(reference_no) = '';

    ALTER TABLE public.payment_transactions
      ALTER COLUMN reference_no SET NOT NULL;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.enforce_exact_milestone_transaction_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_milestone_amount numeric;
BEGIN
  SELECT amount
  INTO v_milestone_amount
  FROM public.payment_milestones
  WHERE id = NEW.milestone_id;

  IF v_milestone_amount IS NULL THEN
    RAISE EXCEPTION 'Invalid milestone for payment transaction.';
  END IF;

  IF COALESCE(NEW.amount, 0) <> COALESCE(v_milestone_amount, 0) THEN
    RAISE EXCEPTION 'Payment transaction amount must match exact milestone amount.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_exact_payment_amount_trigger ON public.payment_transactions;
CREATE TRIGGER enforce_exact_payment_amount_trigger
BEFORE INSERT OR UPDATE OF amount, milestone_id ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_exact_milestone_transaction_amount();

-- Role helpers
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS public.app_role_type
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role public.app_role_type;
  v_uid uuid;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.app_role
  INTO v_role
  FROM public.user_profiles p
  WHERE p.user_id = v_uid
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  IF public.is_super_admin() THEN
    RETURN 'superadmin'::public.app_role_type;
  END IF;

  IF EXISTS (SELECT 1 FROM public.clients c WHERE c.user_id = v_uid) THEN
    RETURN 'client'::public.app_role_type;
  END IF;

  IF EXISTS (SELECT 1 FROM public.org_members m WHERE m.user_id = v_uid) THEN
    RETURN 'manager'::public.app_role_type;
  END IF;

  IF EXISTS (SELECT 1 FROM public.influencers i WHERE i.user_id = v_uid) THEN
    RETURN 'influencer'::public.app_role_type;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.current_app_role() FROM public;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_app_role(target_role public.app_role_type)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.current_app_role() = target_role;
$$;

REVOKE ALL ON FUNCTION public.has_app_role(public.app_role_type) FROM public;
GRANT EXECUTE ON FUNCTION public.has_app_role(public.app_role_type) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_client_for_brand(p_brand_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.brands b
    JOIN public.clients c ON c.id = b.client_id
    WHERE b.id = p_brand_id
      AND c.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager_for_campaign(p_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns c
    WHERE c.id = p_campaign_id
      AND (
        c.owner_manager_user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.campaign_managers cm
          WHERE cm.campaign_id = c.id
            AND cm.manager_user_id = auth.uid()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_client_for_campaign(p_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.campaigns c
    JOIN public.brands b ON b.id = c.brand_id
    JOIN public.clients cl ON cl.id = b.client_id
    WHERE c.id = p_campaign_id
      AND cl.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_client_for_brand(uuid) FROM public;
REVOKE ALL ON FUNCTION public.is_manager_for_campaign(uuid) FROM public;
REVOKE ALL ON FUNCTION public.is_client_for_campaign(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_client_for_brand(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_for_campaign(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_client_for_campaign(uuid) TO authenticated;

-- Backfill V2 roles from legacy data
INSERT INTO public.user_profiles (user_id, app_role)
SELECT pa.user_id, 'superadmin'::public.app_role_type
FROM public.platform_admins pa
ON CONFLICT (user_id) DO UPDATE
SET app_role = EXCLUDED.app_role,
    updated_at = now();

INSERT INTO public.user_profiles (user_id, app_role)
SELECT c.user_id, 'client'::public.app_role_type
FROM public.clients c
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_profiles (user_id, app_role)
SELECT DISTINCT m.user_id, 'manager'::public.app_role_type
FROM public.org_members m
WHERE m.user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_profiles (user_id, app_role)
SELECT DISTINCT i.user_id, 'influencer'::public.app_role_type
FROM public.influencers i
WHERE i.user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- RLS policies: user_profiles
DROP POLICY IF EXISTS "user_profiles_select_self_or_superadmin" ON public.user_profiles;
CREATE POLICY "user_profiles_select_self_or_superadmin"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "user_profiles_insert_self" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_self"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "user_profiles_update_self_or_superadmin" ON public.user_profiles;
CREATE POLICY "user_profiles_update_self_or_superadmin"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_super_admin())
WITH CHECK (user_id = auth.uid() OR public.is_super_admin());

-- RLS policies: clients
DROP POLICY IF EXISTS "clients_select_owner_or_superadmin" ON public.clients;
CREATE POLICY "clients_select_owner_or_superadmin"
ON public.clients
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "clients_insert_self_or_superadmin" ON public.clients;
CREATE POLICY "clients_insert_self_or_superadmin"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "clients_update_owner_or_superadmin" ON public.clients;
CREATE POLICY "clients_update_owner_or_superadmin"
ON public.clients
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_super_admin())
WITH CHECK (user_id = auth.uid() OR public.is_super_admin());

-- RLS policies: brands
DROP POLICY IF EXISTS "brands_select_related_or_superadmin" ON public.brands;
CREATE POLICY "brands_select_related_or_superadmin"
ON public.brands
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_client_for_brand(id)
  OR EXISTS (
    SELECT 1
    FROM public.manager_brand_access mba
    WHERE mba.brand_id = brands.id
      AND mba.manager_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "brands_insert_client_owner_or_superadmin" ON public.brands;
CREATE POLICY "brands_insert_client_owner_or_superadmin"
ON public.brands
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = brands.client_id
      AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "brands_update_client_owner_or_superadmin" ON public.brands;
CREATE POLICY "brands_update_client_owner_or_superadmin"
ON public.brands
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_client_for_brand(id)
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_client_for_brand(id)
);

-- RLS policies: manager_brand_access
DROP POLICY IF EXISTS "manager_brand_access_select_related_or_superadmin" ON public.manager_brand_access;
CREATE POLICY "manager_brand_access_select_related_or_superadmin"
ON public.manager_brand_access
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR manager_user_id = auth.uid()
  OR public.is_client_for_brand(brand_id)
);

DROP POLICY IF EXISTS "manager_brand_access_insert_client_or_superadmin" ON public.manager_brand_access;
CREATE POLICY "manager_brand_access_insert_client_or_superadmin"
ON public.manager_brand_access
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR public.is_client_for_brand(brand_id)
);

DROP POLICY IF EXISTS "manager_brand_access_delete_client_or_superadmin" ON public.manager_brand_access;
CREATE POLICY "manager_brand_access_delete_client_or_superadmin"
ON public.manager_brand_access
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_client_for_brand(brand_id)
);

-- RLS policies: campaign_managers
DROP POLICY IF EXISTS "campaign_managers_select_related_or_superadmin" ON public.campaign_managers;
CREATE POLICY "campaign_managers_select_related_or_superadmin"
ON public.campaign_managers
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR manager_user_id = auth.uid()
  OR public.is_manager_for_campaign(campaign_id)
  OR public.is_client_for_campaign(campaign_id)
);

DROP POLICY IF EXISTS "campaign_managers_mutate_manager_or_superadmin" ON public.campaign_managers;
CREATE POLICY "campaign_managers_mutate_manager_or_superadmin"
ON public.campaign_managers
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_manager_for_campaign(campaign_id)
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_manager_for_campaign(campaign_id)
);

-- RLS policies: campaign_change_requests
DROP POLICY IF EXISTS "campaign_change_requests_select_related" ON public.campaign_change_requests;
CREATE POLICY "campaign_change_requests_select_related"
ON public.campaign_change_requests
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR requested_by = auth.uid()
  OR public.is_manager_for_campaign(campaign_id)
  OR public.is_client_for_campaign(campaign_id)
);

DROP POLICY IF EXISTS "campaign_change_requests_insert_client_on_locked" ON public.campaign_change_requests;
CREATE POLICY "campaign_change_requests_insert_client_on_locked"
ON public.campaign_change_requests
FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND public.is_client_for_campaign(campaign_id)
  AND EXISTS (
    SELECT 1
    FROM public.campaigns c
    WHERE c.id = campaign_change_requests.campaign_id
      AND c.is_locked = true
  )
);

DROP POLICY IF EXISTS "campaign_change_requests_update_manager_or_superadmin" ON public.campaign_change_requests;
CREATE POLICY "campaign_change_requests_update_manager_or_superadmin"
ON public.campaign_change_requests
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_manager_for_campaign(campaign_id)
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_manager_for_campaign(campaign_id)
);

-- RLS policies: campaign_recommendations
DROP POLICY IF EXISTS "campaign_recommendations_select_related" ON public.campaign_recommendations;
CREATE POLICY "campaign_recommendations_select_related"
ON public.campaign_recommendations
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_manager_for_campaign(campaign_id)
  OR public.is_client_for_campaign(campaign_id)
);

DROP POLICY IF EXISTS "campaign_recommendations_mutate_manager_or_superadmin" ON public.campaign_recommendations;
CREATE POLICY "campaign_recommendations_mutate_manager_or_superadmin"
ON public.campaign_recommendations
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_manager_for_campaign(campaign_id)
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_manager_for_campaign(campaign_id)
);

-- RLS policies: dispute_tickets
DROP POLICY IF EXISTS "dispute_tickets_select_related" ON public.dispute_tickets;
CREATE POLICY "dispute_tickets_select_related"
ON public.dispute_tickets
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR opened_by = auth.uid()
  OR manager_user_id = auth.uid()
  OR public.is_client_for_campaign(campaign_id)
);

DROP POLICY IF EXISTS "dispute_tickets_insert_influencer_owner" ON public.dispute_tickets;
CREATE POLICY "dispute_tickets_insert_influencer_owner"
ON public.dispute_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  opened_by = auth.uid()
  AND public.current_app_role() = 'influencer'::public.app_role_type
  AND EXISTS (
    SELECT 1
    FROM public.campaign_assignments a
    JOIN public.influencers i ON i.id = a.influencer_id
    WHERE a.id = dispute_tickets.assignment_id
      AND i.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "dispute_tickets_update_manager_or_superadmin" ON public.dispute_tickets;
CREATE POLICY "dispute_tickets_update_manager_or_superadmin"
ON public.dispute_tickets
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR manager_user_id = auth.uid()
)
WITH CHECK (
  public.is_super_admin()
  OR manager_user_id = auth.uid()
);

-- Anti-bypass guardrails for clients on direct influencer/assignment access
ALTER TABLE IF EXISTS public.influencers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "v2_block_client_direct_influencer_select" ON public.influencers;
CREATE POLICY "v2_block_client_direct_influencer_select"
ON public.influencers
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.current_app_role() <> 'client'::public.app_role_type OR public.is_super_admin());

ALTER TABLE IF EXISTS public.campaign_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "v2_block_client_direct_assignment_select" ON public.campaign_assignments;
CREATE POLICY "v2_block_client_direct_assignment_select"
ON public.campaign_assignments
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.current_app_role() <> 'client'::public.app_role_type OR public.is_super_admin());

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_brands_client_id ON public.brands (client_id);
CREATE INDEX IF NOT EXISTS idx_manager_brand_access_manager ON public.manager_brand_access (manager_user_id);
CREATE INDEX IF NOT EXISTS idx_manager_brand_access_brand ON public.manager_brand_access (brand_id);
CREATE INDEX IF NOT EXISTS idx_campaign_managers_campaign ON public.campaign_managers (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_managers_manager ON public.campaign_managers (manager_user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_change_requests_campaign ON public.campaign_change_requests (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recommendations_campaign ON public.campaign_recommendations (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recommendations_fit_score ON public.campaign_recommendations (fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_dispute_tickets_assignment ON public.dispute_tickets (assignment_id);

