import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { inProgressSession, studentProfile } from "@/lib/data";
import { Icon, ICON } from "@/components/icons";
import { Breadcrumb, btn, formatDateTime, Pill } from "@/components/ui";
import { findSubtopic, getTopic, topicColors } from "@/lib/topics";
import { getAllTopics, getTopics, ownerIdFor } from "@/lib/topics-db";
import { activityFor, fmt, level, SKILL_SHORT_VI, SKILL_VI, SKILLS } from "@/lib/skills";
import { finalScores } from "@/lib/types";
import { startActivity, startTopic } from "@/app/actions/practice";

export const metadata = { title: "Tổng quan · AI English Speaking Coach" };

function greeting() {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh", hour: "numeric", hour12: false }));
  return h < 11 ? "Chào buổi sáng" : h < 14 ? "Chào buổi trưa" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
}

const CYCLE = [
  "Thực hành",
  "Thu thập dữ liệu",
  "Phân tích",
  "Điểm mạnh / điểm yếu",
  "Đề xuất bài luyện",
  "Thực hành lại",
  "So sánh kết quả",
  "Cập nhật hồ sơ",
];

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser("student");
  const [profile, resume, sp, TOPICS, ALL] = await Promise.all([
    studentProfile(user.id),
    inProgressSession(user.id),
    searchParams,
    ownerIdFor(user).then(getTopics),
    ownerIdFor(user).then(getAllTopics),
  ]);
  const parts = user.name.trim().split(/\s+/);
  const firstName = parts.length >= 3 ? parts.slice(-2).join(" ") : parts.at(-1);
  const latest = profile.latest;
  const latestScores = latest ? finalScores(latest) : null;
  const notDone = TOPICS.filter((t) => !profile.topicsDone.includes(t.id));
  const recent = profile.sessions.slice(-3).reverse();
  const suggestion =
    latest?.summary?.nextActivity ??
    (profile.weakest
      ? activityFor(
          profile.weakest,
          latest?.topic_id ?? TOPICS[0]?.id ?? "family",
          getTopic(ALL, latest?.topic_id ?? "")?.title ?? TOPICS[0]?.title ?? "Family",
        )
      : null);
  const welcome = sp.welcome === "1" || profile.count === 0;
  const trial = findSubtopic(TOPICS, "family-activities") ?? (TOPICS[0] ? { topic: TOPICS[0], sub: TOPICS[0].subtopics[0] } : null);

  return (
    <>
      <Breadcrumb
        items={[{ label: "Trang chủ" }, { label: "Tổng quan" }]}
        right={
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted">Chuỗi ngày luyện</span>
            <span className="rounded-full bg-sand px-3 py-1.5 text-[13px] font-bold">{profile.streak} ngày</span>
          </div>
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-2 pb-2 sm:px-9 sm:pt-[18px]">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-[24px] font-bold tracking-[-0.5px] sm:text-[30px]">
            {greeting()}, {firstName}
          </h1>
          <p className="m-0 text-sm text-muted sm:text-[15px]">
            Luyện nói bất cứ lúc nào. Bài luyện tiếp theo được chọn dựa trên kết quả buổi gần nhất.
          </p>
        </div>
        <Link href={resume ? `/practice/${resume.id}` : "/topics"} className={btn.dark}>
          <Icon d={resume ? ICON.mic : ICON.plus} size={16} width={2} />
          {resume ? "Tiếp tục buổi đang luyện" : "Luyện tập mới"}
        </Link>
      </div>

      {/* Stat cards */}
      <div className="stagger grid grid-cols-2 gap-3 px-5 py-5 sm:px-9 md:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] md:gap-3.5">
        <Stat label="Số lần luyện tập" value={String(profile.count)} note={`+${profile.weekCount} trong tuần này`} tone="good" />
        <Stat
          label="Chủ đề đã luyện"
          value={String(TOPICS.length - notDone.length)}
          suffix={`/ ${TOPICS.length}`}
          note={notDone.length ? `Chưa luyện chủ đề ${notDone.map((t) => t.title).join(", ")}` : "Đã luyện đủ các chủ đề"}
        />
        <Stat
          label="Điểm gần nhất"
          value={fmt(profile.latestScore)}
          suffix="/ 10"
          note={profile.progress != null && profile.count > 1 ? `${profile.progress >= 0 ? "+" : ""}${profile.progress} so với lần 1` : "Chưa có so sánh"}
          tone={profile.progress != null && profile.progress >= 0 ? "good" : "muted"}
        />
        <Stat
          label="Kỹ năng cần tập trung"
          value={profile.weakest ? SKILL_VI[profile.weakest] : "–"}
          note={profile.weakest && profile.current ? `${fmt(profile.current[profile.weakest])} · ${level(profile.current[profile.weakest]).label}` : "Hãy luyện buổi đầu tiên"}
          tone="bad"
          small
        />
      </div>

      <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:px-9 md:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
        {/* Suggestion card */}
        {welcome && !latest && trial ? (
          <section className="flex flex-col overflow-hidden rounded-[22px] bg-lilac">
            <div className="flex flex-col gap-3.5 p-5 sm:p-[22px]">
              <Pill className="self-start font-bold">Chào mừng bạn!</Pill>
              <h2 className="m-0 text-[22px] font-bold">Nói thử 30 giây để AI hiểu bạn hơn.</h2>
              <div className="flex items-center gap-3.5 rounded-2xl bg-white p-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-lilac-soft">
                  <Icon d={ICON.mic} size={20} stroke="#2E2F5C" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[15px] font-bold">{trial.sub.name}</span>
                  <span className="text-[13px] text-muted">Trả lời một câu hỏi quen thuộc. Kết quả dùng để gợi ý bài luyện đầu tiên.</span>
                </div>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5 bg-lilac-deep px-5 py-3 sm:px-[22px]">
              <div className="flex gap-2">
                <Pill>Nói thử</Pill>
                <Pill>~2 phút</Pill>
              </div>
              <form action={startTopic.bind(null, trial.sub.id)}>
                <button className={btn.dark}>Bắt đầu ngay</button>
              </form>
            </div>
          </section>
        ) : suggestion ? (
          <section className="flex flex-col overflow-hidden rounded-[22px] bg-lilac">
            <div className="flex flex-col gap-3.5 p-5 sm:p-[22px]">
              <div className="flex flex-wrap items-center gap-2.5">
                <Pill className="font-bold">Gợi ý cho bạn</Pill>
                {latest && <span className="text-xs text-lilac-ink">Dựa trên buổi luyện #{latest.seq}</span>}
              </div>
              <h2 className="m-0 text-[20px] font-bold sm:text-[22px]">
                {SKILL_VI[suggestion.skill]} của bạn cần luyện thêm.
              </h2>
              <div className="flex items-center gap-3.5 rounded-2xl bg-white p-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-lilac-soft">
                  <Icon d={ICON.timer} size={20} stroke="#2E2F5C" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[15px] font-bold">{suggestion.title}</span>
                  <span className="text-[13px] text-muted">{suggestion.description}</span>
                </div>
              </div>
            </div>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2.5 bg-lilac-deep px-5 py-3 sm:px-[22px]">
              <div className="flex gap-2">
                <Pill>{SKILL_SHORT_VI[suggestion.skill]}</Pill>
                <Pill>~{suggestion.minutes} phút</Pill>
              </div>
              <form action={startActivity.bind(null, suggestion.skill, suggestion.topicId)}>
                <button className={btn.dark}>Bắt đầu ngay</button>
              </form>
            </div>
          </section>
        ) : null}

        {/* Skills */}
        <section className="flex flex-col gap-4 rounded-[22px] border border-line p-5 sm:p-[22px]">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-lg font-bold">Kỹ năng hiện tại</h2>
            <Link href="/progress" className={btn.link}>
              Xem tiến bộ
            </Link>
          </div>
          {latestScores ? (
            SKILLS.map((k) => {
              const v = latestScores[k];
              const l = level(v);
              return (
                <div key={k} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{SKILL_VI[k]}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-bold">{fmt(v)}</span>
                      <span className="rounded-full px-2.5 py-[3px] text-xs font-semibold" style={{ background: l.bg, color: l.fg }}>
                        {l.label}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-shell">
                    <div className="h-2 rounded-full" style={{ background: l.bar, width: `${v * 10}%` }} />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="m-0 text-sm text-muted">Hoàn thành buổi luyện đầu tiên để xem 5 kỹ năng của bạn.</p>
          )}
        </section>
      </div>

      {/* Recent sessions */}
      <div className="flex items-center justify-between px-5 pt-1 pb-3 sm:px-9">
        <h2 className="m-0 text-lg font-bold">Buổi luyện gần đây</h2>
        <Link href="/progress" className={btn.link}>
          Xem tất cả
        </Link>
      </div>
      <div className="stagger grid grid-cols-1 gap-3.5 px-5 pb-6 sm:grid-cols-2 sm:px-9 xl:grid-cols-3">
        {recent.length === 0 && <p className="m-0 text-sm text-muted">Chưa có buổi luyện nào.</p>}
        {recent.map((s) => {
          const c = topicColors(ALL, s.topic_id);
          const sc = finalScores(s);
          const topic = getTopic(ALL, s.topic_id);
          return (
            <Link
              key={s.id}
              href={`/feedback/${s.id}`}
              className="press flex flex-col overflow-hidden rounded-[18px] hover:-translate-y-1 hover:shadow-[0_10px_24px_-12px_rgba(22,21,26,0.25)] active:translate-y-0"
              style={{ background: c.bg }}
            >
              <div className="flex flex-col gap-2.5 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-10 items-center justify-center rounded-[10px] bg-white text-[13px] font-bold">#{s.seq}</span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{topic?.title}</span>
                    <span className="text-xs" style={{ color: c.ink }}>
                      {formatDateTime(s.completed_at ?? s.started_at)}
                    </span>
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 rounded-xl bg-white p-3">
                  <span className="text-[13px] font-semibold">{s.title}</span>
                  <span className="text-xs text-muted">
                    {s.kind === "activity" ? "Bài luyện cá nhân hoá" : `${findSubtopic(ALL, s.subtopic)?.sub.questions.length ?? s.questions.length} câu hỏi`}
                  </span>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5 px-3 py-2" style={{ background: c.foot }}>
                <Pill className="py-1">Điểm {fmt(sc?.total)}</Pill>
                <Pill className="py-1">{s.teacher_status === "approved" ? "Giáo viên đã duyệt" : "Đã có phản hồi"}</Pill>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Personalisation cycle */}
      <section className="mx-5 mb-8 flex flex-col gap-3.5 rounded-[22px] border border-line px-5 py-5 sm:mx-9 sm:px-[22px]">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-base font-bold">Chu trình cá nhân hoá việc luyện tập</h2>
          <span className="text-[13px] text-muted">Kết quả mỗi buổi được dùng để gợi ý buổi tiếp theo.</span>
        </div>
        <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
          {CYCLE.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-soft px-3.5 py-2 text-[13px] font-semibold">
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-brand text-[11px] text-white">{i + 1}</span>
                {label}
              </span>
              {i < CYCLE.length - 1 && (
                <span className="text-muted" aria-hidden="true">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  suffix,
  note,
  tone = "muted",
  small,
}: {
  label: string;
  value: string;
  suffix?: string;
  note: string;
  tone?: "good" | "bad" | "muted";
  small?: boolean;
}) {
  const color = tone === "good" ? "text-good font-semibold" : tone === "bad" ? "text-bad font-semibold" : "text-muted";
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-[18px] border border-line p-4 sm:p-[18px]">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={`font-bold ${small ? "text-[20px] leading-tight sm:text-[24px]" : "text-[24px] sm:text-[28px]"}`}>
        {value} {suffix && <span className="text-base font-medium text-muted">{suffix}</span>}
      </span>
      <span className={`text-xs ${color}`}>{note}</span>
    </div>
  );
}
