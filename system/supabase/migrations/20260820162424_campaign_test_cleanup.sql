-- Remove the two test claims used to verify claim_campaign_slot()'s
-- dedup behavior during development, and reset the counter to a clean
-- 100 remaining before any real customer uses the offer.
delete from public.campaign_slot_claims
where phone_normalized in ('249999999999', '249888888888');

update public.campaign_slots
set slots_used = 0
where id = 'first_100_install';
