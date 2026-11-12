import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { inProgressSession, studentProfile } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { Breadcrumb, btn, PageHeader, Pill } from "@/components/ui";
import { Icon, ICON } from "@/components/icons";
import { findSubtopic, getTopic, TOPICS } from "@/lib/topics";
import { activityFor, SKILL_SHORT_VI, SKILL_VI } from "@/lib/skills";
import { startActivity, startTopic } from "@/app/actions/practice";

export const metadata = { title: "Luyện nói với AI · AI English Speaking Coach" };

export default async function PracticeIndex() {
  const user = await requireUser("student");
  const open = await inProgressSession(user.id);
  if (open) redirect(`/practice/${open.id}`);
  const profile = await studentProfile(user.id);
  const latest = profile.latest;
  const topic = getTopic(latest?.topic_id ?? "family") ?? TOPICS[0];
  const suggestion =
    latest?.summary?.nextActivity ?? (profile.weakest ? activityFor(profile.weakest, topic.id, topic.title) : null);
  const untried = TOPICS.flatMap((t) => t.subtopics.map((s) => ({ t, s }))).filter(
    ({ s }) => !profile.sessions.some((x) => x.subtopic === s.id),
  );
  const fresh = untried[0] ?? { t: topic, s: topic.subtopics[0] };
  const again = latest ? findSubtopic(latest.subtopic) : null;

  return (
    <AppShell user={user} active="practice">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/dashboard" }, { label: "Luyện nói với AI" }]} />
      <PageHeader title="Luyện nói với AI" subtitle="Chọn một bài luyện để bắt đầu. AI sẽ hỏi, bạn trả lời bằng giọng nói." />
      <div className="grid grid-cols-1 gap-4 px-5 pt-6 pb-8 sm:px-9 md:grid-cols-3">
        {suggestion && (
          <Card
            bg="#CDD0F8"
            foot="#B9BDEF"
            tag="Gợi ý cho bạn"
            title={suggestion.title}
            text={`${SKILL_VI[suggestion.skill]} là kỹ năng bạn cần luyện thêm. ${suggestion.description}`}
            chips={[SKILL_SHORT_VI[suggestion.skill], `~${suggestion.minutes} phút`]}
            action={startActivity.bind(null, suggestion.skill, suggestion.topicId)}
          />
        )}
        <Card
          bg="#C8F2DD"
          foot="#A9E3C6"
          tag="Chủ đề mới"
          title={fresh.s.name}
          text={`${fresh.t.title} · ${fresh.s.questions.length} câu hỏi về chủ đề bạn chưa luyện.`}
          chips={[fresh.t.title, `~${fresh.s.questions.length} phút`]}
          action={startTopic.bind(null, fresh.s.id)}
        />
        {again && (
          <Card
            bg="#FBE5BC"
            foot="#EFD39F"
            tag="Luyện lại"
            title={again.sub.name}
            text="Trả lời lại chủ đề buổi gần nhất để so sánh kết quả."
            chips={[again.topic.title, `Buổi #${latest!.seq}`]}
            action={startTopic.bind(null, again.sub.id)}
          />
        )}
      </div>
      <div className="px-5 pb-10 sm:px-9">
        <Link href="/topics" className={btn.light}>
          <Icon d={ICON.topics} size={16} /> Xem tất cả chủ đề
        </Link>
      </div>
    </AppShell>
  );
}

function Card(p: { bg: string; foot: string; tag: string; title: string; text: string; chips: string[]; action: () => Promise<void> }) {
  return (
    <section className="flex flex-col overflow-hidden rounded-[22px]" style={{ background: p.bg }}>
      <div className="flex flex-col gap-3 p-5">
        <Pill className="self-start font-bold">{p.tag}</Pill>
        <h2 className="m-0 text-lg font-bold">{p.title}</h2>
        <p className="m-0 rounded-2xl bg-white p-3.5 text-[13px] leading-normal text-muted">{p.text}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 px-5 py-3" style={{ background: p.foot }}>
        <div className="flex flex-wrap gap-1.5">
          {p.chips.map((c) => (
            <Pill key={c}>{c}</Pill>
          ))}
        </div>
        <form action={p.action}>
          <button className={btn.dark}>Bắt đầu</button>
        </form>
      </div>
    </section>
  );
}
