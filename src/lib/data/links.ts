import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type LinkedTeacher = {
  teacher_id: string;
  name: string;
  subject: string | null;
  lesson_duration_min: number;
  booking_window_days: number;
  teacher_cancel_cutoff_hours: number;
  student_cancel_day_before_hour: number | null;
  cancel_notice: string | null;
};

// 학생의 ACTIVE 연결 선생님 목록 (+ teacher_profile)
export async function getStudentTeachers(
  studentId: string,
): Promise<LinkedTeacher[]> {
  const db = createAdminClient();
  const { data: links } = await db
    .from("links")
    .select("teacher_id")
    .eq("student_id", studentId)
    .eq("status", "ACTIVE");
  const ids = (links ?? []).map((l) => l.teacher_id);
  if (ids.length === 0) return [];

  const { data: profs } = await db
    .from("profiles")
    .select("id, name")
    .in("id", ids);
  const { data: tps } = await db
    .from("teacher_profiles")
    .select(
      "teacher_id, subject, lesson_duration_min, booking_window_days, teacher_cancel_cutoff_hours, student_cancel_day_before_hour, cancel_notice",
    )
    .in("teacher_id", ids);

  const nameById = new Map((profs ?? []).map((p) => [p.id, p.name]));
  return (tps ?? []).map((tp) => ({
    teacher_id: tp.teacher_id,
    name: nameById.get(tp.teacher_id) ?? "선생님",
    subject: tp.subject,
    lesson_duration_min: tp.lesson_duration_min,
    booking_window_days: tp.booking_window_days,
    teacher_cancel_cutoff_hours: tp.teacher_cancel_cutoff_hours,
    student_cancel_day_before_hour: tp.student_cancel_day_before_hour,
    cancel_notice: tp.cancel_notice,
  }));
}

export type LinkedStudent = {
  link_id: string;
  student_id: string;
  name: string;
  status: "PENDING" | "ACTIVE";
  teacher_memo: string | null;
  remaining_lessons: number | null;
};

export type StudentLink = {
  id: string;
  teacher_id: string;
  name: string;
  subject: string | null;
  status: "PENDING" | "ACTIVE";
};

// 학생의 모든 연결(상태 무관) + 선생 정보
export async function getStudentLinks(
  studentId: string,
): Promise<StudentLink[]> {
  const db = createAdminClient();
  const { data: links } = await db
    .from("links")
    .select("id, teacher_id, status")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  const rows = links ?? [];
  if (rows.length === 0) return [];
  const ids = rows.map((l) => l.teacher_id);
  const { data: profs } = await db.from("profiles").select("id, name").in("id", ids);
  const { data: tps } = await db
    .from("teacher_profiles")
    .select("teacher_id, subject")
    .in("teacher_id", ids);
  const nm = new Map((profs ?? []).map((p) => [p.id, p.name]));
  const sub = new Map((tps ?? []).map((t) => [t.teacher_id, t.subject]));
  return rows.map((l) => ({
    id: l.id,
    teacher_id: l.teacher_id,
    name: nm.get(l.teacher_id) ?? "선생님",
    subject: sub.get(l.teacher_id) ?? null,
    status: l.status as "PENDING" | "ACTIVE",
  }));
}

// 연결 가능한 활성 선생님 목록 (slug 유무와 무관하게 전체 노출)
export async function getAvailableTeachers(): Promise<
  { teacher_id: string; name: string; subject: string | null }[]
> {
  const db = createAdminClient();
  const { data: profs } = await db
    .from("profiles")
    .select("id, name")
    .eq("role", "TEACHER")
    .eq("is_active", true);
  const ids = (profs ?? []).map((p) => p.id);
  if (ids.length === 0) return [];
  const { data: tps } = await db
    .from("teacher_profiles")
    .select("teacher_id, subject")
    .in("teacher_id", ids);
  const sub = new Map((tps ?? []).map((t) => [t.teacher_id, t.subject]));
  return (profs ?? []).map((p) => ({
    teacher_id: p.id,
    name: p.name,
    subject: sub.get(p.id) ?? null,
  }));
}

