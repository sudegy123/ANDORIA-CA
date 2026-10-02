-- Remove the temporary diagnostic RPC — it was dev-session-only,
-- never meant to stay in the schema (it exposes claim/customer-name
-- pairs, which is a bigger surface than any real customer-facing RPC
-- should have).
drop function if exists public.debug_list_campaign_claims(text);
