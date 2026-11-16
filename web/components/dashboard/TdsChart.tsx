"use client";

import { useState } from "react";
import { buildPaths, fmtDay, fmtHM, fmtPpm, RANGES, TDS_LIMIT, type RangeKey } from "@/lib/dashboard";
import type { ChartPoint } from "@/lib/types";
import { Card, CardTitle } from "./ui";

const W = 760;
const H = 240;

type Props = {
  range: RangeKey;
  onRange: (r: RangeKey) => void;
  pts: ChartPoint[] | null; // null = loading
  now: number | null;
};

export default function TdsChart({ range, onRange, pts, now }: Props) {
  const [hover, setHover] = useState<ChartPoint | null>(null);
  const cfg = RANGES[range];
  const t1 = now ?? 0;
  const t0 = t1 - cfg.ms;

  // y axis: 0 → 1000 like the mockup; grows in steps of 250 if values exceed the limit
  const maxVal = pts && pts.length ? Math.max(...pts.map((p) => p.ppm)) : 0;
  const yMax = Math.max(TDS_LIMIT, Math.ceil((maxVal * 1.05) / 250) * 250);
  const yTicks = [0, 1, 2, 3, 4].map((i) => Math.round(yMax - (yMax / 4) * i));
  const limitY = H - (TDS_LIMIT / yMax) * H;

  const paths =
    pts && now != null
      ? buildPaths(pts, { w: W, h: H, t0, t1, yMin: 0, yMax, maxGapMs: cfg.bucketS * 1000 * 3 })
      : null;

  const xLabels = [0, 1, 2, 3, 4].map((i) => {
    if (now == null) return "";
    if (i === 4) return "ตอนนี้";
    const t = t0 + (cfg.ms / 4) * i;
    return range === "7d" ? fmtDay(t) : fmtHM(t);
  });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!pts?.length || now == null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = t0 + ((e.clientX - rect.left) / rect.width) * cfg.ms;
    let best = pts[0];
    for (const p of pts) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
    setHover(best);
  }

  const empty = pts != null && pts.length === 0;

  return (
    <Card id="history" className="flex-[999_1_560px] gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>TDS ย้อนหลัง</CardTitle>
        <div role="group" aria-label="ช่วงเวลา" className="flex gap-1.5 rounded-[10px] border border-line bg-inner p-1">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={k === range}
              onClick={() => onRange(k)}
              className={`min-h-9 cursor-pointer rounded-lg px-3.5 text-sm transition-colors ${
                k === range ? "bg-pill text-pill-ink" : "text-muted hover:text-ink"
              }`}
            >
              {RANGES[k].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2.5">
        <div className="flex min-w-[38px] flex-col justify-between pb-[22px] text-right text-xs text-muted">
          {yTicks.map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            <svg
              role="img"
              aria-label={`กราฟ TDS ย้อนหลัง ${cfg.label} พร้อมเส้นเกณฑ์ ${TDS_LIMIT} ppm`}
              width="100%"
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="block"
            >
              {[1, 2, 3].map((i) => (
                <line key={i} x1="0" y1={(H / 4) * i} x2={W} y2={(H / 4) * i} stroke="#1C2944" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              ))}
              <line x1="0" y1={Math.max(1, limitY)} x2={W} y2={Math.max(1, limitY)} stroke="#F87171" strokeWidth="1.5" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
              {paths && (
                <>
                  <path d={paths.area} fill="#3B82F6" fillOpacity="0.22" />
                  <path d={paths.line} fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </>
              )}
              {hover && now != null && (
                <line
                  x1={((hover.t - t0) / cfg.ms) * W}
                  x2={((hover.t - t0) / cfg.ms) * W}
                  y1="0"
                  y2={H}
                  stroke="#8FA3BF"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
            {/* isolated points drawn in HTML so they stay round with preserveAspectRatio="none" */}
            {paths?.dots.map((d, i) => (
              <span
                key={i}
                aria-hidden
                className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
                style={{ left: `${(d.cx / W) * 100}%`, top: `${(d.cy / H) * 100}%` }}
              />
            ))}
            {hover && now != null && (
              <div
                className="pointer-events-none absolute top-2 rounded-lg border border-line bg-inner px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
                style={{
                  left: `${((hover.t - t0) / cfg.ms) * 100}%`,
                  transform: (hover.t - t0) / cfg.ms > 0.7 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
                }}
              >
                <div className="text-muted">{range === "7d" ? `${fmtDay(hover.t)} ${fmtHM(hover.t)}` : fmtHM(hover.t)}</div>
                <div className="font-display text-sm font-semibold">{fmtPpm(hover.ppm)} ppm</div>
              </div>
            )}
            {(pts == null || empty) && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
                {pts == null ? "กำลังโหลด…" : "ยังไม่มีข้อมูลในช่วงนี้"}
              </div>
            )}
          </div>
          <div className="flex justify-between text-xs text-muted">
            {xLabels.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-[18px] text-[13px] text-muted">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-[3px] w-[18px] rounded-sm bg-accent" />
          TDS เฉลี่ย (ppm)
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="w-[18px] border-t-2 border-dashed border-danger" />
          เกณฑ์ {TDS_LIMIT} ppm
        </span>
      </div>
    </Card>
  );
}
