import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { pendingReviews } from "@/lib/data";
import { initials } from "@/components/AppShell";
import { Breadcrumb, formatDateTime, PageHeader } from "@/components/ui";
import { Icon, ICON } from "@/components/icons";
import { getTopic } from "@/lib/topics";
import { getAllTopics } from "@/lib/topics-db";
import { fmt } from "@/lib/skills";
import { finalScores } from "@/lib/types";

export const metadata = { title: "Duyệt bài luyện · AI English Speaking Coach" };

export default async function ReviewList({ searchParams }: PageProps<"/teacher/review">) {
  const user = await requireUser("teacher");
  const sp = await searchParams;
  const tab = sp.tab === "approved" ? "approved" : sp.tab === "all" ? "all" : "pending";
  const student = typeof sp.student === "string" ? sp.student : null;
  const [all, topics] = await Promise.all([pendingReviews(user.class_id!), getAllTopics()]);
  const scoped = student ? all.filter((s) => s.student_id === student) : all;
  const list = scoped.filter((s) => tab === "all" || s.teacher_status === tab);
  const count = (t: string) => scoped.filter((s) => t === "all" || s.teacher_status === t).length;
  const qs = (t: string) => `/teacher/review?tab=${t}${student ? `&student=${student}` : ""}`;

  return (
    <>
      <Breadcrumb items={[{ label: "Tổng quan lớp", href: "/teacher" }, { label: "Duyệt bài luyện" }]} />
      <PageHeader
        title="Duyệt bài luyện"
        subtitle="Nghe lại bài nói, xem phản hồi của AI và xác nhận hoặc điều chỉnh điểm trước khi ghi nhận."
      />
      {sp.done === "1" && (
        <p role="status" className="mx-5 mt-5 mb-0 rounded-xl bg-good-bg px-4 py-3 text-sm font-medium text-good sm:mx-9">
          Đã duyệt xong. Không còn bài nào đang chờ.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 px-5 pt-5 sm:px-9">
        {[
          ["pending", "Chờ duyệt"],
          ["approved", "Đã duyệt"],
          ["all", "Tất cả"],
        ].map(([k, l]) => (
          <Link
            key={k}
            href={qs(k)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-[13px] ${
              tab === k ? "bg-ink font-semibold text-white" : "bg-chip font-medium"
            }`}
          >
            {l} <span className="opacity-70">{count(k)}</span>
          </Link>
        ))}
        {student && (
          <Link href={`/teacher/review?tab=${tab}`} className="ml-1 text-[13px] font-semibold text-link">
            Bỏ lọc học sinh ×
          </Link>
        )}
      </div>
      <ul className="m-0 flex list-none flex-col gap-2.5 px-5 pt-4 pb-8 sm:px-9">
        {list.length === 0 && <li className="rounded-2xl bg-soft p-5 text-sm text-muted">Không có bài luyện nào.</li>}
        {list.map((s) => {
          const t = getTopic(topics, s.topic_id);
          return (
            <li key={s.id}>
              <Link
                href={`/teacher/review/${s.id}`}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-line px-4 py-3 hover:border-line-strong hover:shadow-sm sm:flex-nowrap"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: t?.bg }}>
                  {initials(s.student_name)}
                </span>
                <span className="flex min-w-0 flex-1 basis-[calc(100%-60px)] flex-col sm:basis-auto">
                  <span className="truncate text-sm font-semibold">
                    {s.student_name} <span className="font-normal text-muted">· Buổi #{s.seq}</span>
                  </span>
                  <span className="truncate text-xs text-muted">
                    {t?.title} · {s.title} · {formatDateTime(s.completed_at)}
                  </span>
                </span>
                <span className="rounded-full bg-lilac px-2.5 py-1 text-sm font-extrabold">{fmt(finalScores(s)?.total)}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    s.teacher_status === "approved" ? "bg-good-bg text-good" : "bg-ok-bg text-ok"
                  }`}
                >
                  {s.teacher_status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
                </span>
                <Icon d={ICON.chevronRight} size={16} width={2} />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
