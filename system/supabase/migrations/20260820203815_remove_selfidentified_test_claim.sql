-- Remove exactly one campaign-slot claim: customer name "تجرّبه 45"
-- ("test 45" in Arabic) — self-identified as test data by its own
-- content, unlike the other outstanding claim (name "لننلنلة44"),
-- which is ambiguous and deliberately left untouched pending the
-- business owner's own confirmation (per explicit instruction: do not
-- reset real customer activity without being sure it's test data).
delete from public.campaign_slot_claims
where request_id in (select id from public.requests where customer ->> 'name' = 'تجرّبه 45');

update public.campaign_slots
set slots_used = (select count(*) from public.campaign_slot_claims where campaign_id = 'first_100_install')
where id = 'first_100_install';

update public.requests
set status = 'cancelled',
    notes = 'TEST DATA — customer self-identified this as a test ("تجربة" = test/trial). Not a real customer lead.'
where customer ->> 'name' = 'تجرّبه 45';
