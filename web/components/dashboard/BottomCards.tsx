import { fmtHM, type EventItem } from "@/lib/dashboard";
import { Card, CardTitle, Chip, InnerTile } from "./ui";

const TONE: Record<EventItem["tone"], string> = {
  info: "bg-accent",
  ok: "bg-safe",
  warn: "bg-warn",
  bad: "bg-danger",
  muted: "bg-muted",
};

export function EventLog({ events }: { events: EventItem[] }) {
  return (
    <Card id="events" className="flex-[2_1_420px] gap-3">
      <CardTitle>เหตุการณ์ล่าสุด</CardTitle>
      {events.length === 0 ? (
        <p className="m-0 py-2.5 text-sm text-muted">ยังไม่มีเหตุการณ์</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-1 p-0">
          {events.map((e, i) => (
            <li key={`${e.t}-${i}`} className="flex items-start gap-3 border-b border-line py-2.5 last:border-b-0">
              <span className="min-w-11 pt-px font-display text-[13px] text-muted">{fmtHM(e.t)}</span>
              <span aria-hidden className={`mt-1.5 size-[9px] flex-none rounded-full ${TONE[e.tone]}`} />
              <span className="text-sm">{e.text}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function LidLightCard() {
  return (
    <Card className="flex-[1_1_280px] gap-3.5">
      <div className="flex items-center justify-between">
        <CardTitle>ฝาถัง · แสง</CardTitle>
        <Chip>Node2 · รอเชื่อม</Chip>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <InnerTile label="ฝาถัง" value="—" />
        <InnerTile label="แสง" value="— lux" />
        <InnerTile label="อายุน้ำ" value="— ชม." />
        <InnerTile label="แสงสะสม" value="— lux·ชม." />
      </div>
    </Card>
  );
}

const C = 2 * Math.PI * 26;

function Ring({ label, pct, value }: { label: string; pct: number | null; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg role="img" aria-label={`${label} ${pct == null ? "ยังไม่มีข้อมูล" : value}`} width="76" height="76" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="26" fill="none" stroke="#1C2944" strokeWidth="6" />
        {pct != null && pct > 0 && (
          <circle
            cx="32" cy="32" r="26" fill="none" stroke="#38BDF8" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${(pct * C).toFixed(1)} ${C.toFixed(1)}`}
            transform="rotate(-90 32 32)"
          />
        )}
        <text x="32" y="36" textAnchor="middle" fontSize="12" fontWeight="600" fill="#E6EDF7">
          {value}
        </text>
      </svg>
      <span className="text-center text-[13px] text-soft">{label}</span>
    </div>
  );
}

export function MetricsCard({ pdr }: { pdr: number | null }) {
  return (
    <Card id="metrics" className="flex-[1_1_280px] gap-3.5">
      <CardTitle>ประสิทธิภาพระบบ</CardTitle>
      <div className="grid grid-cols-3 gap-2">
        <Ring label="Packet delivery" pct={pdr} value={pdr == null ? "—" : `${(pdr * 100).toFixed(1)}%`} />
        <Ring label="Uptime 24 ชม." pct={null} value="—" />
        <Ring label="AI accuracy" pct={null} value="—" />
      </div>
      <span className="text-xs text-muted">
        Packet delivery คำนวณจาก seq ของ Node1 (300 แพ็กเก็ตล่าสุด) · Latency, Uptime, AI: รอเชื่อม
      </span>
    </Card>
  );
}
