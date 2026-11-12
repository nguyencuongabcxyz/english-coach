import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { studentProfile } from "@/lib/data";
import { one } from "@/lib/db";
import { initials } from "@/components/AppShell";
import { Breadcrumb, btn, EmptyState, PageHeader, shortDate } from "@/components/ui";
import { getTopic } from "@/lib/topics";
import { getAllTopics, ownerIdFor } from "@/lib/topics-db";
import { SKILL_SHORT_VI } from "@/lib/skills";
import { finalScores } from "@/lib/types";
import { ProgressCharts } from "./ProgressCharts";

export const metadata = { title: "Tiến bộ của tôi · AI English Speaking Coach" };

export default async function ProgressPage() {
  const user = await requireUser("student");
  const [p, cls, all] = await Promise.all([
    studentProfile(user.id),
    one<{ name: string; grade: number }>(`SELECT name, grade FROM classes WHERE id = $1`, [user.class_id]),
    ownerIdFor(user).then(getAllTopics),
  ]);
  const rows = p.sessions
    .filter((s) => finalScores(s))
    .map((s) => {
      const sc = finalScores(s)!;
      return {
        id: s.id,
        seq: s.seq,
        topicId: s.topic_id,
        topic: getTopic(all, s.topic_id)?.title ?? s.topic_id,
        title: s.title,
        date: shortDate(s.completed_at),
        reviewed: s.teacher_status === "approved",
        total: sc.total,
        fluency: sc.fluency,
        vocabulary: sc.vocabulary,
        grammar: sc.grammar,
        pronunciation: sc.pronunciation,
        content: sc.content,
      };
    });
  const progressLabel =
    p.progress == null ? "Chưa đủ dữ liệu" : p.progress > 0 ? `Đang tiến bộ · +${p.progress}` : p.progress < 0 ? `Cần cố gắng · ${p.progress}` : "Ổn định · ±0.0";

  return (
    <>
      <Breadcrumb items={[{ label: user.name.split(" ").slice(-2).join(" "), href: "/dashboard" }, { label: "Tiến bộ của tôi" }]} />
      <PageHeader
        title="Tiến bộ của tôi"
        subtitle="Mỗi lần luyện tập đều được lưu lại để bạn thấy kỹ năng nói thay đổi theo thời gian."
      />
      {rows.length === 0 ? (
        <EmptyState
          title="Chưa có dữ liệu tiến bộ"
          text="Sau buổi luyện đầu tiên, điểm của bạn sẽ được lưu ở đây và vẽ thành biểu đồ."
          action={
            <Link href="/topics" className={btn.dark}>
              Bắt đầu luyện nói
            </Link>
          }
        />
      ) : (
        <ProgressCharts
          rows={rows}
          topics={all.filter((t) => p.topicsDone.includes(t.id)).map((t) => ({ id: t.id, title: t.title }))}
          profile={
            <section aria-label="Hồ sơ học sinh" className="flex flex-[1_1_280px] flex-col overflow-hidden rounded-[22px] bg-lilac">
              <div className="flex flex-col gap-3.5 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-[52px] items-center justify-center rounded-full bg-white font-extrabold">{initials(user.name)}</span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[17px] font-bold">{user.name}</span>
                    <span className="text-[13px] text-lilac-ink">Hồ sơ luyện tập</span>
                  </span>
                </div>
                <dl className="m-0 flex flex-col rounded-2xl bg-white px-4 py-1.5">
                  <Item k="Mã học sinh" v={user.login} />
                  <Item k="Khối / Lớp" v={cls ? `${cls.grade} / ${cls.name}` : "–"} />
                  <Item
                    k="Chủ đề đã luyện"
                    v={p.topicsDone.map((id) => getTopic(all, id)?.title ?? id).join(", ") || "–"}
                  />
                  <Item k="Số lần luyện" v={String(p.count)} />
                  <Item k="Kỹ năng còn hạn chế" v={p.weak.map((k) => SKILL_SHORT_VI[k]).join(", ") || "Không có"} last />
                </dl>
              </div>
              <div className="mt-auto flex items-center justify-between bg-lilac-deep px-5 py-3">
                <span className="text-[13px] font-semibold">Mức độ tiến bộ</span>
                <span className="rounded-full bg-white px-3 py-1.5 text-[13px] font-bold">{progressLabel}</span>
              </div>
            </section>
          }
        />
      )}
    </>
  );
}

function Item({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 py-2.5 text-[13px] ${last ? "" : "border-b border-shell"}`}>
      <dt className="text-muted">{k}</dt>
      <dd className="m-0 text-right font-bold">{v}</dd>
    </div>
  );
}
