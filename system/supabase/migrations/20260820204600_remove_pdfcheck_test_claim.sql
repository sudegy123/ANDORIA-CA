-- Remove the campaign-slot claim + mark the CRM request cancelled for
-- "PDF Check" — this session's own PDF-generation test script
-- accidentally omitted mocking the CRM/campaign side effects (unlike
-- its sibling test scripts), so it consumed one real slot. Confirmed
-- self-created test data (exact name match to the test script), safe
-- to clean up. The other outstanding claim ("لننلنلة44") remains
-- deliberately untouched — not self-identified as test data.
delete from public.campaign_slot_claims
where request_id in (select id from public.requests where customer ->> 'name' = 'PDF Check');

update public.campaign_slots
set slots_used = (select count(*) from public.campaign_slot_claims where campaign_id = 'first_100_install')
where id = 'first_100_install';

update public.requests
set status = 'cancelled',
    notes = 'TEST DATA — created by an automated PDF-generation QA script during development (script bug: forgot to mock the CRM/campaign side effects). Not a real customer lead.'
where customer ->> 'name' = 'PDF Check';

drop function if exists public.debug_list_campaign_claims(text);
