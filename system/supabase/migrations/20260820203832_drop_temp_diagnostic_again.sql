-- Remove the temporary diagnostic RPC again — dev-session-only,
-- not part of the permanent schema.
drop function if exists public.debug_list_campaign_claims(text);
