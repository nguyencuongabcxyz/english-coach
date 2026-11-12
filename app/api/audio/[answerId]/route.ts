import { getUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { readAudio } from "@/lib/storage";

export async function GET(_req: Request, ctx: RouteContext<"/api/audio/[answerId]">) {
  const { answerId } = await ctx.params;
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const row = await one<{ audio_url: string | null; student_id: string; class_id: string | null }>(
    `SELECT a.audio_url, p.student_id, u.class_id FROM answers a
     JOIN practice_sessions p ON p.id = a.session_id JOIN users u ON u.id = p.student_id
     WHERE a.id = $1`,
    [answerId],
  );
  if (!row?.audio_url) return new Response("Not found", { status: 404 });
  const allowed =
    (user.role === "student" && row.student_id === user.id) ||
    (user.role === "teacher" && row.class_id === user.class_id);
  if (!allowed) return new Response("Forbidden", { status: 403 });
  const audio = await readAudio(row.audio_url);
  if (!audio) return new Response("Not found", { status: 404 });
  return new Response(audio.body, {
    headers: { "Content-Type": audio.type, "Cache-Control": "private, max-age=3600" },
  });
}
