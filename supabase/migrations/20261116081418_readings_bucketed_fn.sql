-- Average TDS per time bucket for the dashboard chart (avoids the 1000-row API limit).
-- security invoker => runs as the caller, so RLS on readings still applies (anon = read-only).
create or replace function public.readings_bucketed(
  p_node_id smallint,
  p_from timestamptz,
  p_bucket_s integer
)
returns table (bucket timestamptz, tds_ppm real, n integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select date_bin(make_interval(secs => greatest(p_bucket_s, 1)), r.received_at, timestamptz '2000-01-01') as bucket,
         avg(r.tds_ppm)::real as tds_ppm,
         count(*)::int as n
  from public.readings r
  where r.node_id = p_node_id
    and r.received_at >= p_from
    and r.tds_ppm is not null
  group by 1
  order by 1;
$$;

revoke all on function public.readings_bucketed(smallint, timestamptz, integer) from public;
grant execute on function public.readings_bucketed(smallint, timestamptz, integer) to anon, authenticated;
