const ICON = "size-[22px]";
const svgProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: ICON,
};

const ITEMS = [
  {
    href: "#overview",
    label: "ภาพรวม",
    icon: (
      <svg {...svgProps}>
        <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    href: "#nodes",
    label: "อุปกรณ์",
    icon: (
      <svg {...svgProps}>
        <rect x="6" y="6" width="12" height="12" rx="2" />
        <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
      </svg>
    ),
  },
  {
    href: "#history",
    label: "ประวัติ",
    icon: (
      <svg {...svgProps}>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-6" />
      </svg>
    ),
  },
  {
    href: "#events",
    label: "เหตุการณ์",
    icon: (
      <svg {...svgProps}>
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10 21h4" />
      </svg>
    ),
  },
  {
    href: "#metrics",
    label: "ประสิทธิภาพระบบ",
    icon: (
      <svg {...svgProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
];

/** Icon sidebar on desktop; a horizontal bar on top on phones. */
export default function Sidebar() {
  return (
    <nav
      aria-label="เมนูหลัก"
      className="flex shrink-0 justify-center gap-2 border-b border-line bg-sidebar px-4 py-2 md:sticky md:top-0 md:h-screen md:w-[88px] md:flex-col md:items-center md:justify-start md:border-r md:border-b-0 md:px-0 md:py-5"
    >
      {ITEMS.map((it, i) => (
        <a
          key={it.href}
          href={it.href}
          aria-label={it.label}
          title={it.label}
          className={`flex size-12 items-center justify-center rounded-xl transition-colors ${
            i === 0 ? "bg-pill text-pill-ink" : "text-muted hover:bg-card hover:text-ink"
          }`}
        >
          {it.icon}
        </a>
      ))}
    </nav>
  );
}
