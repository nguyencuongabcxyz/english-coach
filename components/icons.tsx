// Stroke icons used in the design (24x24 viewBox paths).
export const ICON = {
  overview: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  topics: "M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z",
  mic: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
  feedback: "M4 5h16v11H9l-5 4z",
  progress: "M4 20V11M10 20V5M16 20v-6M21 20H3",
  classGrid: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  review: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 11l2 2 4-4",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  plus: "M12 5v14M5 12h14",
  chevronRight: "m9 6 6 6-6 6",
  chevronLeft: "m15 6-6 6 6 6",
  check: "m5 12 5 5 9-10",
  alert: "M12 7v6M12 17h.01",
  speaker: "M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6 6 18",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01",
  timer: "M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 9v4l2.5 2M9 2h6",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  school: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5",
  download: "M12 4v12M7 11l5 5 5-5M4 20h16",
  logo: "M6 10v4M10 7v10M14 9v6M18 11v2",
  play: "M8 5v14l11-7z",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  key: "M15 7a4 4 0 1 1-3.9 5H3v3h3v3h3v-3h2.1A4 4 0 0 1 15 7z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
} as const;

export function Icon({
  d,
  size = 18,
  stroke = "currentColor",
  width = 1.8,
  className,
}: {
  d: string;
  size?: number;
  stroke?: string;
  width?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}
