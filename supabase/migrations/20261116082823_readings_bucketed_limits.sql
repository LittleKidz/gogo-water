-- Limit how expensive one public call can be (anti-DoS):
--  * look back at most 8 days
--  * bucket at least 10 s, and large enough that one call returns <= ~1000 buckets
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
  with p as (
    select greatest(p_from, now() - interval '8 days') as from_ts
  ), b as (
    select from_ts,
           greatest(
             coalesce(p_bucket_s, 10),
             10,
             ceil(extract(epoch from (now() - from_ts)) / 1000)::int
           ) as bucket_s
    from p
  )
  select date_bin(make_interval(secs => b.bucket_s), r.received_at, timestamptz '2000-01-01') as bucket,
         avg(r.tds_ppm)::real as tds_ppm,
         count(*)::int as n
  from public.readings r, b
  where r.node_id = p_node_id
    and r.received_at >= b.from_ts
    and r.tds_ppm is not null
  group by 1
  order by 1;
$$;

revoke all on function public.readings_bucketed(smallint, timestamptz, integer) from public;
grant execute on function public.readings_bucketed(smallint, timestamptz, integer) to anon, authenticated;
