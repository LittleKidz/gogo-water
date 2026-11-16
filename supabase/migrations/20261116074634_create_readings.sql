create table public.readings (
  id          bigint generated always as identity primary key,
  received_at timestamptz not null default now(),   -- time the API stored it
  node_id     smallint    not null check (node_id between 1 and 32),
  seq         bigint      not null check (seq >= 0),  -- per-node counter (resets on node reboot)
  node_ts     bigint,                                  -- node millis() when measured
  tds_mv      integer     check (tds_mv between 0 and 3300),
  tds_ppm     real        check (tds_ppm between 0 and 5000),
  rssi        smallint
);

create index readings_received_at_idx on public.readings (received_at desc);
create index readings_node_idx on public.readings (node_id, received_at desc);

comment on table public.readings is 'GoGo Water raw sensor data (M5). Inserted only by the Vercel API with the secret key.';

-- RLS: browser (anon/publishable key) may only READ; no insert/update/delete policies,
-- so writes are possible only with the server-side secret/service-role key.
alter table public.readings enable row level security;

create policy "dashboard can read readings"
  on public.readings for select
  to anon, authenticated
  using (true);

-- live dashboard
alter publication supabase_realtime add table public.readings;