export async function requestStudentLink(studentId: string, teacherId: string) {
  const db = createAdminClient();
  const { error } = await db
    .from("links")
    .upsert(
      { student_id: studentId, teacher_id: teacherId, status: "PENDING" },
      { onConflict: "student_id,teacher_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}

export async function removeStudentLink(id: string, studentId: string) {
  const db = createAdminClient();
  const { error } = await db
    .from("links")
    .delete()
    .eq("id", id)
    .eq("student_id", studentId);
  if (error) throw new Error(error.message);
}

// 선생님의 대기 중 연결 요청
export async function getPendingRequests(
  teacherId: string,
): Promise<{ id: string; student_id: string; name: string }[]> {
  const db = createAdminClient();
  const { data: links } = await db
    .from("links")
    .select("id, student_id")
    .eq("teacher_id", teacherId)
    .eq("status", "PENDING");
  const rows = links ?? [];
  if (rows.length === 0) return [];
  const { data: profs } = await db
    .from("profiles")
    .select("id, name")
    .in("id", rows.map((l) => l.student_id));
  const nm = new Map((profs ?? []).map((p) => [p.id, p.name]));
  return rows.map((l) => ({
    id: l.id,
    student_id: l.student_id,
    name: nm.get(l.student_id) ?? "학생",
  }));
}

export async function setLinkStatusByTeacher(
  id: string,
  teacherId: string,
  status: "ACTIVE",
) {
  const db = createAdminClient();
  const { error } = await db
    .from("links")
    .update({ status })
    .eq("id", id)
    .eq("teacher_id", teacherId);
  if (error) throw new Error(error.message);
}

export async function rejectLinkByTeacher(id: string, teacherId: string) {
  const db = createAdminClient();
  const { error } = await db
    .from("links")
    .delete()
    .eq("id", id)
    .eq("teacher_id", teacherId);
  if (error) throw new Error(error.message);
}

export async function getTeacherStudents(
  teacherId: string,
): Promise<LinkedStudent[]> {
  const db = createAdminClient();
  const { data: links } = await db
    .from("links")
    .select("id, student_id, status, teacher_memo, remaining_lessons")
    .eq("teacher_id", teacherId);
  const ids = (links ?? []).map((l) => l.student_id);
  if (ids.length === 0) return [];
  const { data: profs } = await db
    .from("profiles")
    .select("id, name")
    .in("id", ids);
  const nameById = new Map((profs ?? []).map((p) => [p.id, p.name]));
  return (links ?? []).map((l) => ({
    link_id: l.id,
    student_id: l.student_id,
    name: nameById.get(l.student_id) ?? "학생",
    status: l.status as "PENDING" | "ACTIVE",
    teacher_memo: l.teacher_memo,
    remaining_lessons: l.remaining_lessons,
  }));
}

// 학생 관리 저장 (메모 + 잔여 레슨). 선생님 소유 link만.
export async function updateStudentMgmt(
  linkId: string,
  teacherId: string,
  fields: { teacher_memo: string | null; remaining_lessons: number | null },
) {
  const db = createAdminClient();
  const { error } = await db
    .from("links")
    .update(fields)
    .eq("id", linkId)
    .eq("teacher_id", teacherId);
  if (error) throw new Error(error.message);
}

// 레슨 완료 시 잔여 횟수 차감 (설정된 경우에만)
export async function decrementRemainingLessons(
  studentId: string,
  teacherId: string,
) {
  const db = createAdminClient();
  const { data } = await db
    .from("links")
    .select("id, remaining_lessons")
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (data && data.remaining_lessons != null && data.remaining_lessons > 0) {
    await db
      .from("links")
      .update({ remaining_lessons: data.remaining_lessons - 1 })
      .eq("id", data.id);
  }
}
