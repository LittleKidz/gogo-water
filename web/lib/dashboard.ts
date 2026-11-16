// Pure helpers for the dashboard (no React, easy to explain/test).
import type { ChartPoint, Reading } from "./types";

export const TDS_LIMIT = 1000; // ppm — กรมอนามัย
export const TDS_WARN = 900; // ppm — our own early-warning line (not from a standard)
export const ONLINE_MS = 30_000; // node is "online" if last reading is newer than this
export const NODE1 = 1;

export type RangeKey = "1h" | "24h" | "7d";
export const RANGES: Record<RangeKey, { label: string; ms: number; bucketS: number }> = {
  "1h": { label: "1 ชม.", ms: 3_600_000, bucketS: 30 },
  "24h": { label: "24 ชม.", ms: 86_400_000, bucketS: 600 },
  "7d": { label: "7 วัน", ms: 7 * 86_400_000, bucketS: 3600 },
};

// ---------- water status (rule-based for now; AI later) ----------
export type WaterLevel = "safe" | "warning" | "unsafe" | "unknown";

export function waterStatus(latest: Reading | undefined, now: number | null) {
  if (!latest || latest.tds_ppm == null || now == null) {
    return { level: "unknown" as WaterLevel, reason: "ยังไม่มีข้อมูลจาก Node1" };
  }
  if (now - Date.parse(latest.received_at) > ONLINE_MS) {
    return { level: "unknown" as WaterLevel, reason: "Node1 ไม่ได้ส่งข้อมูลเกิน 30 วินาที" };
  }
  const ppm = latest.tds_ppm;
  if (ppm > TDS_LIMIT) return { level: "unsafe" as WaterLevel, reason: `TDS ${fmtPpm(ppm)} ppm เกินเกณฑ์ ${TDS_LIMIT} ppm` };
  if (ppm > TDS_WARN) return { level: "warning" as WaterLevel, reason: `TDS ${fmtPpm(ppm)} ppm ใกล้เกณฑ์ ${TDS_LIMIT} ppm` };
  return { level: "safe" as WaterLevel, reason: `TDS ต่ำกว่าเกณฑ์ ${TDS_LIMIT} ppm` };
}

// ---------- packet delivery rate from seq gaps ----------
/** readings must be one node, newest first. seq going down = node rebooted → new segment. */
export function packetDelivery(readings: Reading[]): number | null {
  if (readings.length < 2) return null;
  const asc = [...readings].reverse();
  let expected = 0;
  let received = 0;
  let seen = new Set<number>();
  let lo = asc[0].seq;
  let prev = asc[0].seq;
  const close = () => {
    expected += Math.max(...seen) - lo + 1;
    received += seen.size;
  };
  for (const r of asc) {
    if (r.seq < prev) {
      // seq went down → node rebooted → start a new segment
      close();
      seen = new Set();
      lo = r.seq;
    }
    seen.add(r.seq);
    prev = r.seq;
  }
  close();
  return expected > 0 ? Math.min(1, received / expected) : null;
}

// ---------- formatting ----------
const TZ = "Asia/Bangkok";
export const fmtPpm = (v: number) => (v >= 100 ? Math.round(v).toString() : v.toFixed(1));
export const fmtClock = (iso: string | number) =>
  new Date(iso).toLocaleTimeString("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
export const fmtHM = (t: number) =>
  new Date(t).toLocaleTimeString("th-TH", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
export const fmtDay = (t: number) => new Date(t).toLocaleDateString("th-TH", { timeZone: TZ, day: "numeric", month: "short" });

export function fmtAgo(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} วิ`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} นาที`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} ชม.`;
  return `${Math.round(h / 24)} วัน`;
}

// ---------- SVG path builders ----------
/**
 * Line + area paths for a time series. Breaks the line where there is a gap
 * bigger than `maxGapMs` so offline periods are not drawn as a straight line.
 */
export function buildPaths(
  pts: ChartPoint[],
  opts: { w: number; h: number; t0: number; t1: number; yMin: number; yMax: number; maxGapMs: number },
) {
  const { w, h, t0, t1, yMin, yMax, maxGapMs } = opts;
  const x = (t: number) => ((t - t0) / Math.max(1, t1 - t0)) * w;
  const y = (v: number) => h - ((Math.min(Math.max(v, yMin), yMax) - yMin) / Math.max(1e-9, yMax - yMin)) * h;

  const segments: ChartPoint[][] = [];
  for (const p of pts) {
    const seg = segments[segments.length - 1];
    if (!seg || p.t - seg[seg.length - 1].t > maxGapMs) segments.push([p]);
    else seg.push(p);
  }

  let line = "";
  let area = "";
  for (const seg of segments) {
    const d = seg.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.ppm).toFixed(1)}`).join(" ");
    line += d + " ";
    if (seg.length > 1) {
      area += `${d} L${x(seg[seg.length - 1].t).toFixed(1)} ${h} L${x(seg[0].t).toFixed(1)} ${h} Z `;
    }
  }
  // a single isolated point → tiny dot so it is still visible
  const dots = segments.filter((s) => s.length === 1).map((s) => ({ cx: x(s[0].t), cy: y(s[0].ppm) }));
  return { line: line.trim(), area: area.trim(), dots };
}

