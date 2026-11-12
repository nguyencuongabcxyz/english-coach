import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { classOverview, daysSince, studentProfile, weeklyStats } from "@/lib/data";
import { one } from "@/lib/db";
import { initials } from "@/components/AppShell";
import { Breadcrumb, formatDateTime, LevelChip, shortDate } from "@/components/ui";
import { BulletRows, CountColumns, RankedBars, ScoreLineChart, Sparkline, TableView } from "@/components/charts";
import { scoreDomain } from "@/lib/chart-domain";
import { getTopic } from "@/lib/topics";
import { getAllTopics } from "@/lib/topics-db";
import { fmt, level, round1, SKILL_SHORT_VI, SKILL_VI, SKILLS, type Scores } from "@/lib/skills";
import { finalScores, type UserRow } from "@/lib/types";

export const metadata = { title: "Hồ sơ học sinh · AI English Speaking Coach" };

export default async function StudentDetail({ params }: PageProps<"/teacher/students/[id]">) {
  const { id } = await params;
  const user = await requireUser("teacher");
  const student = await one<UserRow>(`SELECT * FROM users WHERE id = $1 AND class_id = $2 AND role = 'student'`, [
    id,
    user.class_id,
  ]);
  if (!student) notFound();
  const [p, all, cls] = await Promise.all([studentProfile(student.id), getAllTopics(user.id), classOverview(user.class_id!)]);

  const scored = p.sessions.filter((s) => finalScores(s));
  const first = scored[0] ? finalScores(scored[0])! : null;
  const latest = scored.at(-1) ? finalScores(scored.at(-1)!)! : null;
  const pending = p.sessions.filter((s) => s.teacher_status === "pending").length;
  const lastAt = p.sessions.at(-1)?.completed_at ?? null;
  const daysAgo = daysSince(lastAt);
  const weekly = weeklyStats(p.sessions, 8);
  const recent = scored.slice(-20);
  const skillDomain = scoreDomain(recent.flatMap((x) => SKILLS.map((k) => finalScores(x)![k])), 3);

  const topicRows = [...new Set(p.sessions.map((s) => s.topic_id))]
    .map((tid) => {
      const list = scored.filter((s) => s.topic_id === tid);
      const avg = list.length ? round1(list.reduce((a, s) => a + finalScores(s)!.total, 0) / list.length) : null;
      return {
        label: getTopic(all, tid)?.title ?? tid,
        value: p.sessions.filter((s) => s.topic_id === tid).length,
        sub: avg != null ? `TB ${fmt(avg)}` : undefined,
      };
    })
    .sort((a, b) => b.value - a.value);

  const strongest = p.current ? [...SKILLS].sort((a, b) => p.current![b] - p.current![a])[0] : null;
  const vsClass = p.current && cls.skillAvg ? round1(p.current.total - cls.skillAvg.total) : null;

  return (
    <>
      <Breadcrumb items={[{ label: "Học sinh", href: "/teacher/students" }, { label: student.name }]} />

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 pt-3 pb-5 sm:px-9">
        <span className="flex size-14 items-center justify-center rounded-full bg-lilac text-lg font-extrabold">
          {initials(student.name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="m-0 text-[24px] font-bold tracking-[-0.5px] sm:text-[30px]">{student.name}</h1>
          <p className="m-0 text-sm text-muted">
            {student.login} · {student.activated ? "Đã kích hoạt" : "Chưa kích hoạt"}
            {p.weak.length > 0 && ` · Còn hạn chế: ${p.weak.map((k) => SKILL_SHORT_VI[k]).join(", ")}`}
          </p>
        </div>
        {pending > 0 && (
          <Link
            href={`/teacher/review?student=${student.id}`}
            className="inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white"
          >
            Duyệt {pending} bài
          </Link>
        )}
      </div>

      {scored.length === 0 ? (
        <p className="m-5 rounded-2xl bg-soft p-5 text-sm text-muted sm:m-9">Học sinh chưa hoàn thành buổi luyện nào.</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 px-5 pt-5 sm:px-9 md:grid-cols-4">
            <Kpi
              label="Điểm hiện tại"
              value={fmt(p.current?.total)}
              suffix="/ 10"
              note={p.current ? level(p.current.total).label + " · TB 3 buổi gần nhất" : ""}
            />
            <Kpi
              label="Tiến bộ"
              value={p.progress == null ? "–" : `${p.progress > 0 ? "+" : ""}${p.progress.toFixed(1)}`}
              note={first ? `Từ ${fmt(first.total)} ở buổi đầu tiên` : ""}
              tone={p.progress == null ? undefined : p.progress >= 0 ? "good" : "bad"}
            />
            <Kpi
              label="So với TB lớp"
              value={vsClass == null ? "–" : `${vsClass > 0 ? "+" : ""}${vsClass.toFixed(1)}`}
              note={cls.skillAvg ? `TB lớp ${fmt(cls.skillAvg.total)} (30 ngày)` : ""}
              tone={vsClass == null ? undefined : vsClass >= 0 ? "good" : "bad"}
            />
            <Kpi
              label="Số buổi luyện"
              value={String(p.count)}
              note={
                daysAgo == null ? "" : daysAgo === 0 ? "Luyện gần nhất: hôm nay" : `Luyện gần nhất: ${daysAgo} ngày trước`
              }
              tone={daysAgo != null && daysAgo >= 7 ? "bad" : undefined}
            />
          </div>

          {/* Score over sessions + skills vs class */}
          <div className="grid grid-cols-1 gap-4 px-5 pt-4 sm:px-9 xl:grid-cols-[3fr_2fr]">
            <section className="flex min-w-0 flex-col gap-2 rounded-[22px] border border-line p-5">
              <h2 className="m-0 text-[15px] font-bold">Tổng điểm qua các buổi luyện</h2>
              <p className="m-0 text-[13px] text-muted">
                {latest && first && scored.length > 1
                  ? `Từ ${fmt(finalScores(recent[0])!.total)} (buổi #${recent[0].seq}) đến ${fmt(latest.total)} (buổi #${recent.at(-1)!.seq}), so với điểm TB của lớp.`
                  : "So với điểm TB của lớp."}
              </p>
              <ScoreLineChart
                labels={recent.map((s) => `#${s.seq}`)}
                series={{ name: student.name, values: recent.map((s) => finalScores(s)!.total) }}
                reference={cls.classAvg != null ? { name: "TB lớp", values: recent.map(() => cls.classAvg) } : undefined}
                ariaLabel={`Tổng điểm của ${student.name} qua các buổi: ${recent
                  .map((s) => `buổi ${s.seq} ${fmt(finalScores(s)!.total)}`)
                  .join("; ")}`}
              />
              <TableView
                head={["Buổi", "Ngày", "Chủ đề", "Tổng", ...SKILLS.map((k) => SKILL_SHORT_VI[k])]}
                rows={recent
                  .slice()
                  .reverse()
                  .map((s) => {
                    const sc = finalScores(s)!;
                    return [
                      `#${s.seq}`,
                      shortDate(s.completed_at),
                      getTopic(all, s.topic_id)?.title ?? s.topic_id,
                      fmt(sc.total),
                      ...SKILLS.map((k) => fmt(sc[k])),
                    ];
                  })}
              />
            </section>
            <section className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-line p-5">
              <h2 className="m-0 text-[15px] font-bold">Kỹ năng so với cả lớp</h2>
              <p className="m-0 text-[13px] text-muted">
                {strongest && p.weakest
                  ? `Mạnh nhất: ${SKILL_VI[strongest].toLowerCase()}. Cần tập trung: ${SKILL_VI[p.weakest].toLowerCase()}.`
                  : "Điểm TB 3 buổi gần nhất của học sinh so với TB lớp 30 ngày qua."}
              </p>
              <BulletRows
                valueLabel="Học sinh (TB 3 buổi gần nhất)"
                refLabel="TB lớp"
                rows={SKILLS.map((k) => ({
                  label: SKILL_VI[k],
                  value: p.current?.[k] ?? null,
                  ref: cls.skillAvg?.[k] ?? null,
                  color: level(p.current?.[k] ?? 0).bar,
                }))}
              />
            </section>
          </div>

          {/* Skill small multiples */}
          <section className="mx-5 mt-4 rounded-[22px] border border-line p-5 sm:mx-9">
            <h2 className="m-0 text-[15px] font-bold">Từng kỹ năng qua các buổi</h2>
            <p className="m-0 mt-1 text-[13px] text-muted">Mỗi ô một kỹ năng, cùng một thang điểm ({skillDomain.min}–{skillDomain.max}) để so sánh được với nhau. Chấm xanh là buổi gần nhất.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {SKILLS.map((k) => {
                const vals = recent.map((s) => finalScores(s)![k]);
                const d = first && latest ? round1(latest[k] - first[k]) : null;
                return (
                  <div key={k} className="flex flex-col gap-1.5 rounded-2xl bg-soft p-3.5">
                    <span className="text-[13px] font-semibold">{SKILL_VI[k]}</span>
                    <span className="flex items-baseline gap-2">
                      <span className="text-[22px] font-extrabold">{fmt(latest?.[k])}</span>
                      {d != null && (
                        <span className={`text-xs font-semibold ${d > 0 ? "text-good" : d < 0 ? "text-bad" : "text-muted"}`}>
                          {d > 0 ? "▲" : d < 0 ? "▼" : "±"}
                          {Math.abs(d).toFixed(1)}
                        </span>
                      )}
                    </span>
                    <Sparkline values={vals} width={180} height={56} domain={skillDomain} label={`${SKILL_VI[k]} qua các buổi: ${vals.join(", ")}`} />
                    <LevelChip value={latest?.[k] ?? 0} className="self-start" />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Activity + topics */}
          <div className="grid grid-cols-1 gap-4 px-5 pt-4 sm:px-9 lg:grid-cols-2">
            <section className="flex min-w-0 flex-col gap-2 rounded-[22px] border border-line p-5">
              <h2 className="m-0 text-[15px] font-bold">Số buổi luyện mỗi tuần</h2>
              <p className="m-0 text-[13px] text-muted">
                {weekly.filter((w) => w.count > 0).length} / 8 tuần gần nhất có luyện tập.
              </p>
              <CountColumns
                data={weekly.map((w) => ({ label: w.label, value: w.count, title: `Tuần ${w.range}` }))}
                unit="buổi"
                height={170}
                ariaLabel={`Số buổi luyện mỗi tuần: ${weekly.map((w) => `${w.range} ${w.count}`).join("; ")}`}
              />
            </section>
            <section className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-line p-5">
              <h2 className="m-0 text-[15px] font-bold">Theo chủ đề</h2>
              <RankedBars unit="buổi" rows={topicRows} />
            </section>
          </div>
        </>
      )}

      {/* Session list */}
      <section className="mx-5 mt-4 mb-8 overflow-hidden rounded-[22px] border border-line sm:mx-9">
        <div className="px-5 py-4">
          <h2 className="m-0 text-[15px] font-bold">Các buổi luyện</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="bg-soft text-left">
                {["Buổi", "Chủ đề", "Tổng", ...SKILLS.map((k) => SKILL_SHORT_VI[k]), "Ngày", "Trạng thái"].map((h, i) => (
                  <th key={h} className={`py-3 text-xs font-semibold text-muted ${i === 0 ? "px-5" : "px-3"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scored
                .slice()
                .reverse()
                .map((s) => {
                  const sc = finalScores(s) as Scores;
                  return (
                    <tr key={s.id} className="border-t border-line">
                      <th className="px-5 py-3 text-left">
                        <Link href={`/teacher/review/${s.id}`} className="hover:underline">
                          #{s.seq}
                        </Link>
                      </th>
                      <td className="px-3 py-3">
                        {getTopic(all, s.topic_id)?.title} · <span className="text-muted">{s.title}</span>
                      </td>
                      <td className="px-3 py-3 font-extrabold tabular-nums">{fmt(sc.total)}</td>
                      {SKILLS.map((k) => (
                        <td key={k} className="px-3 py-3 tabular-nums">
                          {fmt(sc[k])}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-muted" title={formatDateTime(s.completed_at)}>
                        {shortDate(s.completed_at)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            s.teacher_status === "approved" ? "bg-good-bg text-good" : "bg-ok-bg text-ok"
                          }`}
                        >
                          {s.teacher_status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
                        </span>
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

function Kpi({
  label,
  value,
  suffix,
  note,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  note: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[18px] border border-line p-4">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={`text-[26px] font-bold ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>
        {value} {suffix && <span className="text-base font-medium text-muted">{suffix}</span>}
      </span>
      <span className="text-xs text-muted">{note}</span>
    </div>
  );
}
