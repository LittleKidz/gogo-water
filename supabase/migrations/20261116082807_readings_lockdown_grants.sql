-- Defense in depth: browser roles may only SELECT readings, even if a wrong RLS policy is added later.
-- (RLS does not apply to TRUNCATE, so table privileges must be tight too.)
-- service_role (server secret key used by /api/ingest) keeps its privileges.
revoke all on table public.readings from anon, authenticated;
grant select on table public.readings to anon, authenticated;
