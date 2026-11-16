import { Card, CardTitle, StatusBadge } from "./ui";

export type DeviceRow = {
  name: string;
  board: string;
  sensors: string;
  connected: boolean; // false = hardware not wired yet
  online: boolean;
  lastSeen: string;
  rssi: string;
  pdr: string;
};

export default function DevicePanel({ rows }: { rows: DeviceRow[] }) {
  return (
    <Card id="nodes" className="flex-[1_1_320px] gap-3">
      <CardTitle>อุปกรณ์</CardTitle>
      {rows.map((n) => (
        <div key={n.name} className="flex flex-col gap-2 rounded-xl border border-line bg-inner p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold">{n.name}</span>
              <span className="text-xs text-muted">{n.board}</span>
            </div>
            <StatusBadge online={n.online} label={n.connected ? undefined : "ยังไม่เชื่อม"} />
          </div>
          <span className="text-[13px] text-soft">{n.sensors}</span>
          <div className="flex flex-wrap gap-3.5 text-xs text-muted">
            <span>เห็นล่าสุด {n.lastSeen}</span>
            <span>RSSI {n.rssi}</span>
            <span>PDR {n.pdr}</span>
          </div>
        </div>
      ))}
    </Card>
  );
}
