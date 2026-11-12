import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { latestCompleted } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { Breadcrumb, btn, EmptyState, PageHeader } from "@/components/ui";

export default async function FeedbackIndex() {
  const user = await requireUser("student");
  const latest = await latestCompleted(user.id);
  if (latest) redirect(`/feedback/${latest.id}`);
  return (
    <AppShell user={user} active="feedback">
      <Breadcrumb items={[{ label: "Trang chủ", href: "/dashboard" }, { label: "Phản hồi từ AI" }]} />
      <PageHeader title="Phản hồi từ AI" subtitle="Phản hồi sẽ xuất hiện ở đây sau mỗi buổi luyện." />
      <EmptyState
        title="Chưa có phản hồi nào"
        text="Hoàn thành một buổi luyện nói để nhận phản hồi theo 5 tiêu chí và bài luyện tiếp theo dành riêng cho bạn."
        action={
          <Link href="/topics" className={btn.dark}>
            Chọn chủ đề luyện nói
          </Link>
        }
      />
    </AppShell>
  );
}
