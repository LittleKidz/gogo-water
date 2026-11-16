import Image from "next/image";
import type { LiveState } from "@/hooks/useDashboardData";
import { fmtClock } from "@/lib/dashboard";

const LIVE = {
  live: { text: "Live", cls: "bg-safe-bg text-safe-ink", dot: "bg-safe animate-pulse" },
  connecting: { text: "กำลังเชื่อมต่อ…", cls: "bg-line text-soft", dot: "bg-muted" },
  offline: { text: "ขาดการเชื่อมต่อ", cls: "bg-danger-bg text-danger-ink", dot: "bg-danger" },
};

export default function Header({ live, lastAt }: { live: LiveState; lastAt?: string }) {
  const l = LIVE[live];
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Image
          src="/logo.png"
          alt="โลโก้ GoGo Water"
          width={148}
          height={80}
          priority
          className="h-20 w-[148px] rounded-[14px] border border-line object-cover"
        />
        <div className="flex flex-col gap-0.5">
          <h1 className="m-0 font-display text-[28px] font-semibold tracking-[0.2px]">GoGo Water</h1>
          <p className="m-0 text-[15px] text-muted">ถังน้ำดื่มอัจฉริยะ</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium ${l.cls}`}>
          <span aria-hidden className={`size-2 rounded-full ${l.dot}`} />
          {l.text}
        </span>
        <span className="text-sm text-muted">อัปเดตล่าสุด {lastAt ? fmtClock(lastAt) : "—"}</span>
      </div>
    </header>
  );
}
