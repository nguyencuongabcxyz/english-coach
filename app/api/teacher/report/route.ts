import { getUser } from "@/lib/auth";
import { classOverview, getClass } from "@/lib/data";
import { fmt, SKILL_VI, SKILLS } from "@/lib/skills";

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV report of the class ("Xuất báo cáo"), opens directly in Excel. */
export async function GET() {
  const user = await getUser();
  if (!user || user.role !== "teacher" || !user.class_id) return new Response("Unauthorized", { status: 401 });
  const [o, cls] = await Promise.all([classOverview(user.class_id), getClass(user.class_id)]);
  const header = ["Mã học sinh", "Họ tên", "Số lượt luyện", "Số chủ đề", "Điểm TB", ...SKILLS.map((k) => `TB ${SKILL_VI[k]}`), "Kỹ năng yếu nhất", "Tiến bộ (so với buổi trước)", "Bài chờ duyệt"];
  const rows = o.summaries.map((s) => [
    s.user.login,
    s.user.name,
    s.profile.count,
    s.profile.topicsDone.length,
    fmt(s.avg?.total),
    ...SKILLS.map((k) => fmt(s.avg?.[k])),
    s.profile.weakest ? SKILL_VI[s.profile.weakest] : "",
    s.trend == null ? "" : s.trend.toFixed(1),
    s.pending,
  ]);
  const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bao-cao-lop-${cls?.name ?? "lop"}-${date}.csv"`,
    },
  });
}
