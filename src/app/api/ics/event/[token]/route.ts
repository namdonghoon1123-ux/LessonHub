import { createAdminClient } from "@/lib/supabase/admin";

// 단일 레슨 .ics (학생이 '내 캘린더에 추가'용). 아이폰/구글/아웃룩 모두 호환.
function d(iso: string) {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const db = createAdminClient();
  const { data: b } = await db
    .from("bookings")
    .select("id, start_at, duration_min, teacher_id, lesson_title_snapshot")
    .eq("share_token", token)
    .maybeSingle();
  if (!b) return new Response("Not found", { status: 404 });

  const { data: tp } = await db
    .from("profiles")
    .select("name")
    .eq("id", b.teacher_id)
    .maybeSingle();
  const title = `${tp?.name ?? "선생님"} 레슨${b.lesson_title_snapshot ? ` (${b.lesson_title_snapshot})` : ""}`;
  const end = new Date(
    new Date(b.start_at).getTime() + b.duration_min * 60000,
  ).toISOString();

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LessonHub//KO",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${b.id}@lessonhub`,
    `DTSTAMP:${d(new Date().toISOString())}`,
    `DTSTART:${d(b.start_at)}`,
    `DTEND:${d(end)}`,
    `SUMMARY:${title}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="lesson.ics"',
    },
  });
}
