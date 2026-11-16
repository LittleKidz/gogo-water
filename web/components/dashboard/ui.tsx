import type { ReactNode } from "react";

export function Card({ id, className = "", children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <div id={id} className={`flex min-w-0 flex-col rounded-2xl border border-line bg-card p-5 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="m-0 text-lg font-semibold">{children}</h2>;
}

/** Small rounded label, e.g. "สด", "รอเชื่อม". */
export function Chip({ tone = "pending", children }: { tone?: "live" | "pending" | "outline"; children: ReactNode }) {
  const cls =
    tone === "live"
      ? "bg-pill text-pill-ink"
      : tone === "outline"
        ? "border border-current/30"
        : "bg-line text-soft";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap ${cls}`}>{children}</span>;
}

export function StatusBadge({ online, label }: { online: boolean; label?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs whitespace-nowrap ${
        online ? "bg-safe-bg text-safe-ink" : "bg-line text-soft"
      }`}
    >
      <span aria-hidden className={`size-[7px] rounded-full ${online ? "bg-safe" : "bg-muted"}`} />
      {label ?? (online ? "ออนไลน์" : "ออฟไลน์")}
    </span>
  );
}

export function InnerTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-inner p-3.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xl font-semibold text-muted">{value}</span>
    </div>
  );
}
