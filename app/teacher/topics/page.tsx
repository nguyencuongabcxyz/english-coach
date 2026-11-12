import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAllTopics } from "@/lib/topics-db";
import { Breadcrumb, btn, PageHeader } from "@/components/ui";
import { Icon, ICON } from "@/components/icons";
import { moveTopicAction, toggleTopicHidden } from "@/app/actions/topics";

export const metadata = { title: "Chủ đề luyện nói · AI English Speaking Coach" };

export default async function TeacherTopicsPage({ searchParams }: PageProps<"/teacher/topics">) {
  await requireUser("teacher");
  const [topics, sp] = await Promise.all([getAllTopics(), searchParams]);
  const saved = typeof sp.saved === "string" ? topics.find((t) => t.id === sp.saved) : null;

  return (
    <>
      <Breadcrumb items={[{ label: "Tổng quan lớp", href: "/teacher" }, { label: "Chủ đề luyện nói" }]} />
      <PageHeader
        title="Chủ đề luyện nói"
        subtitle="Thêm chủ đề theo chương trình của lớp, sửa câu hỏi, mẹo trả lời và từ vựng. Chủ đề bị ẩn sẽ không hiện với học sinh."
        actions={
          <Link href="/teacher/topics/new" className={btn.dark}>
            <Icon d={ICON.plus} size={16} width={2} /> Thêm chủ đề
          </Link>
        }
      />
      {saved && (
        <p role="status" className="mx-5 mt-5 mb-0 rounded-xl bg-good-bg px-4 py-3 text-sm font-medium text-good sm:mx-9">
          Đã lưu chủ đề “{saved.title}”. Học sinh sẽ thấy thay đổi ngay.
        </p>
      )}

      <div className="grid grid-cols-1 gap-[18px] px-5 pt-6 pb-10 sm:px-9 md:grid-cols-2 xl:grid-cols-3">
        {topics.map((t, i) => {
          const visibleSubs = t.subtopics.filter((s) => !s.hidden);
          const questions = visibleSubs.reduce((a, s) => a + s.questions.length, 0);
          return (
            <section
              key={t.id}
              className={`flex flex-col overflow-hidden rounded-[22px] ${t.hidden ? "opacity-60" : ""}`}
              style={{ background: t.bg }}
            >
              <div className="flex flex-col gap-2.5 p-3.5">
                <div className="flex items-center gap-3 px-0.5 pt-1 pb-1.5">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-white text-[15px] font-extrabold">
                    {t.n}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[17px] font-bold">{t.title}</span>
                    <span className="text-xs" style={{ color: t.ink }}>
                      {t.vi || "—"}
                    </span>
                  </span>
                  <div className="flex flex-col">
                    <form action={moveTopicAction.bind(null, t.id, -1)}>
                      <button
                        disabled={i === 0}
                        aria-label="Đưa lên trên"
                        className="flex size-7 cursor-pointer items-center justify-center rounded-lg hover:bg-white/60 disabled:cursor-default disabled:opacity-30"
                      >
                        <Icon d="m6 15 6-6 6 6" size={14} width={2} />
                      </button>
                    </form>
                    <form action={moveTopicAction.bind(null, t.id, 1)}>
                      <button
                        disabled={i === topics.length - 1}
                        aria-label="Đưa xuống dưới"
                        className="flex size-7 cursor-pointer items-center justify-center rounded-lg hover:bg-white/60 disabled:cursor-default disabled:opacity-30"
                      >
                        <Icon d="m6 9 6 6 6-6" size={14} width={2} />
                      </button>
                    </form>
                  </div>
                </div>
                {t.subtopics.map((s) => (
                  <div
                    key={s.id}
                    className={`flex min-h-11 items-center gap-3 rounded-[14px] bg-white px-3.5 py-2.5 ${s.hidden ? "opacity-50" : ""}`}
                  >
                    <span className="flex flex-1 flex-col gap-0.5">
                      <span className="text-sm font-semibold">{s.name}</span>
                      <span className="text-xs text-muted">
                        {s.questions.length} câu hỏi{s.hidden ? " · đang ẩn" : ""}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 px-3.5 py-2.5" style={{ background: t.foot }}>
                <span className="rounded-full bg-white px-2.5 py-[5px] text-xs font-semibold">
                  {t.hidden ? "Đang ẩn" : "Đang hiện"} · {questions} câu hỏi
                </span>
                <span className="flex-1" />
                <form action={toggleTopicHidden.bind(null, t.id, !t.hidden)}>
                  <button className="inline-flex min-h-9 cursor-pointer items-center rounded-full bg-white/70 px-3.5 text-xs font-semibold hover:bg-white">
                    {t.hidden ? "Hiện lại" : "Ẩn"}
                  </button>
                </form>
                <Link
                  href={`/teacher/topics/${t.id}`}
                  className="inline-flex min-h-9 items-center rounded-full bg-ink px-3.5 text-xs font-semibold text-white"
                >
                  Sửa
                </Link>
              </div>
            </section>
          );
        })}
        <Link
          href="/teacher/topics/new"
          className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-line-strong p-6 text-center hover:border-ink"
        >
          <Icon d={ICON.plus} size={28} stroke="#5E5C68" />
          <span className="text-[15px] font-bold">Thêm chủ đề mới</span>
          <span className="max-w-[240px] text-[13px] leading-normal text-muted">
            Bổ sung chủ đề theo chương trình của khối lớp. AI có thể gợi ý sẵn câu hỏi.
          </span>
        </Link>
      </div>
    </>
  );
}
