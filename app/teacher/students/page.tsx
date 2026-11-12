import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { classOverview, getClass } from "@/lib/data";
import { getTopics } from "@/lib/topics-db";
import { initials } from "@/components/AppShell";
import { Breadcrumb, btn, PageHeader } from "@/components/ui";
import { Icon, ICON } from "@/components/icons";
import { SKILL_SHORT_VI } from "@/lib/skills";
import { finalScores } from "@/lib/types";
import { StudentsTable, type StudentRow } from "./StudentsTable";

export const metadata = { title: "Học sinh · AI English Speaking Coach" };

export default async function StudentsPage() {
  const user = await requireUser("teacher");
  const [o, cls, topics] = await Promise.all([classOverview(user.class_id!), getClass(user.class_id!), getTopics(user.id)]);

  const rows: StudentRow[] = o.summaries.map((s) => ({
    id: s.user.id,
    name: s.user.name,
    login: s.user.login,
    initials: initials(s.user.name),
    activated: s.user.activated,
    activationCode: s.user.activation_code,
    resetRequested: Boolean(s.user.reset_requested_at),
    count: s.profile.count,
    topicsDone: s.profile.topicsDone.filter((id) => topics.some((t) => t.id === id)).length,
    topicsTotal: topics.length,
    avg: s.avg?.total ?? null,
    trendValues: s.profile.sessions
      .slice(-8)
      .map((x) => finalScores(x)?.total)
      .filter((v): v is number => v != null),
    trend: s.trend,
    weakest: s.profile.weakest ? SKILL_SHORT_VI[s.profile.weakest] : null,
    status: s.status,
    pending: s.pending,
    daysInactive: s.daysInactive,
  }));

  return (
    <>
      <Breadcrumb items={[{ label: "Tổng quan lớp", href: "/teacher" }, { label: "Học sinh" }]} />
      <PageHeader
        title={`Học sinh lớp ${cls?.name ?? ""}`}
        subtitle={`${o.totalStudents} học sinh · ${o.activeThisWeek} em luyện tập trong tuần này · ${o.needSupport.length} em cần hỗ trợ thêm.`}
        actions={
          <div className="flex flex-wrap gap-2.5">
            <a href="/api/teacher/report" className={btn.light}>
              <Icon d={ICON.download} size={16} /> Xuất báo cáo
            </a>
            <Link href="/teacher/students/new" className={btn.dark}>
              <Icon d={ICON.plus} size={16} width={2} /> Thêm học sinh
            </Link>
          </div>
        }
      />
      <StudentsTable rows={rows} />
    </>
  );
}
