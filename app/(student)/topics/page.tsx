import { requireUser } from "@/lib/auth";
import { listCompletedSessions } from "@/lib/data";
import { Breadcrumb, PageHeader } from "@/components/ui";
import { getTopics, ownerIdFor } from "@/lib/topics-db";
import { TopicsBrowser } from "./TopicsBrowser";

export const metadata = { title: "Chủ đề luyện nói · AI English Speaking Coach" };

export default async function TopicsPage() {
  const user = await requireUser("student");
  const [sessions, TOPICS] = await Promise.all([listCompletedSessions(user.id), getTopics(await ownerIdFor(user))]);
  const counts: Record<string, number> = {};
  for (const s of sessions) counts[s.topic_id] = (counts[s.topic_id] ?? 0) + 1;

  return (
    <>
      <Breadcrumb items={[{ label: user.name.split(" ").slice(-2).join(" "), href: "/dashboard" }, { label: "Chủ đề luyện nói" }]} />
      <PageHeader
        title="Chủ đề luyện nói"
        subtitle="Chọn một chủ đề theo chương trình THPT. AI sẽ đặt câu hỏi và đưa ra tình huống giao tiếp thực tế."
      />
      <TopicsBrowser
        topics={TOPICS.map((t) => ({
          id: t.id,
          n: t.n,
          title: t.title,
          vi: t.vi,
          bg: t.bg,
          foot: t.foot,
          ink: t.ink,
          sessions: counts[t.id] ?? 0,
          subs: t.subtopics.map((s) => ({ id: s.id, name: s.name, count: s.questions.length })),
        }))}
      />
    </>
  );
}
