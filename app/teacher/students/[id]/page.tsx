import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { studentProfile } from "@/lib/data";
import { one } from "@/lib/db";
import { initials } from "@/components/AppShell";
import { Breadcrumb, LevelChip, PageHeader, shortDate } from "@/components/ui";
import { getTopic } from "@/lib/topics";
import { fmt, SKILL_SHORT_VI, SKILL_VI, SKILLS } from "@/lib/skills";
import { finalScores, type UserRow } from "@/lib/types";

export const metadata = { title: "Hồ sơ học sinh · AI English Speaking Coach" };

export default async function StudentDetail({ params }: PageProps<"/teacher/students/[id]">) {
  const { id } = await params;
  const user = await requireUser("teacher");
  const student = await one<UserRow>(`SELECT * FROM users WHERE id = $1 AND class_id = $2 AND role = 'student'`, [id, user.class_id]);
  if (!student) notFound();
  const p = await studentProfile(student.id);
  const scored = p.sessions.filter((s) => finalScores(s));
  const max = 10;

  return (
    <>
      <Breadcrumb items={[{ label: "Tổng quan lớp", href: "/teacher" }, { label: student.name }]} />
      <PageHeader title={student.name} subtitle={`${student.login} · ${p.count} lượt luyện · ${p.topicsDone.length}/5 chủ đề`} />

      <div className="grid grid-cols-1 gap-4 px-5 pt-6 sm:px-9 lg:grid-cols-[300px_1fr]">
        <section className="flex flex-col gap-3 rounded-[22px] bg-lilac p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-white font-extrabold">{initials(student.name)}</span>
            <span className="flex flex-col">
              <span className="font-bold">{student.name}</span>
              <span className="text-xs text-lilac-ink">{student.activated ? "Đã kích hoạt" : "Chưa kích hoạt"}</span>
            </span>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl bg-white p-4">
            <span className="text-xs font-semibold text-muted">Trung bình 3 buổi gần nhất</span>
            {p.current ? (
              SKILLS.map((k) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span>{SKILL_VI[k]}</span>
                  <span className="flex items-center gap-2">
                    <strong>{fmt(p.current![k])}</strong>
                    <LevelChip value={p.current![k]} />
                  </span>
                </div>
              ))
            ) : (
              <span className="text-sm text-muted">Chưa có dữ liệu.</span>
            )}
          </div>
          <div className="rounded-2xl bg-white p-4 text-sm">
            <span className="text-xs font-semibold text-muted">Kỹ năng còn hạn chế</span>
            <p className="m-0 mt-1 font-semibold">{p.weak.map((k) => SKILL_SHORT_VI[k]).join(", ") || "Không có"}</p>
            <span className="mt-2 block text-xs font-semibold text-muted">Mức độ tiến bộ</span>
            <p className="m-0 mt-1 font-semibold">
              {p.progress == null ? "–" : `${p.progress > 0 ? "+" : ""}${p.progress.toFixed(1)} so với buổi đầu`}
            </p>
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-line p-5">
          <h2 className="m-0 text-[17px] font-bold">Tổng điểm qua các buổi</h2>
          {scored.length ? (
            <div className="flex h-[180px] items-end gap-2 border-b border-line-strong">
              {scored.slice(-12).map((s, i, arr) => {
                const v = finalScores(s)!.total;
                return (
                  <Link key={s.id} href={`/teacher/review/${s.id}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`Buổi #${s.seq}: ${fmt(v)}`}>
                    <span className="text-[11px] font-bold">{fmt(v)}</span>
                    <span
                      className="w-full max-w-[48px] rounded-t-lg"
                      style={{ height: `${(v / max) * 150}px`, background: i === arr.length - 1 ? "#16151A" : "#B9BDEF" }}
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="m-0 text-sm text-muted">Học sinh chưa luyện tập.</p>
          )}
        </section>
      </div>

      <section className="mx-5 mt-4 mb-8 overflow-hidden rounded-[22px] border border-line sm:mx-9">
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
                  const sc = finalScores(s)!;
                  return (
                    <tr key={s.id} className="border-t border-line">
                      <th className="px-5 py-3 text-left">
                        <Link href={`/teacher/review/${s.id}`} className="hover:underline">
                          #{s.seq}
                        </Link>
                      </th>
                      <td className="px-3 py-3">
                        {getTopic(s.topic_id)?.title} · <span className="text-muted">{s.title}</span>
                      </td>
                      <td className="px-3 py-3 font-extrabold">{fmt(sc.total)}</td>
                      {SKILLS.map((k) => (
                        <td key={k} className="px-3 py-3">
                          {fmt(sc[k])}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-muted">{shortDate(s.completed_at)}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.teacher_status === "approved" ? "bg-good-bg text-good" : "bg-ok-bg text-ok"}`}>
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
