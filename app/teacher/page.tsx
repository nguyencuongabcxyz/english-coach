import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { classOverview, getClass } from "@/lib/data";
import { initials } from "@/components/AppShell";
import { Breadcrumb, btn } from "@/components/ui";
import { Icon, ICON } from "@/components/icons";
import { fmt, level, SKILL_SHORT_VI, SKILL_VI, SKILLS, weakestSkill } from "@/lib/skills";
import { getTopics } from "@/lib/topics-db";
import { issueActivationCode } from "@/app/actions/teacher";
import type { StudentSummary } from "@/lib/data";

export const metadata = { title: "Tổng quan lớp · AI English Speaking Coach" };

const AVATAR = ["#CDD0F8", "#C8F2DD", "#FBE5BC", "#F6CBBF", "#CDE6F7"];

const STATUS: Record<StudentSummary["status"], { label: string; bg: string; fg: string }> = {
  progress: { label: "Đang tiến bộ", bg: "#EEEFFD", fg: "#3A3BA8" },
  stable: { label: "Ổn định", bg: "#D9F5E6", fg: "#11663F" },
  support: { label: "Cần hỗ trợ", bg: "#FBD9D2", fg: "#9B2C1A" },
  inactive: { label: "Không hoạt động", bg: "#F3F2F7", fg: "#5E5C68" },
  new: { label: "Chưa luyện", bg: "#F3F2F7", fg: "#5E5C68" },
};

