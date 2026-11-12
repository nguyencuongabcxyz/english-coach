import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { initials } from "@/components/AppShell";
import { Breadcrumb, btn, formatDateTime, PageHeader } from "@/components/ui";
import { Icon, ICON } from "@/components/icons";
import { reissueTeacherCode } from "@/app/actions/admin";

export const metadata = { title: "Giáo viên · AI English Speaking Coach" };

type Row = {
  id: string;
  name: string;
  login: string;
  is_admin: boolean;
  activated: boolean;
  activation_code: string | null;
  reset_requested_at: string | null;
  last_active_at: string | null;
  class_name: string | null;
  students: number;
  topics: number;
};

export default async function TeachersPage() {
  const me = await requireAdmin();
  const rows = await sql<Row>(
    `SELECT u.id, u.name, u.login, u.is_admin, u.activated, u.activation_code, u.reset_requested_at, u.last_active_at,
            c.name AS class_name,
            (SELECT count(*)::int FROM users s WHERE s.role = 'student' AND s.class_id = u.class_id) AS students,
            (SELECT count(*)::int FROM topics t WHERE t.owner_id = u.id) AS topics
     FROM users u LEFT JOIN classes c ON c.id = u.class_id
     WHERE u.role = 'teacher'
     ORDER BY u.is_admin DESC, u.name ASC`,
  );

  return (
    <>
      <Breadcrumb items={[{ label: "Tổng quan lớp", href: "/teacher" }, { label: "Giáo viên" }]} />
      <PageHeader
        title="Giáo viên"
        subtitle="Chỉ quản trị viên thấy trang này. Mỗi giáo viên quản lý lớp, học sinh và bộ bài học riêng của mình."
        actions={
          <Link href="/teacher/teachers/new" className={btn.dark}>
            <Icon d={ICON.plus} size={16} width={2} /> Thêm giáo viên
          </Link>
        }
      />
      <section className="mx-5 my-6 overflow-hidden rounded-[22px] border border-line sm:mx-9">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="bg-soft text-left">
                {["Giáo viên", "Lớp", "Học sinh", "Chủ đề", "Trạng thái", "Hoạt động gần nhất", ""].map((h, i) => (
                  <th key={i} scope="col" className={`py-3 text-xs font-semibold text-muted ${i === 0 ? "px-5" : "px-3"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t border-line">
                  <th scope="row" className="px-5 py-3 text-left font-normal">
                    <span className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sand text-[11px] font-bold">
                        {initials(t.name)}
                      </span>
                      <span className="flex flex-col">
                        <span className="font-semibold">
                          {t.name}
                          {t.id === me.id && <span className="font-normal text-muted"> (bạn)</span>}
                        </span>
                        <span className="text-xs text-muted">{t.login}</span>
                      </span>
                    </span>
                  </th>
                  <td className="px-3 py-3 font-semibold">{t.class_name ?? "–"}</td>
                  <td className="px-3 py-3">{t.students}</td>
                  <td className="px-3 py-3">{t.topics}</td>
                  <td className="px-3 py-3">
                    <span className="flex flex-wrap gap-1.5">
                      {t.is_admin && <span className="rounded-full bg-lilac px-2.5 py-1 text-xs font-semibold text-lilac-ink">Quản trị</span>}
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          t.activated ? "bg-good-bg text-good" : "bg-chip text-muted"
                        }`}
                      >
                        {t.activated ? "Đã kích hoạt" : "Chưa kích hoạt"}
                      </span>
                    </span>
                    {t.activation_code && (
                      <span className="mt-1 block text-[11px] text-muted">
                        {t.activated ? "Mã đặt lại" : "Mã kích hoạt"}:{" "}
                        <strong className="font-mono text-ink">{t.activation_code}</strong>
                      </span>
                    )}
                    {t.reset_requested_at && (
                      <span className="mt-1 block text-[11px] font-semibold text-bad">Yêu cầu đặt lại mật khẩu</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted">{t.last_active_at ? formatDateTime(t.last_active_at) : "–"}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    {t.id !== me.id && (
                      <form action={reissueTeacherCode.bind(null, t.id)}>
                        <button className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-line-strong px-3.5 text-xs font-semibold hover:bg-soft">
                          {t.activated ? "Cấp mã đặt lại" : "Cấp mã mới"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mx-5 mb-8 text-xs leading-normal text-muted sm:mx-9">
        Giáo viên mới vào trang <strong>Kích hoạt tài khoản</strong>, nhập email và mã kích hoạt để tự đặt mật khẩu. Mỗi giáo
        viên mới nhận một bản riêng của bộ bài học mặc định và có thể chỉnh sửa mà không ảnh hưởng giáo viên khác.
      </p>
    </>
  );
}
