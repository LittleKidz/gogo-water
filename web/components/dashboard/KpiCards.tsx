import { buildPaths, fmtPpm, TDS_LIMIT, type WaterLevel } from "@/lib/dashboard";
import type { ChartPoint } from "@/lib/types";
import { Chip } from "./ui";

const LEVEL: Record<WaterLevel, { label: string; box: string; soft: string; big: string; stroke: string }> = {
  safe: { label: "ปลอดภัย", box: "bg-safe-bg border-safe-line", soft: "text-safe-soft", big: "text-safe-ink", stroke: "#34D399" },
  warning: { label: "เฝ้าระวัง", box: "bg-warn-bg border-warn-line", soft: "text-warn-ink", big: "text-warn", stroke: "#FBBF24" },
  unsafe: { label: "ไม่ปลอดภัย", box: "bg-danger-bg border-danger-line", soft: "text-danger-ink", big: "text-danger", stroke: "#F87171" },
  unknown: { label: "ไม่ทราบสถานะ", box: "bg-card border-line", soft: "text-muted", big: "text-soft", stroke: "#8FA3BF" },
};

function LevelIcon({ level, color }: { level: WaterLevel; color: string }) {
  return (
    <svg aria-hidden width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      {level === "safe" && <path d="M8 12.5l2.5 2.5L16 9.5" />}
      {(level === "warning" || level === "unsafe") && <path d="M12 7.5v5.5M12 16.5h.01" />}
      {level === "unknown" && <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.2M12 16.5h.01" />}
    </svg>
  );
}

export function StatusCard({ level, reason }: { level: WaterLevel; reason: string }) {
  const s = LEVEL[level];
  return (
    <div className={`flex flex-col gap-2.5 rounded-2xl border p-5 ${s.box}`}>
      <div className={`flex items-center justify-between ${s.soft}`}>
        <span className="text-sm">สถานะน้ำ</span>
        <Chip tone="outline">ตามเกณฑ์</Chip>
      </div>
      <div className="flex items-center gap-2.5">
        <LevelIcon level={level} color={s.stroke} />
        <span className={`text-[30px] font-semibold ${s.big}`}>{s.label}</span>
      </div>
      <p className={`m-0 text-sm ${s.soft}`}>{reason} · ผล AI จะแสดงหลังเชื่อม LLM</p>
    </div>
  );
}

function Sparkline({ pts, now }: { pts: ChartPoint[]; now: number }) {
  if (pts.length === 0) return <div className="h-12 rounded-lg bg-inner" aria-hidden />;
  const vals = pts.map((p) => p.ppm);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const pad = Math.max(10, (hi - lo) * 0.15);
  lo = Math.max(0, lo - pad);
  hi = hi + pad;
  const { line, area, dots } = buildPaths(pts, {
    w: 200, h: 46, t0: now - 3_600_000, t1: now, yMin: lo, yMax: hi, maxGapMs: 5 * 60_000,
  });
  return (
    <svg role="img" aria-label="แนวโน้ม TDS 1 ชั่วโมงล่าสุด" width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none">
      <path d={area} fill="#38BDF8" fillOpacity="0.15" />
      <path d={line} fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r="2" fill="#38BDF8" />
      ))}
    </svg>
  );
}

export function TdsCard({ ppm, online, spark, now }: { ppm: number | null; online: boolean; spark: ChartPoint[]; now: number | null }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">TDS · Node1</span>
        {online ? <Chip tone="live">สด</Chip> : <Chip>ออฟไลน์</Chip>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-display text-4xl font-semibold ${ppm == null ? "text-muted" : ""}`}>
          {ppm == null ? "—" : fmtPpm(ppm)}
        </span>
        <span className="text-[15px] text-muted">ppm</span>
      </div>
      {now != null ? <Sparkline pts={spark} now={now} /> : <div className="h-12" />}
      <span className="text-[13px] text-muted">เกณฑ์กรมอนามัย ≤ {TDS_LIMIT} ppm</span>
    </div>
  );
}

/** Sensor that is not wired yet. */
export function PendingCard({ title, unit, note }: { title: string; unit: string; note: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{title}</span>
        <Chip>รอเชื่อม</Chip>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-4xl font-semibold text-muted">—</span>
        <span className="text-[15px] text-muted">{unit}</span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-line" />
      <span className="mt-2.5 text-[13px] text-muted">{note}</span>
    </div>
  );
}