export default async function TeacherHome() {
  const user = await requireUser("teacher");
  const [o, cls, topics] = await Promise.all([classOverview(user.class_id!), getClass(user.class_id!), getTopics()]);
  const weakest = o.skillAvg ? weakestSkill(o.skillAvg) : null;
  const firstName = user.name.split(" ").at(-1);

  return (
    <>
      <Breadcrumb
        items={[{ label: `Cô ${firstName}` }, { label: "Tổng quan lớp" }]}
        right={
          <label className="flex items-center gap-2 text-[13px]">
            <span className="text-muted">Lớp</span>
            <select className="min-h-9 rounded-full border border-line px-3 text-[13px] font-semibold" defaultValue={cls?.id}>
              <option value={cls?.id}>
                {cls?.name} · {o.totalStudents} học sinh
              </option>
            </select>
          </label>
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-2 pb-2 sm:px-9">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[24px] font-bold tracking-[-0.5px] sm:text-[30px]">Lớp {cls?.name}</h1>
          <p className="m-0 text-sm text-muted sm:text-[15px]">
            Theo dõi việc luyện tập, kỹ năng còn yếu và học sinh cần hỗ trợ thêm. Điểm AI chỉ để tham khảo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <a href="/api/teacher/report" className={btn.light}>
            <Icon d={ICON.download} size={16} /> Xuất báo cáo
          </a>
          <Link href="/teacher/students/new" className={btn.dark}>
            <Icon d={ICON.plus} size={16} width={2} /> Thêm học sinh
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 py-5 sm:px-9 md:grid-cols-4 md:gap-3.5">
        <Stat label="Hoạt động tuần này" value={String(o.activeThisWeek)} suffix={`/ ${o.totalStudents}`} />
        <Stat label="Lượt luyện tập" value={String(o.totalSessions)} />
        <Stat label="Điểm TB của lớp" value={fmt(o.classAvg)} suffix="/ 10" />
        <Stat label="Chờ thầy cô duyệt" value={String(o.pendingTotal)} href="/teacher/review" />
      </div>

      <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:px-9 lg:grid-cols-[minmax(280px,1fr)_2fr]">
        <section className="flex flex-col gap-3 rounded-[22px] bg-peach p-4 sm:p-5">
          <h2 className="m-0 text-[17px] font-bold">Cần hỗ trợ thêm</h2>
          {o.needSupport.length === 0 && <p className="m-0 rounded-2xl bg-white p-3.5 text-sm">Hiện chưa có học sinh nào cần hỗ trợ.</p>}
          {o.needSupport.slice(0, 4).map((s) => {
            const w = s.profile.weakest;
            return (
              <Link
                key={s.user.id}
                href={`/teacher/students/${s.user.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-3 hover:shadow-md"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{s.user.name}</span>
                  <span className="text-xs text-muted">
                    {s.status === "inactive"
                      ? `${s.daysInactive} ngày chưa luyện tập`
                      : `${w ? `${SKILL_SHORT_VI[w]} ${fmt(s.profile.current?.[w])}` : ""} · ${s.profile.count} lượt`}
                  </span>
                </span>
                <span className={`shrink-0 text-xs font-bold ${s.status === "inactive" ? "text-ink" : "text-bad"}`}>
                  {s.status === "inactive" ? "Không hoạt động" : s.trend != null ? `${s.trend > 0 ? "+" : s.trend === 0 ? "±" : ""}${s.trend.toFixed(1)}` : ""}
                </span>
              </Link>
            );
          })}
          {o.needSupport.length > 4 && <span className="text-xs font-semibold">+{o.needSupport.length - 4} học sinh khác</span>}
        </section>

        <section className="flex flex-col gap-3.5 rounded-[22px] border border-line p-5">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[17px] font-bold">Điểm TB theo kỹ năng</h2>
            <span className="text-xs text-muted">30 ngày qua</span>
          </div>
          {o.skillAvg ? (
            <>
              {SKILLS.map((k) => {
                const v = o.skillAvg![k];
                return (
                  <div key={k} className="grid grid-cols-[90px_1fr_36px] items-center gap-3 text-sm sm:grid-cols-[110px_1fr_40px]">
                    <span>{SKILL_VI[k]}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-shell">
                      <div className="h-2 rounded-full" style={{ width: `${v * 10}%`, background: level(v).bar }} />
                    </div>
                    <span className="text-right font-bold">{fmt(v)}</span>
                  </div>
                );
              })}
              {weakest && (
                <p className="m-0 rounded-xl bg-soft px-3.5 py-2.5 text-xs leading-normal text-muted">
                  {SKILL_VI[weakest]} là kỹ năng yếu nhất của {o.weakestCount} học sinh. Thầy cô có thể giao hoạt động luyện{" "}
                  {SKILL_VI[weakest].toLowerCase()} cho cả lớp vào tuần tới.
                </p>
              )}
            </>
          ) : (
            <p className="m-0 text-sm text-muted">Chưa có dữ liệu luyện tập trong 30 ngày qua.</p>
          )}
        </section>
      </div>

      <section className="mx-5 mb-8 overflow-hidden rounded-[22px] border border-line sm:mx-9">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
          <h2 className="m-0 text-[17px] font-bold">Danh sách học sinh</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">{o.totalStudents} học sinh</span>
            <Link href="/teacher/students/new" className={btn.link}>
              + Thêm học sinh
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="bg-soft text-left">
                {["Học sinh", "Lượt luyện", "Chủ đề", "Điểm TB", "Kỹ năng yếu", "Tiến bộ", "Trạng thái", ""].map((h, i) => (
                  <th key={i} scope="col" className={`py-3 text-xs font-semibold text-muted ${i === 0 ? "px-5" : "px-3"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {o.summaries.map((s, i) => {
                const st = STATUS[s.status];
                const w = s.profile.weakest;
                return (
                  <tr key={s.user.id} className="border-t border-line">
                    <th scope="row" className="px-5 py-3 text-left font-normal">
                      <Link href={`/teacher/students/${s.user.id}`} className="flex items-center gap-2.5 hover:underline">
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                          style={{ background: AVATAR[i % AVATAR.length] }}
                        >
                          {initials(s.user.name)}
                        </span>
                        <span className="flex flex-col">
                          <span className="font-semibold">{s.user.name}</span>
                          <span className="text-xs text-muted">{s.user.login}</span>
                        </span>
                      </Link>
                    </th>
                    <td className="px-3 py-3">{s.profile.count}</td>
                    <td className="px-3 py-3">
                      {s.profile.topicsDone.filter((id) => topics.some((t) => t.id === id)).length}/{topics.length}
                    </td>
                    <td className="px-3 py-3 font-bold">{fmt(s.avg?.total)}</td>
                    <td className="px-3 py-3">{w ? SKILL_SHORT_VI[w] : "–"}</td>
                    <td className={`px-3 py-3 font-semibold ${s.trend == null ? "text-muted" : s.trend > 0 ? "text-good" : s.trend < 0 ? "text-bad" : "text-muted"}`}>
                      {s.trend == null ? "–" : `${s.trend > 0 ? "+" : s.trend === 0 ? "±" : ""}${s.trend.toFixed(1)}`}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap" style={{ background: st.bg, color: st.fg }}>
                        {st.label}
                      </span>
                      {!s.user.activated && s.user.activation_code && (
                        <span className="mt-1 block text-[11px] text-muted">
                          Mã kích hoạt: <strong className="font-mono text-ink">{s.user.activation_code}</strong>
                        </span>
                      )}
                      {s.user.reset_requested_at && (
                        <span className="mt-1 block text-[11px] font-semibold text-bad">Yêu cầu đặt lại mật khẩu</span>
                      )}
                      {s.user.activated && s.user.activation_code && (
                        <span className="mt-1 block text-[11px] text-muted">
                          Mã đặt lại: <strong className="font-mono text-ink">{s.user.activation_code}</strong>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      {s.pending > 0 ? (
                        <Link
                          href={`/teacher/review?student=${s.user.id}`}
                          className="inline-flex min-h-9 items-center rounded-full bg-ink px-3.5 text-xs font-semibold text-white"
                        >
                          Duyệt ({s.pending})
                        </Link>
                      ) : !s.user.activated || s.user.reset_requested_at ? (
                        <form action={issueActivationCode.bind(null, s.user.id)}>
                          <button className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-line-strong px-3.5 text-xs font-semibold hover:bg-soft">
                            {s.user.activated ? "Cấp mã đặt lại" : "Cấp mã mới"}
                          </button>
                        </form>
                      ) : (
                        <Link
                          href={`/teacher/students/${s.user.id}`}
                          className="inline-flex min-h-9 items-center rounded-full border border-line-strong px-3.5 text-xs font-semibold hover:bg-soft"
                        >
                          Xem
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

function Stat({ label, value, suffix, href }: { label: string; value: string; suffix?: string; href?: string }) {
  const inner = (
    <>
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[24px] font-bold sm:text-[28px]">
        {value} {suffix && <span className="text-base font-medium text-muted">{suffix}</span>}
      </span>
    </>
  );
  const cls = "flex flex-col gap-1.5 rounded-[18px] border border-line p-4 sm:p-[18px]";
  return href ? (
    <Link href={href} className={`${cls} hover:border-line-strong`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
