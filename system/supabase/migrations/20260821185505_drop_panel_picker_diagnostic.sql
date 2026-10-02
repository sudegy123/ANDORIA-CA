-- Remove the temporary diagnostic RPC — dev-session-only, not part of
-- the permanent schema. Investigation confirmed all 5 outstanding
-- campaign claims are genuine (real names, real phone numbers,
-- coherent calculated systems) or previously-flagged-ambiguous; none
-- were created by this session's test scripts. Left entirely
-- untouched — no counter reset, no request changes.
drop function if exists public.debug_list_campaign_claims(text);
