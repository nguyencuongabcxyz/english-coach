import Link from "next/link";
import { level } from "@/lib/skills";

export function Breadcrumb({
  items,
  right,
}: {
  items: { label: string; href?: string }[];
  right?: React.ReactNode;
}) {
  return (
    <div className="m-2.5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 sm:m-3.5 sm:px-[18px] sm:py-3.5">
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <span key={i} className="flex items-center gap-2">
              {it.href && !last ? (
                <Link href={it.href} className="text-muted transition-colors hover:text-ink">
                  {it.label}
                </Link>
              ) : (
                <span className={last ? "font-semibold" : "text-muted"}>{it.label}</span>
              )}
              {!last && (
                <span className="text-muted" aria-hidden="true">
                  ›
                </span>
              )}
            </span>
          );
        })}
      </nav>
      {right}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  border = true,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  border?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-end justify-between gap-4 px-5 pt-3 pb-5 sm:px-9 sm:pt-[14px] ${
        border ? "border-b border-line" : ""
      }`}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="m-0 text-[24px] font-bold tracking-[-0.5px] sm:text-[30px]">{title}</h1>
        {subtitle && <p className="m-0 text-sm text-muted sm:text-[15px]">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Pill({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold ${className}`} style={style}>
      {children}
    </span>
  );
}

export function LevelChip({ value, className = "" }: { value: number; className?: string }) {
  const l = level(value);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-[3px] text-xs font-semibold whitespace-nowrap ${className}`}
      style={{ background: l.bg, color: l.fg }}
    >
      {l.label}
    </span>
  );
}

export const btn = {
  dark: "press inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark hover:shadow-[0_4px_14px_-4px_rgba(79,85,216,0.55)] disabled:cursor-not-allowed disabled:opacity-50",
  light:
    "press inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-line-strong bg-white px-5 text-sm font-semibold text-ink hover:bg-soft disabled:cursor-not-allowed disabled:opacity-50",
  white:
    "press inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-[18px] text-sm font-semibold text-ink hover:bg-soft",
  link: "text-[13px] font-semibold text-link hover:underline",
};

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="m-5 flex flex-col items-center gap-2 rounded-[22px] border-2 border-dashed border-line-strong p-8 text-center sm:m-9">
      <span className="text-[17px] font-bold">{title}</span>
      <span className="max-w-md text-sm leading-normal text-muted">{text}</span>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const opts = { timeZone: "Asia/Ho_Chi_Minh" } as const;
  const dayStr = (x: Date) => x.toLocaleDateString("en-CA", opts);
  const time = date.toLocaleTimeString("vi-VN", { ...opts, hour: "2-digit", minute: "2-digit" });
  if (dayStr(date) === dayStr(now)) return `Hôm nay, ${time}`;
  const y = new Date(now.getTime() - 86400000);
  if (dayStr(date) === dayStr(y)) return `Hôm qua, ${time}`;
  const wd = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"][
    new Date(date.toLocaleString("en-US", opts)).getDay()
  ];
  return `${wd}, ${date.toLocaleDateString("vi-VN", { ...opts, day: "2-digit", month: "2-digit" })}`;
}

export function shortDate(d: string | Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit" });
}
