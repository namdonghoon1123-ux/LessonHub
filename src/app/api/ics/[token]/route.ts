import { createAdminClient } from "@/lib/supabase/admin";

// 캘린더 구독용 ICS 피드 (토큰으로 보호, 쿠키 인증 없음)
function toICSDate(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const db = createAdminClient();

  const { data: tp } = await db
    .from("teacher_profiles")
    .select("teacher_id, display_name")
    .eq("ics_token", token)
    .maybeSingle();
  if (!tp) return new Response("Not found", { status: 404 });

  const { data: bookings } = await db
    .from("bookings")
    .select("id, start_at, duration_min, student_id, lesson_title_snapshot, status")
    .eq("teacher_id", tp.teacher_id)
    .in("status", ["PENDING", "BOOKED", "COMPLETED"])
    .order("start_at");
  const rows = bookings ?? [];

  const ids = [...new Set(rows.map((r) => r.student_id))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await db.from("profiles").select("id, name").in("id", ids);
    for (const p of profs ?? []) names.set(p.id, p.name);
  }

  const now = toICSDate(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LessonHub//KO",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:LessonHub 레슨",
    "X-WR-TIMEZONE:Asia/Seoul",
  ];
  for (const b of rows) {
    const end = new Date(
      new Date(b.start_at).getTime() + b.duration_min * 60000,
    ).toISOString();
    const who = names.get(b.student_id) ?? "학생";
    const mark = b.status === "PENDING" ? "[대기] " : "";
    const title = `${mark}${who} 레슨${b.lesson_title_snapshot ? ` (${b.lesson_title_snapshot})` : ""}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.id}@lessonhub`,
      `DTSTAMP:${now}`,
      `DTSTART:${toICSDate(b.start_at)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:${title}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="lessonhub.ics"',
      "Cache-Control": "no-cache",
    },
  });
}
