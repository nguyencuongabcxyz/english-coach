import { requireUser } from "@/lib/auth";
import { Breadcrumb, PageHeader } from "@/components/ui";
import { TopicEditor } from "../TopicEditor";

export const metadata = { title: "Thêm chủ đề · AI English Speaking Coach" };

export default async function NewTopicPage() {
  await requireUser("teacher");
  return (
    <>
      <Breadcrumb items={[{ label: "Chủ đề luyện nói", href: "/teacher/topics" }, { label: "Thêm chủ đề" }]} />
      <PageHeader
        title="Thêm chủ đề"
        subtitle="Đặt tên chủ đề, thêm các tiểu chủ đề và câu hỏi. Bấm “Gợi ý bằng AI” để có sẵn câu hỏi, mẹo và từ vựng."
      />
      <TopicEditor />
    </>
  );
}
