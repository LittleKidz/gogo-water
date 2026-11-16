// Shape of one row in public.readings (see CLAUDE.md → Supabase).
export type Reading = {
  id: number;
  received_at: string; // ISO timestamp (server time)
  node_id: number;
  seq: number;
  node_ts: number | null; // node millis() — NOT wall-clock time
  tds_mv: number | null;
  tds_ppm: number | null;
  rssi: number | null;
};

// What the Gateway sends to POST /api/ingest (one item).
export type IngestItem = {
  node_id: number;
  seq: number;
  node_ts: number;
  tds_mv: number;
  tds_ppm: number;
  rssi?: number;
};

// One point of the history chart (from readings_bucketed RPC).
export type ChartPoint = { t: number; ppm: number };
