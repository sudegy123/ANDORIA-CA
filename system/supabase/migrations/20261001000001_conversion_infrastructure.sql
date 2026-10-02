-- ============================================================
-- CONVERSION INFRASTRUCTURE
-- Migration: 20261001000001_conversion_infrastructure.sql
-- Date: 2026-10-01
-- ============================================================

-- 1. UTM TRACKING FIELDS
ALTER TABLE requests
  ADD COLUMN IF NOT EXISTS utm_source     text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_medium     text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_campaign   text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_content    text DEFAULT '',
  ADD COLUMN IF NOT EXISTS utm_term       text DEFAULT '',
  ADD COLUMN IF NOT EXISTS referrer       text DEFAULT '',
  ADD COLUMN IF NOT EXISTS landing_page   text DEFAULT '',
  ADD COLUMN IF NOT EXISTS lead_score     smallint DEFAULT 0;

-- 2. TASKS TABLE (Follow ups)
CREATE TABLE IF NOT EXISTS tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    uuid REFERENCES requests(id) ON DELETE CASCADE,
  assigned_to   uuid REFERENCES profiles(id),
  title         text NOT NULL,
  description   text DEFAULT '',
  due_at        timestamptz NOT NULL,
  completed_at  timestamptz,
  priority      text DEFAULT 'medium',
  task_type     text DEFAULT 'follow_up',
  created_at    timestamptz DEFAULT now()
);

-- 3. AUTO ASSIGN BRANCH
CREATE OR REPLACE FUNCTION auto_assign_branch(p_state_id text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE
    WHEN p_state_id IN ('khartoum') THEN 'khartoum_kober'
    WHEN p_state_id IN ('gezira', 'sennar', 'blue_nile') THEN 'madani'
    ELSE 'khartoum_kober'
  END;
END;
$$;

-- 4. ENRICH LEAD TRIGGER (Auto sets Score and Branch)
CREATE OR REPLACE FUNCTION enrich_new_lead()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.branch := COALESCE(NEW.branch, auto_assign_branch(COALESCE(NEW.customer->>'stateId', '')));
  NEW.lead_score := COALESCE((NEW.system->>'leadScore')::smallint, 0);
  NEW.utm_source := COALESCE(NEW.system->'utm'->>'utm_source', '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enrich_new_lead ON requests;
CREATE TRIGGER trg_enrich_new_lead BEFORE INSERT ON requests FOR EACH ROW EXECUTE FUNCTION enrich_new_lead();
