import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

/** Shared shell: the sidebar stays mounted while only the page content changes. */
export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("teacher");
  return <AppShell user={user}>{children}</AppShell>;
}
