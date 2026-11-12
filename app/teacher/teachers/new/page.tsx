import { requireAdmin } from "@/lib/auth";
import { Breadcrumb, PageHeader } from "@/components/ui";
import { AddTeacherForm } from "./AddTeacherForm";

export const metadata = { title: "Thêm giáo viên · AI English Speaking Coach" };

export default async function NewTeacherPage() {
  await requireAdmin();
  return (
    <>
      <Breadcrumb items={[{ label: "Giáo viên", href: "/teacher/teachers" }, { label: "Thêm giáo viên" }]} />
      <PageHeader
        title="Thêm giáo viên"
        subtitle="Tạo tài khoản và lớp phụ trách. Giáo viên dùng email và mã kích hoạt để tự đặt mật khẩu."
      />
      <div className="px-5 pt-6 pb-10 sm:px-9">
        <AddTeacherForm />
      </div>
    </>
  );
}
