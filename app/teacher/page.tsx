import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { classOverview, getClass } from "@/lib/data";
import { Breadcrumb, btn } from "@/components/ui";
import { Icon, ICON } from "@/components/icons";
import { fmt, level, SKILL_SHORT_VI, SKILL_VI, SKILLS, weakestSkill } from "@/lib/skills";
import { getAllTopics } from "@/lib/topics-db";
import { getTopic } from "@/lib/topics";
import { CountColumns, Dumbbell, RankedBars, ScoreLineChart, SegmentedBar, TableView } from "@/components/charts";

export const metadata = { title: "Tổng quan lớp · AI English Speaking Coach" };

export default async function TeacherHome() {
  const user = await requireUser("teacher");
  const [o, cls, allTopics] = await Promise.all([
    classOverview(user.class_id!),
    getClass(user.class_id!),
    getAllTopics(user.id),
  ]);
  const weeksWithData = o.weekly.filter((w) => w.avg != null);
  const trendFrom = weeksWithData[0];
  const trendTo = weeksWithData.at(-1);
  const trendDelta = trendFrom && trendTo && trendFrom !== trendTo ? trendTo.avg! - trendFrom.avg! : null;
  const lowStudents = o.summaries
    .filter((x) => x.profile.current && x.profile.current.total < 6.5)
    .sort((a, b) => a.profile.current!.total - b.profile.current!.total);
  const thisWeek = o.weekly.at(-1)!;
  const lastWeek = o.weekly.at(-2);
  const biggestGain =
    o.skillFirst && o.skillLatest
      ? [...SKILLS].sort((a, b) => o.skillLatest![b] - o.skillFirst![b] - (o.skillLatest![a] - o.skillFirst![a]))[0]
      : null;
  const trendText =
    trendDelta == null
      ? "Chưa đủ dữ liệu để so sánh giữa các tuần."
      : `Điểm TB ${trendDelta >= 0 ? "tăng" : "giảm"} ${Math.abs(trendDelta).toFixed(1)} điểm: ${fmt(trendFrom!.avg)} (tuần ${trendFrom!.range}) → ${fmt(trendTo!.avg)} (tuần ${trendTo!.range}).`;
  const weakest = o.skillAvg ? weakestSkill(o.skillAvg) : null;

  return (
    <>
      <Breadcrumb
        items={[{ label: user.name }, { label: "Tổng quan lớp" }]}
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

      {/* ---------------- Class statistics ---------------- */}
      <div className="flex items-end justify-between gap-3 px-5 pt-2 pb-3 sm:px-9">
        <h2 className="m-0 text-lg font-bold">Thống kê lớp</h2>
        <span className="text-xs text-muted">8 tuần gần nhất</span>
      </div>
      <div className="grid grid-cols-1 gap-4 px-5 pb-4 sm:px-9 xl:grid-cols-[3fr_2fr]">
        <section className="flex min-w-0 flex-col gap-2 rounded-[22px] border border-line p-5">
          <h3 className="m-0 text-[15px] font-bold">Điểm trung bình của lớp theo tuần</h3>
          <p className="m-0 text-[13px] text-muted">{trendText}</p>
          <ScoreLineChart
            labels={o.weekly.map((w) => w.label)}
            series={{ name: "Điểm TB lớp", values: o.weekly.map((w) => w.avg) }}
            ariaLabel={`Điểm trung bình của lớp theo tuần: ${o.weekly.map((w) => `${w.range} ${w.avg ?? "không có"}`).join("; ")}`}
          />
          <TableView
            head={["Tuần", "Điểm TB", "Lượt luyện", "Học sinh luyện"]}
            rows={o.weekly.map((w) => [w.range, fmt(w.avg), w.count, w.students])}
          />
        </section>
        <section className="flex min-w-0 flex-col gap-2 rounded-[22px] border border-line p-5">
          <h3 className="m-0 text-[15px] font-bold">Lượt luyện tập mỗi tuần</h3>
          <p className="m-0 text-[13px] text-muted">
            Tuần này: <strong className="text-ink">{thisWeek.count} lượt</strong> từ {thisWeek.students} học sinh
            {lastWeek ? ` (tuần trước ${lastWeek.count} lượt).` : "."}
          </p>
          <CountColumns
            data={o.weekly.map((w) => ({ label: w.label, value: w.count, title: `Tuần ${w.range} · ${w.students} học sinh` }))}
            unit="lượt"
            height={200}
            ariaLabel={`Lượt luyện tập mỗi tuần: ${o.weekly.map((w) => `${w.range} ${w.count}`).join("; ")}`}
          />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 px-5 pb-6 sm:px-9 lg:grid-cols-2 xl:grid-cols-3">
        <section className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-line p-5">
          <h3 className="m-0 text-[15px] font-bold">Tiến bộ theo kỹ năng</h3>
          <p className="m-0 text-[13px] text-muted">
            {o.skillFirst && o.skillLatest && biggestGain
              ? `Buổi đầu tiên so với buổi gần nhất của ${o.progressStudents} học sinh. Tăng nhiều nhất: ${SKILL_VI[biggestGain].toLowerCase()} (+${(o.skillLatest[biggestGain] - o.skillFirst[biggestGain]).toFixed(1)}).`
              : "Cần học sinh luyện ít nhất 2 buổi để so sánh."}
          </p>
          {o.skillFirst && o.skillLatest && (
            <Dumbbell
              beforeLabel="Buổi đầu tiên"
              afterLabel="Buổi gần nhất"
              rows={SKILLS.map((k) => ({ label: SKILL_VI[k], before: o.skillFirst![k], after: o.skillLatest![k] }))}
            />
          )}
        </section>
        <section className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-line p-5">
          <h3 className="m-0 text-[15px] font-bold">Học sinh theo mức điểm</h3>
          <p className="m-0 text-[13px] text-muted">
            Theo điểm TB 3 buổi gần nhất của mỗi học sinh.
            {o.distribution.low > 0 ? ` ${o.distribution.low} học sinh dưới 6,5 điểm cần được kèm thêm.` : ""}
          </p>
          <SegmentedBar
            total={o.totalStudents}
            parts={[
              { label: "Tốt (≥ 8)", value: o.distribution.good, color: "#3FAE7A", text: "#0B3D24" },
              { label: "Khá (6,5–8)", value: o.distribution.ok, color: "#E3A92B", text: "#3D2A00" },
              { label: "Cần cải thiện (< 6,5)", value: o.distribution.low, color: "#E0624A", text: "#FFFFFF" },
              { label: "Chưa luyện", value: o.distribution.none, color: "#D9D6E2", text: "#16151A" },
            ]}
          />
          {lowStudents.length > 0 && (
            <div className="mt-1 flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted">Dưới 6,5 điểm · thấp nhất trước</span>
              {lowStudents.slice(0, 5).map((s) => (
                <Link
                  key={s.user.id}
                  href={`/teacher/students/${s.user.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-soft px-3 py-2 text-sm hover:bg-line"
                >
                  <span className="truncate font-semibold">{s.user.name}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                    {s.profile.weakest && <span>Yếu: {SKILL_SHORT_VI[s.profile.weakest]}</span>}
                    <strong className="text-sm text-bad tabular-nums">{fmt(s.profile.current?.total)}</strong>
                  </span>
                </Link>
              ))}
              {lowStudents.length > 5 && <span className="text-xs text-muted">+{lowStudents.length - 5} học sinh khác</span>}
            </div>
          )}
        </section>
        <section className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-line p-5 lg:col-span-2 xl:col-span-1">
          <h3 className="m-0 text-[15px] font-bold">Chủ đề được luyện nhiều nhất</h3>
          {o.topics.length ? (
            <RankedBars
              unit="lượt"
              rows={o.topics.slice(0, 6).map((t) => ({
                label: getTopic(allTopics, t.topicId)?.title ?? t.topicId,
                value: t.count,
                sub: t.avg != null ? `TB ${fmt(t.avg)}` : undefined,
              }))}
            />
          ) : (
            <p className="m-0 text-sm text-muted">Chưa có lượt luyện nào.</p>
          )}
        </section>
      </div>

      <Link
        href="/teacher/students"
        className="mx-5 mb-8 flex flex-wrap items-center gap-4 rounded-[22px] border border-line p-5 transition-colors hover:border-brand sm:mx-9"
      >
        <span className="flex size-11 items-center justify-center rounded-2xl bg-lilac-soft text-brand">
          <Icon d={ICON.school} size={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-bold">Danh sách học sinh</span>
          <span className="text-[13px] text-muted">
            {o.totalStudents} học sinh · {o.needSupport.length} cần hỗ trợ · tìm kiếm, lọc theo trạng thái, xem hồ sơ từng em
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
          Mở danh sách <Icon d={ICON.chevronRight} size={16} width={2} />
        </span>
      </Link>
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
