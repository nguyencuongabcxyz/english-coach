import { logout } from "@/app/actions/auth";
import { Icon, ICON } from "./icons";
import { MobileNav } from "./MobileNav";
import { SidebarLinks } from "./NavLinks";
import { STUDENT_NAV, TEACHER_NAV, type NavKey } from "@/lib/nav";
import type { UserRow } from "@/lib/types";
import { one } from "@/lib/db";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const last = parts.at(-1) ?? "";
  const prev = parts.length > 1 ? parts.at(-2)! : "";
  return ((prev[0] ?? "") + (last[0] ?? "")).toUpperCase() || "?";
}

type Props = {
  user: UserRow;
  children: React.ReactNode;
};

async function shellData(user: UserRow) {
  const badges: Partial<Record<NavKey, string>> = {};
  const cls = user.class_id
    ? await one<{ name: string }>(`SELECT name FROM classes WHERE id = $1`, [user.class_id])
    : null;
  if (user.role === "teacher") {
    const r = await one<{ n: number }>(
      `SELECT count(*)::int AS n FROM practice_sessions p JOIN users u ON u.id = p.student_id
       WHERE u.class_id = $1 AND p.status = 'completed' AND p.teacher_status = 'pending'`,
      [user.class_id],
    );
    if (r && Number(r.n) > 0) badges.review = String(r.n);
  } else {
    const r = await one<{ n: number }>(
      `SELECT count(*)::int AS n FROM practice_sessions
       WHERE student_id = $1 AND status = 'completed' AND completed_at > now() - interval '1 day'`,
      [user.id],
    );
    if (r && Number(r.n) > 0) badges.feedback = "Mới";
  }
  return { badges, className: cls?.name ?? "" };
}

export async function AppShell({ user, children }: Props) {
  const { badges, className } = await shellData(user);
  const isTeacher = user.role === "teacher";
  const items = (isTeacher ? TEACHER_NAV : STUDENT_NAV).map((i) => ({ ...i, badge: badges[i.key] }));
  const role = isTeacher ? "Giáo viên Tiếng Anh" : `Học sinh · Lớp ${className}`;
  const aiNote = isTeacher
    ? "Điểm AI chỉ để tham khảo. Thầy cô xác nhận hoặc điều chỉnh trước khi ghi nhận."
    : "Điểm AI là phản hồi tham khảo. Giáo viên là người đánh giá cuối cùng.";
  const avatarBg = isTeacher ? "#FBE5BC" : "#CDD0F8";

  return (
    <div className="min-h-dvh bg-canvas p-0 sm:p-3 lg:bg-shell lg:p-0">
      <div className="mx-auto flex min-h-dvh max-w-[1440px] gap-3 bg-shell p-2 sm:min-h-[calc(100dvh-24px)] sm:rounded-[28px] sm:p-3 lg:min-h-dvh lg:max-w-none lg:rounded-none lg:py-3 lg:pr-3 lg:pl-0">
        {/* Desktop sidebar */}
        <aside className="hidden w-[260px] shrink-0 lg:-my-3 lg:block">
          <nav
            aria-label="Menu chính"
            className="sticky top-0 flex h-dvh flex-col gap-5 overflow-y-auto px-4 pt-8 pb-6"
          >
            <Brand portal={isTeacher ? "Cổng giáo viên" : "Cổng học sinh"} />
            <div className="flex flex-col gap-1">
              <span className="px-3 pb-1.5 text-xs text-muted">Menu chính</span>
              <SidebarLinks items={items} />
            </div>
            <div className="mt-auto flex flex-col gap-3">
              <div className="flex flex-col gap-1.5 rounded-[18px] bg-white p-3.5">
                <span className="text-xs font-bold">AI hỗ trợ, giáo viên quyết định</span>
                <span className="text-xs leading-normal text-muted">{aiNote}</span>
              </div>
              <span className="px-3 text-xs text-muted">Tài khoản</span>
              <div className="flex items-center gap-3 px-2">
                <div
                  className="flex size-[42px] shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: avatarBg }}
                >
                  {initials(user.name)}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm leading-tight font-bold">{user.name}</span>
                  <span className="text-xs text-muted">{role}</span>
                </div>
                <form action={logout}>
                  <button
                    aria-label="Đăng xuất"
                    title="Đăng xuất"
                    className="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-white"
                  >
                    <Icon d={ICON.logout} />
                  </button>
                </form>
              </div>
            </div>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNav
            items={items}
            portal={isTeacher ? "Cổng giáo viên" : "Cổng học sinh"}
            userName={user.name}
            userRole={role}
            initials={initials(user.name)}
            avatarBg={avatarBg}
            aiNote={aiNote}
            logoutAction={logout}
          />
          <main className="flex min-w-0 flex-1 flex-col rounded-[22px] bg-white pb-20 lg:pb-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function Brand({ portal }: { portal: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="flex size-10 items-center justify-center rounded-xl bg-ink">
        <Icon d={ICON.logo} size={20} stroke="#fff" width={2.2} />
      </div>
      <div className="flex flex-col">
        <span className="text-[15px] font-extrabold tracking-[-0.2px]">Speaking Coach</span>
        <span className="text-[11px] text-muted">{portal}</span>
      </div>
    </div>
  );
}
