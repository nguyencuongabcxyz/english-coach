"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { issueActivationCode } from "@/app/actions/teacher";
import { Sparkline } from "@/components/charts";
import { Icon, ICON } from "@/components/icons";

export type StudentRow = {
  id: string;
  name: string;
  login: string;
  initials: string;
  activated: boolean;
  activationCode: string | null;
  resetRequested: boolean;
  count: number;
  topicsDone: number;
  topicsTotal: number;
  avg: number | null;
  trendValues: number[];
  trend: number | null;
  weakest: string | null;
  status: "progress" | "stable" | "support" | "inactive" | "new";
  pending: number;
  daysInactive: number | null;
};

const STATUS: Record<StudentRow["status"], { label: string; bg: string; fg: string }> = {
  support: { label: "Cần hỗ trợ", bg: "#FBD9D2", fg: "#9B2C1A" },
  progress: { label: "Đang tiến bộ", bg: "#EEEFFD", fg: "#3A3BA8" },
  stable: { label: "Ổn định", bg: "#D9F5E6", fg: "#11663F" },
  inactive: { label: "Không hoạt động", bg: "#F3F2F7", fg: "#5E5C68" },
  new: { label: "Chưa luyện", bg: "#F3F2F7", fg: "#5E5C68" },
};
const AVATAR = ["#CDD0F8", "#C8F2DD", "#FBE5BC", "#F6CBBF", "#CDE6F7"];

type Filter = "all" | StudentRow["status"] | "pending" | "notActivated";
const SORTS = {
  name: { label: "Tên A–Z", fn: (a: StudentRow, b: StudentRow) => a.name.localeCompare(b.name, "vi") },
  avgDesc: { label: "Điểm TB cao → thấp", fn: (a: StudentRow, b: StudentRow) => (b.avg ?? -1) - (a.avg ?? -1) },
  avgAsc: { label: "Điểm TB thấp → cao", fn: (a: StudentRow, b: StudentRow) => (a.avg ?? 99) - (b.avg ?? 99) },
  trend: { label: "Tiến bộ nhiều nhất", fn: (a: StudentRow, b: StudentRow) => (b.trend ?? -99) - (a.trend ?? -99) },
  count: { label: "Luyện nhiều nhất", fn: (a: StudentRow, b: StudentRow) => b.count - a.count },
  inactive: {
    label: "Lâu chưa luyện",
    fn: (a: StudentRow, b: StudentRow) => (b.daysInactive ?? 999) - (a.daysInactive ?? 999),
  },
} as const;

const fmt = (v: number | null) => (v == null ? "–" : v.toFixed(1));

