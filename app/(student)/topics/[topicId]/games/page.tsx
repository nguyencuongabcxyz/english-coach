import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Breadcrumb, PageHeader } from "@/components/ui";
import { getTopics, ownerIdFor } from "@/lib/topics-db";
import { GamesClient } from "./GamesClient";

export const metadata = { title: "Trò chơi từ vựng · AI English Speaking Coach" };

/** Vocabulary games for one topic, using the words of all its subtopics. */
export default async function TopicGamesPage({ params }: PageProps<"/topics/[topicId]/games">) {
  const { topicId } = await params;
  const user = await requireUser("student");
  const topic = (await getTopics(await ownerIdFor(user))).find((t) => t.id === topicId);
  if (!topic) notFound();

  // Same word in two subtopics (or typed with different case) counts once.
  const seen = new Set<string>();
  const words: string[] = [];
  for (const s of topic.subtopics) {
    for (const raw of s.vocab) {
      const w = raw.trim();
      const k = w.toLowerCase();
      if (w && !seen.has(k)) {
        seen.add(k);
        words.push(w);
      }
    }
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Chủ đề luyện nói", href: "/topics" },
          { label: topic.title, href: "/topics" },
          { label: "Trò chơi từ vựng" },
        ]}
      />
      <PageHeader
        title={<>🎮 Trò chơi từ vựng</>}
        subtitle={`Chủ đề ${topic.title} (${topic.vi}). Nói to các từ để ghi điểm. Nhận diện giọng nói chạy ngay trên trình duyệt.`}
      />
      <GamesClient words={words} recordPrefix={`ec-game:${user.id}:${topic.id}`} />
    </>
  );
}
