import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAnswers, getSession } from "@/lib/data";
import { one } from "@/lib/db";
import { Breadcrumb, btn, formatDateTime } from "@/components/ui";
import { AnswerDetails, pickNotes, ScoreOverview, StrengthsImprovements } from "@/components/FeedbackView";
import { getTopic } from "@/lib/topics";
import { getAllTopics } from "@/lib/topics-db";
import { SKILL_VI, SKILLS } from "@/lib/skills";
import { submitReview } from "@/app/actions/teacher";
import type { UserRow } from "@/lib/types";

export const metadata = { title: "Duyệt bài luyện · AI English Speaking Coach" };

export default async function ReviewDetail({ params, searchParams }: PageProps<"/teacher/review/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser("teacher");
  const session = await getSession(id);
  if (!session || session.status !== "completed") notFound();
  const student = await one<UserRow>(`SELECT * FROM users WHERE id = $1 AND class_id = $2`, [session.student_id, user.class_id]);
  if (!student) notFound();
  const [answers, topics] = await Promise.all([getAnswers(session.id), getAllTopics(user.id)]);
  const base = session.teacher_scores ?? session.scores!;
  const reviewed = session.teacher_status === "approved";

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Duyệt bài luyện", href: "/teacher/review" },
          { label: student.name, href: `/teacher/students/${student.id}` },
          { label: `Buổi #${session.seq}` },
        ]}
      />
      {sp.done === "1" && (
        <p role="status" className="mx-5 mt-2 mb-0 rounded-xl bg-good-bg px-4 py-3 text-sm font-medium text-good sm:mx-9">
          Đã lưu. Đây là bài tiếp theo đang chờ duyệt.
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 pt-3 pb-5 sm:px-9">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="m-0 text-[24px] font-bold tracking-[-0.5px] sm:text-[30px]">
            {student.name} · {session.title}
          </h1>
          <p className="m-0 text-sm text-muted">
            {student.login} · {getTopic(topics, session.topic_id)?.title} · {formatDateTime(session.completed_at)} ·{" "}
            {reviewed ? "Đã duyệt" : "Chờ duyệt"}
          </p>
        </div>
      </div>

      <ScoreOverview
        scores={base}
        aiScores={session.teacher_scores ? session.scores : null}
        headline={session.summary?.headline ?? ""}
        delta={null}
        notes={pickNotes(answers)}
      />
      {session.summary && (
        <StrengthsImprovements strengths={session.summary.strengths} improvements={session.summary.improvements} />
      )}

      <div className="grid grid-cols-1 gap-4 px-5 pt-3 pb-8 sm:px-9 lg:grid-cols-[3fr_2fr]">
        <section className="flex flex-col gap-5 rounded-[22px] border border-line p-5">
          <h2 className="m-0 text-[17px] font-bold">Bài nói của học sinh</h2>
          {answers.map((a, i) => (
            <div key={a.id} className={i > 0 ? "border-t border-line pt-5" : ""}>
              <AnswerDetails answer={a} index={a.idx} showQuestion />
            </div>
          ))}
        </section>

        <form
          action={submitReview.bind(null, session.id)}
          className="flex flex-col gap-4 self-start rounded-[22px] bg-sand p-5 lg:sticky lg:top-6"
        >
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[17px] font-bold">Xác nhận của giáo viên</h2>
            <span className="text-xs text-sand-ink">Điểm AI được điền sẵn. Điều chỉnh nếu cần (thang 10, bước 0,5).</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {SKILLS.map((k) => (
              <label key={k} className="flex flex-col gap-1 rounded-2xl bg-white p-3">
                <span className="text-xs font-semibold">{SKILL_VI[k]}</span>
                <input
                  name={k}
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  defaultValue={base[k]}
                  className="w-full bg-transparent text-xl font-extrabold outline-none"
                />
                <span className="text-[11px] text-muted">AI: {session.scores?.[k].toFixed(1)}</span>
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold">Nhận xét cho học sinh</span>
            <textarea
              name="comment"
              rows={4}
              defaultValue={session.teacher_comment ?? ""}
              placeholder="VD: Em nói rõ ràng hơn rồi. Tuần này luyện thêm từ nối nhé."
              className="rounded-2xl border border-sand-deep bg-white px-3.5 py-3 text-sm outline-none focus:border-ink"
            />
          </label>
          <div className="flex flex-wrap gap-2.5">
            <button className={btn.dark}>{reviewed ? "Cập nhật" : "Xác nhận & tiếp theo"}</button>
            <Link href="/teacher/review" className={btn.white}>
              Để sau
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
