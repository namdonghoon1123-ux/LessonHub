import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BookingLite } from "@/lib/slots";

export type BookingStatus =
  | "PENDING"
  | "BOOKED"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELED";

export type BookingRow = {
  id: string;
  teacher_id: string;
  student_id: string;
  start_at: string;
  duration_min: number;
  status: BookingStatus;
  lesson_title_snapshot: string | null;
  teacher_comment: string | null;
  teacher_private_comment: string | null;
  student_comment: string | null;
  canceled_at: string | null;
  recurring_series_id: string | null;
  created_at: string;
};

// 슬롯 계산용: 특정 선생의 활성 예약(start_at, student_id, status)
export async function getActiveBookings(
  teacherId: string,
  fromISO: string,
  toISO: string,
): Promise<BookingLite[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("bookings")
    .select("start_at, student_id, status")
    .eq("teacher_id", teacherId)
    .in("status", ["PENDING", "BOOKED"])
    .gte("start_at", fromISO)
    .lt("start_at", toISO);
  return (data as BookingLite[]) ?? [];
}

export async function createBooking(input: {
  studentId: string;
  teacherId: string;
  startAtISO: string;
  durationMin: number;
  lessonTitle: string | null;
  recurringSeriesId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const db = createAdminClient();
  const { error } = await db.from("bookings").insert({
    teacher_id: input.teacherId,
    student_id: input.studentId,
    start_at: input.startAtISO,
    duration_min: input.durationMin,
    status: "BOOKED",
    lesson_title_snapshot: input.lessonTitle,
    recurring_series_id: input.recurringSeriesId ?? null,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "이미 예약된 시간입니다." };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function createRecurringSeries(input: {
  teacherId: string;
  studentId: string;
  weekday: number;
  startTime: string;
  durationMin: number;
  lessonTitle: string | null;
  requestedCount: number;
}): Promise<string | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("recurring_series")
    .insert({
      teacher_id: input.teacherId,
      student_id: input.studentId,
      weekday: input.weekday,
      start_time: input.startTime,
      duration_min: input.durationMin,
      lesson_title: input.lessonTitle,
      requested_count: input.requestedCount,
    })
    .select("id")
    .single();
  if (error) return null;
  return data.id as string;
}

export async function setSeriesCreatedCount(id: string, count: number) {
  const db = createAdminClient();
  await db.from("recurring_series").update({ created_count: count }).eq("id", id);
}

// 시리즈의 미래 예약(BOOKED/PENDING) 일괄 취소. 본인 소유만.
export async function cancelSeriesFuture(
  seriesId: string,
  studentId: string,
): Promise<number> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("bookings")
    .update({ status: "CANCELED", canceled_by: studentId, canceled_at: new Date().toISOString() })
    .eq("recurring_series_id", seriesId)
    .eq("student_id", studentId)
    .in("status", ["BOOKED", "PENDING"])
    .gte("start_at", new Date().toISOString())
    .select("id");
  if (error) throw new Error(error.message);
  await db
    .from("recurring_series")
    .update({ canceled_at: new Date().toISOString() })
    .eq("id", seriesId);
  return (data ?? []).length;
}

export async function getStudentBookings(
  studentId: string,
): Promise<(BookingRow & { teacher_name: string })[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("bookings")
    .select("*")
    .eq("student_id", studentId)
    .order("start_at", { ascending: true });
  const rows = (data as BookingRow[]) ?? [];
  const teacherIds = [...new Set(rows.map((r) => r.teacher_id))];
  const names = await namesByIds(teacherIds);
  return rows.map((r) => ({ ...r, teacher_name: names.get(r.teacher_id) ?? "선생님" }));
}

export async function getTeacherBookings(
  teacherId: string,
): Promise<(BookingRow & { student_name: string })[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("bookings")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("start_at", { ascending: false });
  const rows = (data as BookingRow[]) ?? [];
  const studentIds = [...new Set(rows.map((r) => r.student_id))];
  const names = await namesByIds(studentIds);
  return rows.map((r) => ({ ...r, student_name: names.get(r.student_id) ?? "학생" }));
}

async function namesByIds(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const db = createAdminClient();
  const { data } = await db.from("profiles").select("id, name").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p.name]));
}

// 단건 조회 (소유권 확인용)
export async function getBooking(id: string): Promise<BookingRow | null> {
  const db = createAdminClient();
  const { data } = await db.from("bookings").select("*").eq("id", id).single();
  return (data as BookingRow) ?? null;
}

// 레슨 코멘트 저장: 학생 전달 메시지 + 선생님 개인 메모
export async function updateBookingComments(
  id: string,
  studentMessage: string,
  privateMemo: string,
) {
  const db = createAdminClient();
  const msg = studentMessage.trim();
  const { error } = await db
    .from("bookings")
    .update({
      teacher_comment: msg || null,
      teacher_private_comment: privateMemo.trim() || null,
      comment_delivered_at: msg ? new Date().toISOString() : null,
      comment_seen_at: null, // 새로 전달 시 다시 '미확인'
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export type FeedbackRow = {
  id: string;
  start_at: string;
  teacher_comment: string;
  comment_delivered_at: string | null;
  comment_seen_at: string | null;
  lesson_title_snapshot: string | null;
  teacher_name: string;
};

export async function getStudentFeedback(
  studentId: string,
): Promise<FeedbackRow[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("bookings")
    .select(
      "id, start_at, teacher_comment, comment_delivered_at, comment_seen_at, lesson_title_snapshot, teacher_id",
    )
    .eq("student_id", studentId)
    .not("teacher_comment", "is", null)
    .order("start_at", { ascending: false });
  const rows = data ?? [];
  const names = await namesByIds([...new Set(rows.map((r) => r.teacher_id))]);
  return rows.map((r) => ({
    id: r.id,
    start_at: r.start_at,
    teacher_comment: r.teacher_comment as string,
    comment_delivered_at: r.comment_delivered_at,
    comment_seen_at: r.comment_seen_at,
    lesson_title_snapshot: r.lesson_title_snapshot,
    teacher_name: names.get(r.teacher_id) ?? "선생님",
  }));
}

export async function countUnseenFeedback(studentId: string): Promise<number> {
  const db = createAdminClient();
  const { count } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .not("comment_delivered_at", "is", null)
    .is("comment_seen_at", null);
  return count ?? 0;
}

export async function markFeedbackSeen(studentId: string) {
  const db = createAdminClient();
  await db
    .from("bookings")
    .update({ comment_seen_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .not("comment_delivered_at", "is", null)
    .is("comment_seen_at", null);
}

export async function setBookingStatus(
  id: string,
  status: BookingStatus,
  extra: Partial<{
    canceled_by: string;
    canceled_at: string;
    cancel_reason: string;
    completed_at: string;
    no_show_at: string;
    teacher_comment: string;
  }> = {},
) {
  const db = createAdminClient();
  const { error } = await db
    .from("bookings")
    .update({ status, ...extra })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
