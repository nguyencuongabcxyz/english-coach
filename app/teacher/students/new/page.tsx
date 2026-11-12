import { requireUser } from "@/lib/auth";
import { getClass, suggestStudentCode } from "@/lib/data";
import { AppShell } from "@/components/AppShell";
import { Breadcrumb, PageHeader } from "@/components/ui";
import { AddStudentForm } from "./AddStudentForm";

export const metadata = { title: "Thêm học sinh · AI English Speaking Coach" };

export default async function NewStudentPage() {
  const user = await requireUser("teacher");
  const cls = await getClass(user.class_id!);
  const suggested = cls ? await suggestStudentCode(cls.id, cls.name) : "";

  return (
    <AppShell user={user} active="teacher">
      <Breadcrumb items={[{ label: "Tổng quan lớp", href: "/teacher" }, { label: "Thêm học sinh" }]} />
      <PageHeader
        title="Thêm học sinh"
        subtitle={`Tạo tài khoản cho học sinh lớp ${cls?.name ?? ""}. Học sinh dùng mã học sinh và mã kích hoạt để tự đặt mật khẩu.`}
      />
      <div className="px-5 pt-6 pb-10 sm:px-9">
        <AddStudentForm suggestedCode={suggested} className={cls?.name ?? ""} />
      </div>
    </AppShell>
  );
}
