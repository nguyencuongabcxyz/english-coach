import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAnswers, getSession, listCompletedSessions } from "@/lib/data";
import { one } from "@/lib/db";
import { AppShell } from "@/components/AppShell";
import { Breadcrumb, btn, formatDateTime, Pill } from "@/components/ui";
import { Icon, ICON } from "@/components/icons";
import { PlayRecording } from "@/components/SpeakButton";
import { AnswerDetails, pickNotes, ScoreOverview, sessionDelta, StrengthsImprovements } from "@/components/FeedbackView";
import { finalScores } from "@/lib/types";
import { SKILL_SHORT_VI } from "@/lib/skills";
import { retrySession, startActivity } from "@/app/actions/practice";

export const metadata = { title: "Phản hồi từ AI · AI English Speaking Coach" };

export default async function FeedbackPage({ params }: PageProps<"/feedback/[id]">) {
  const { id } = await params;
  const user = await requireUser("student");
  const session = await getSession(id);
  if (!session || session.student_id !== user.id) notFound();
  if (session.status !== "completed") redirect(`/practice/${session.id}`);
  const [answers, all, teacher] = await Promise.all([
    getAnswers(session.id),
    listCompletedSessions(user.id),
    one<{ name: string }>(
      `SELECT t.name FROM classes c JOIN users t ON t.id = c.teacher_id WHERE c.id = $1`,
      [user.class_id],
    ),
  ]);
  const scores = finalScores(session)!;
  const summary = session.summary!;
  const delta = sessionDelta(all, session, finalScores);
  const reviewed = session.teacher_status === "approved";
  const teacherName = teacher?.name ? `Cô/Thầy ${teacher.name.split(" ").at(-1)}` : "Giáo viên";
  const firstAudio = answers.find((a) => a.audio_url);
  const next = summary.nextActivity;

  return (
    <AppShell user={user} active="feedback">
      <Breadcrumb
        items={[
          { label: session.title, href: "/progress" },
          { label: `Phản hồi từ AI · Buổi #${session.seq}` },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 pt-3 pb-5 sm:px-9">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="m-0 text-[24px] font-bold tracking-[-0.5px] sm:text-[30px]">Phản hồi từ AI</h1>
          <p className="m-0 max-w-3xl text-sm text-muted sm:text-[15px]">
            Ngắn gọn, dễ hiểu, có thể làm theo ngay. Đây là phản hồi tham khảo, giáo viên là người đánh giá cuối cùng.
          </p>
          <span className="text-xs text-muted">{formatDateTime(session.completed_at)}</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {firstAudio && <PlayRecording src={`/api/audio/${firstAudio.id}`} className={btn.light} />}
          <form action={retrySession.bind(null, session.id)}>
            <button className={btn.dark}>Luyện lại</button>
          </form>
        </div>
      </div>

      {reviewed && (
        <div className="mx-5 mt-5 flex flex-wrap items-start gap-3 rounded-2xl bg-good-bg px-4 py-3 text-sm text-good sm:mx-9">
          <Icon d={ICON.check} size={18} width={2.4} className="mt-0.5" />
          <div className="flex flex-col gap-1">
            <strong>{teacherName} đã duyệt bài luyện này.</strong>
            {session.teacher_comment && <span className="text-ink">“{session.teacher_comment}”</span>}
          </div>
        </div>
      )}

      <ScoreOverview
        scores={scores}
        aiScores={reviewed ? session.scores : null}
        headline={summary.headline}
        delta={delta}
        notes={pickNotes(answers)}
      />
      <StrengthsImprovements strengths={summary.strengths} improvements={summary.improvements} />

      <div className="grid grid-cols-1 gap-4 px-5 py-3 sm:px-9 lg:grid-cols-2">
        <section className="flex flex-col gap-5 rounded-[22px] border border-line p-5">
          <h2 className="m-0 text-[17px] font-bold">Câu trả lời của bạn (có chú thích)</h2>
          {answers.map((a, i) => (
            <div key={a.id} className={i > 0 ? "border-t border-line pt-5" : ""}>
              <AnswerDetails answer={a} index={a.idx} showQuestion={answers.length > 1 || session.kind === "activity"} />
            </div>
          ))}
        </section>

        <section className="flex flex-col overflow-hidden rounded-[22px] bg-lilac">
          <div className="flex flex-col gap-3.5 p-5">
            <Pill className="self-start font-bold">Gợi ý luyện tập</Pill>
            <h2 className="m-0 text-[20px] leading-[1.35] font-bold">{summary.practice.instruction}</h2>
            {summary.practice.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {summary.practice.keywords.map((k) => (
                  <span key={k} className="rounded-xl bg-white px-4 py-2.5 text-[15px] font-bold">
                    {k}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3.5">
              <span className="text-xs font-bold text-link">Bài tiếp theo dành cho bạn · Cá nhân hoá</span>
              <span className="text-sm leading-normal font-semibold">
                {SKILL_SHORT_VI[next.skill]} của bạn cần luyện thêm. {next.title}.
              </span>
              <span className="text-[13px] text-muted">{next.description}</span>
              <form action={startActivity.bind(null, next.skill, next.topicId)}>
                <button className="cursor-pointer text-[13px] font-semibold text-link hover:underline">
                  Bắt đầu bài này →
                </button>
              </form>
            </div>
          </div>
          <div className="mt-auto flex flex-wrap justify-end gap-2.5 bg-lilac-deep px-5 py-3">
            <Link href="/dashboard" className={btn.white}>
              Để sau
            </Link>
            <form action={retrySession.bind(null, session.id)}>
              <button className={btn.dark}>Luyện lại ngay</button>
            </form>
          </div>
        </section>
      </div>

      <div className="mx-5 mt-3 mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-3.5 sm:mx-9">
        <Icon d={ICON.info} size={18} stroke="#5E5C68" />
        <span className="min-w-[220px] flex-1 text-[13px] text-muted">
          {reviewed
            ? `Giáo viên duyệt: đã xác nhận${session.teacher_scores ? " (điểm hiển thị là điểm giáo viên)" : ""}.`
            : `Giáo viên duyệt: đang chờ. ${teacherName} có thể xác nhận hoặc điều chỉnh phản hồi này.`}
        </span>
        <Link href="/progress" className={btn.link}>
          Đã lưu vào Tiến bộ của tôi
        </Link>
      </div>
    </AppShell>
  );
}
