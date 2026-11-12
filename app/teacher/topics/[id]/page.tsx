import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAllTopics } from "@/lib/topics-db";
import { getTopic } from "@/lib/topics";
import { Breadcrumb, PageHeader } from "@/components/ui";
import { TopicEditor } from "../TopicEditor";

export const metadata = { title: "Sửa chủ đề · AI English Speaking Coach" };

export default async function EditTopicPage({ params }: PageProps<"/teacher/topics/[id]">) {
  const { id } = await params;
  const user = await requireUser("teacher");
  const topic = getTopic(await getAllTopics(user.id), id);
  if (!topic) notFound();
  return (
    <>
      <Breadcrumb items={[{ label: "Chủ đề luyện nói", href: "/teacher/topics" }, { label: topic.title }]} />
      <PageHeader
        title={`Sửa chủ đề: ${topic.title}`}
        subtitle="Sửa tên, màu, tiểu chủ đề, câu hỏi, mẹo trả lời và từ vựng."
      />
      <TopicEditor topic={topic} />
    </>
  );
}
