import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createPaymentNotices(
  studentId: string,
  teacherIds: string[],
  message: string,
) {
  if (teacherIds.length === 0) return;
  const db = createAdminClient();
  await db.from("notifications").insert(
    teacherIds.map((tid) => ({
      teacher_id: tid,
      student_id: studentId,
      kind: "PAYMENT",
      message: message || null,
    })),
  );
}

export type NotificationRow = {
  id: string;
  message: string | null;
  created_at: string;
  student_name: string;
};

export async function getUnreadNotifications(
  teacherId: string,
): Promise<NotificationRow[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("notifications")
    .select("id, message, created_at, student_id")
    .eq("teacher_id", teacherId)
    .is("read_at", null)
    .order("created_at", { ascending: false });
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.student_id).filter(Boolean))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: profs } = await db
      .from("profiles")
      .select("id, name")
      .in("id", ids as string[]);
    for (const p of profs ?? []) names.set(p.id, p.name);
  }
  return rows.map((r) => ({
    id: r.id,
    message: r.message,
    created_at: r.created_at,
    student_name: r.student_id ? (names.get(r.student_id) ?? "학생") : "학생",
  }));
}

export async function markNotificationRead(id: string, teacherId: string) {
  const db = createAdminClient();
  await db
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("teacher_id", teacherId);
}