export function StudentsTable({ rows }: { rows: StudentRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<keyof typeof SORTS>("name");

  const matches = (r: StudentRow, f: Filter) =>
    f === "all" ||
    (f === "pending" ? r.pending > 0 : f === "notActivated" ? !r.activated : r.status === f);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "support", label: "Cần hỗ trợ" },
    { key: "progress", label: "Đang tiến bộ" },
    { key: "stable", label: "Ổn định" },
    { key: "inactive", label: "Không hoạt động" },
    { key: "new", label: "Chưa luyện" },
    { key: "pending", label: "Có bài chờ duyệt" },
    { key: "notActivated", label: "Chưa kích hoạt" },
  ];

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows
      .filter((r) => matches(r, filter))
      .filter((r) => !term || r.name.toLowerCase().includes(term) || r.login.toLowerCase().includes(term))
      .sort(SORTS[sort].fn);
  }, [rows, q, filter, sort]);

  return (
    <>
      <div className="flex flex-col gap-3 px-5 pt-5 sm:px-9">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-10 min-w-[220px] flex-1 items-center gap-2 rounded-full border border-line px-3.5 sm:max-w-sm">
            <Icon d={ICON.search} size={16} stroke="#5E5C68" width={2} />
            <span className="sr-only">Tìm học sinh</span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên hoặc mã học sinh"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-[13px] text-muted">
            Sắp xếp
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}
              className="min-h-10 rounded-full border border-line bg-white px-3 text-[13px] font-semibold text-ink"
            >
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div role="tablist" aria-label="Lọc học sinh" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 sm:flex-wrap">
          {filters.map((f) => {
            const n = rows.filter((r) => matches(r, f.key)).length;
            if (f.key !== "all" && n === 0) return null;
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(f.key)}
                className={`press inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] ${
                  on ? "bg-brand font-semibold text-white" : "bg-chip font-medium hover:bg-line"
                }`}
              >
                {f.label} <span className={on ? "text-white/75" : "text-muted"}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="mx-5 mt-4 mb-8 overflow-hidden rounded-[22px] border border-line sm:mx-9">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="bg-soft text-left">
                {["Học sinh", "Lượt luyện", "Chủ đề", "Điểm TB", "Xu hướng", "Kỹ năng yếu", "Tiến bộ", "Trạng thái", ""].map(
                  (h, i) => (
                    <th key={i} scope="col" className={`py-3 text-xs font-semibold text-muted ${i === 0 ? "px-5" : "px-3"}`}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-sm text-muted">
                    Không có học sinh phù hợp.
                  </td>
                </tr>
              )}
              {shown.map((s, i) => {
                const st = STATUS[s.status];
                return (
                  <tr key={s.id} className="border-t border-line hover:bg-soft/60">
                    <th scope="row" className="px-5 py-3 text-left font-normal">
                      <Link href={`/teacher/students/${s.id}`} className="flex items-center gap-2.5 hover:underline">
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                          style={{ background: AVATAR[i % AVATAR.length] }}
                        >
                          {s.initials}
                        </span>
                        <span className="flex flex-col">
                          <span className="font-semibold">{s.name}</span>
                          <span className="text-xs text-muted">{s.login}</span>
                        </span>
                      </Link>
                    </th>
                    <td className="px-3 py-3 tabular-nums">{s.count}</td>
                    <td className="px-3 py-3 tabular-nums">
                      {s.topicsDone}/{s.topicsTotal}
                    </td>
                    <td className="px-3 py-3 font-bold tabular-nums">{fmt(s.avg)}</td>
                    <td className="px-3 py-3">
                      <Sparkline values={s.trendValues} label={`Xu hướng điểm của ${s.name}`} />
                    </td>
                    <td className="px-3 py-3">{s.weakest ?? "–"}</td>
                    <td
                      className={`px-3 py-3 font-semibold tabular-nums ${
                        s.trend == null ? "text-muted" : s.trend > 0 ? "text-good" : s.trend < 0 ? "text-bad" : "text-muted"
                      }`}
                    >
                      {s.trend == null ? "–" : `${s.trend > 0 ? "+" : s.trend === 0 ? "±" : ""}${s.trend.toFixed(1)}`}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                        style={{ background: st.bg, color: st.fg }}
                      >
                        {st.label}
                      </span>
                      {s.activationCode && (
                        <span className="mt-1 block text-[11px] text-muted">
                          {s.activated ? "Mã đặt lại" : "Mã kích hoạt"}:{" "}
                          <strong className="font-mono text-ink">{s.activationCode}</strong>
                        </span>
                      )}
                      {s.resetRequested && <span className="mt-1 block text-[11px] font-semibold text-bad">Yêu cầu đặt lại mật khẩu</span>}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      {s.pending > 0 ? (
                        <Link
                          href={`/teacher/review?student=${s.id}`}
                          className="inline-flex min-h-9 items-center rounded-full bg-brand px-3.5 text-xs font-semibold text-white hover:bg-brand-dark"
                        >
                          Duyệt ({s.pending})
                        </Link>
                      ) : !s.activated || s.resetRequested ? (
                        <form action={issueActivationCode.bind(null, s.id)}>
                          <button className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-line-strong px-3.5 text-xs font-semibold hover:bg-soft">
                            {s.activated ? "Cấp mã đặt lại" : "Cấp mã mới"}
                          </button>
                        </form>
                      ) : (
                        <Link
                          href={`/teacher/students/${s.id}`}
                          className="inline-flex min-h-9 items-center rounded-full border border-line-strong px-3.5 text-xs font-semibold hover:bg-soft"
                        >
                          Xem hồ sơ
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
