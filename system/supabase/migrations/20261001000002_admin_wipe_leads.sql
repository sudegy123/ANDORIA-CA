-- ============================================================
-- ADMIN WIPE LEADS RPC
-- Purpose: Safely delete all leads/requests to reset counters.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_wipe_all_leads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security: Only OWNER or ADMIN can perform a factory reset
  IF NOT public.is_owner_or('ADMIN') THEN
    RAISE EXCEPTION 'Access denied. Must be ADMIN or OWNER to wipe data.';
  END IF;

  -- Delete all requests. Timeline events, tasks, and notifications cascade.
  DELETE FROM public.requests;
  
  -- Delete all projects. Payments and installments cascade.
  DELETE FROM public.projects;

  -- Reset the request ID sequence so new leads start from SOL-000001 again
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'request_seq') THEN
    ALTER SEQUENCE request_seq RESTART WITH 1;
  END IF;
END;
$$;