/** Merge one new reading into bucketed chart points (keeps a running average per bucket). */
export function mergeIntoBuckets(
  pts: (ChartPoint & { n: number })[],
  r: Reading,
  bucketS: number,
  fromMs: number,
): (ChartPoint & { n: number })[] {
  if (r.tds_ppm == null) return pts;
  const t = Date.parse(r.received_at);
  const size = bucketS * 1000;
  const b = Math.floor(t / size) * size; // same origin as date_bin(…, '2000-01-01') for these sizes
  const out = pts.filter((p) => p.t >= fromMs - size);
  const last = out[out.length - 1];
  if (last && last.t === b) {
    const n = last.n + 1;
    out[out.length - 1] = { t: b, ppm: (last.ppm * last.n + r.tds_ppm) / n, n };
  } else if (!last || b > last.t) {
    out.push({ t: b, ppm: r.tds_ppm, n: 1 });
  }
  return out;
}

// ---------- event log (derived from real readings) ----------
export type EventItem = { t: number; text: string; tone: "info" | "ok" | "warn" | "bad" | "muted" };

/** readings: newest first. Produces level changes, reconnects after a gap, and the latest reading. */
export function deriveEvents(readings: Reading[], limit = 6): EventItem[] {
  const asc = readings.filter((r) => r.node_id === NODE1).reverse();
  const ev: EventItem[] = [];
  const level = (ppm: number | null) => (ppm == null ? null : ppm > TDS_LIMIT ? "unsafe" : ppm > TDS_WARN ? "warning" : "safe");

  for (let i = 0; i < asc.length; i++) {
    const r = asc[i];
    const t = Date.parse(r.received_at);
    const prev = asc[i - 1];
    if (prev) {
      const gap = t - Date.parse(prev.received_at);
      if (gap > ONLINE_MS) ev.push({ t, text: `Node1 กลับมาออนไลน์ (ขาดไป ${fmtAgo(gap)})`, tone: "ok" });
      if (r.seq < prev.seq) ev.push({ t, text: "Node1 รีบูต (seq เริ่มใหม่)", tone: "muted" });
      const a = level(prev.tds_ppm);
      const b = level(r.tds_ppm);
      if (a && b && a !== b && r.tds_ppm != null) {
        const ppm = fmtPpm(r.tds_ppm);
        if (b === "unsafe") ev.push({ t, text: `TDS เกินเกณฑ์ · ${ppm} ppm`, tone: "bad" });
        else if (b === "warning") ev.push({ t, text: `TDS ใกล้เกณฑ์ · ${ppm} ppm`, tone: "warn" });
        else ev.push({ t, text: `TDS กลับสู่ปกติ · ${ppm} ppm`, tone: "ok" });
      }
    }
  }
  const latest = asc[asc.length - 1];
  if (latest?.tds_ppm != null) {
    ev.push({ t: Date.parse(latest.received_at), text: `Node1 ส่งค่า TDS ${fmtPpm(latest.tds_ppm)} ppm`, tone: "info" });
  }
  return ev.sort((a, b) => b.t - a.t).slice(0, limit);
}
