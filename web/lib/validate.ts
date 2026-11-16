import type { IngestItem } from "./types";

export const MAX_BATCH = 100;

const ALLOWED_KEYS = new Set(["node_id", "seq", "node_ts", "tds_mv", "tds_ppm", "rssi"]);

type Result = { ok: true; items: IngestItem[] } | { ok: false; error: string };

function isInt(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

function isNum(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}

function validateItem(x: unknown, i: number): IngestItem | string {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return `item ${i}: not an object`;
  const o = x as Record<string, unknown>;

  for (const k of Object.keys(o)) {
    if (!ALLOWED_KEYS.has(k)) return `item ${i}: unknown field "${k}"`;
  }
  if (!isInt(o.node_id, 1, 32)) return `item ${i}: node_id must be int 1–32`;
  if (!isInt(o.seq, 0, Number.MAX_SAFE_INTEGER)) return `item ${i}: seq must be int ≥ 0`;
  if (!isInt(o.node_ts, 0, Number.MAX_SAFE_INTEGER)) return `item ${i}: node_ts must be int ≥ 0`;
  if (!isInt(o.tds_mv, 0, 3300)) return `item ${i}: tds_mv must be int 0–3300`;
  if (!isNum(o.tds_ppm, 0, 5000)) return `item ${i}: tds_ppm must be number 0–5000`;
  if (o.rssi !== undefined && !isInt(o.rssi, -127, 0)) return `item ${i}: rssi must be int -127–0`;

  return {
    node_id: o.node_id,
    seq: o.seq,
    node_ts: o.node_ts,
    tds_mv: o.tds_mv,
    tds_ppm: o.tds_ppm,
    ...(o.rssi !== undefined ? { rssi: o.rssi as number } : {}),
  };
}

/** Accepts one object or an array of objects (store-and-forward batch). */
export function validatePayload(body: unknown): Result {
  const list = Array.isArray(body) ? body : [body];
  if (list.length === 0) return { ok: false, error: "empty array" };
  if (list.length > MAX_BATCH) return { ok: false, error: `max ${MAX_BATCH} items per request` };

  const items: IngestItem[] = [];
  for (let i = 0; i < list.length; i++) {
    const r = validateItem(list[i], i);
    if (typeof r === "string") return { ok: false, error: r };
    items.push(r);
  }
  return { ok: true, items };
}
