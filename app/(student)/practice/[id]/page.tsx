import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAnswers, getSession } from "@/lib/data";
import { Breadcrumb } from "@/components/ui";
import { getTopic } from "@/lib/topics";
import { SKILL_VI } from "@/lib/skills";
import { aiEnabled } from "@/lib/ai";
import { PracticeClient } from "./PracticeClient";

export const metadata = { title: "Luyện nói với AI · AI English Speaking Coach" };
export const maxDuration = 60;

export default async function PracticePage({ params }: PageProps<"/practice/[id]">) {
  const { id } = await params;
  const user = await requireUser("student");
  const session = await getSession(id);
  if (!session || session.student_id !== user.id) notFound();
  if (session.status === "completed") redirect(`/feedback/${session.id}`);
  const answers = await getAnswers(session.id);
  const topic = getTopic(session.topic_id);
  const focus = session.focus_skill ? SKILL_VI[session.focus_skill] : null;

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Chủ đề luyện nói", href: "/topics" },
          { label: topic?.title ?? "", href: "/topics" },
          { label: session.title },
        ]}
      />
      <PracticeClient
        session={{
          id: session.id,
          title: session.title,
          kind: session.kind,
          instruction: session.instruction,
          questions: session.questions,
          tips: session.tips,
          vocab: session.vocab,
          focus,
        }}
        initialAnswers={answers.map((a) => ({
          id: a.id,
          idx: a.idx,
          transcript: a.transcript,
          durationSec: a.duration_sec,
          hasAudio: Boolean(a.audio_url),
          evaluation: a.evaluation,
        }))}
        initials={user.name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase()}
        demo={!aiEnabled()}
      />
    </>
  );
}
