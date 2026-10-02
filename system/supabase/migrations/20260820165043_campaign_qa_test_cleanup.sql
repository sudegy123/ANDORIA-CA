-- Remove the campaign-slot claim created by this session's automated
-- browser QA run ("QA Tester") and recompute slots_used from the
-- actual remaining claim rows, so the public counter is exactly
-- correct again. The matching CRM request cannot be deleted — this
-- schema deliberately blocks deleting `requests` (append-only
-- timeline_events cascade guard) — so instead it's marked cancelled
-- with a clear note identifying it as QA test data, rather than left
-- looking like a real lead in the pipeline.
delete from public.campaign_slot_claims
where request_id in (select id from public.requests where customer ->> 'name' = 'QA Tester');

update public.campaign_slots
set slots_used = (select count(*) from public.campaign_slot_claims where campaign_id = 'first_100_install')
where id = 'first_100_install';

update public.requests
set status = 'cancelled',
    notes = 'TEST DATA — created by an automated browser QA run during development. Not a real customer lead.'
where customer ->> 'name' = 'QA Tester';
