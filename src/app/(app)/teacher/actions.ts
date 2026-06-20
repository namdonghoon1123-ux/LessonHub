"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  createBooking,
  getActiveBookings,
  getBooking,
  setBookingStatus,
  updateBookingComments,
} from "@/lib/data/bookings";
import {
  decrementRemainingLessons,
  getTeacherStudents,
  rejectLinkByTeacher,
  setLinkStatusByTeacher,
  updateStudentMgmt,
} from "@/lib/data/links";
import { createAuthUser, createLink } from "@/lib/data/admin";
import { getTeacherProfile, updateTeacherProfile } from "@/lib/data/teachers";
import { addOverride, getOverrides, getWeekly } from "@/lib/data/availability";
import { markNotificationRead } from "@/lib/data/notifications";

export async function markNotificationReadAction(id: string): Promise<{ ok: boolean }> {
  const me = await requireRole("TEACHER");
  await markNotificationRead(id, me.id);
  revalidatePath("/teacher");
  return { ok: true };
}
import { computeDaySlots } from "@/lib/slots";
import { addDaysStr, kstDateStr } from "@/lib/time";
import { syntheticEmail, usernameTaken } from "@/lib/account";

// 선생님이 학생 대신 예약을 잡아줌 (빈 슬롯 클릭 → 학생 선택)
export async function bookForStudentAction(
  studentId: string,
  startAtISO: string,
): Promise<Result & { shareToken?: string }> {
  const me = await requireRole("TEACHER");
  const students = await getTeacherStudents(me.id);
  const student = students.find(
    (s) => s.student_id === studentId && s.status === "ACTIVE",
  );
  if (!student) return { ok: false, error: "연결된 학생이 아닙니다." };

  const profile = await getTeacherProfile(me.id);
  const duration = profile?.lesson_duration_min ?? 60;
  const date = kstDateStr(new Date(startAtISO));
  const [weekly, overrides, bookings] = await Promise.all([
    getWeekly(me.id),
    getOverrides(me.id, date),
    getActiveBookings(me.id, startAtISO, addDaysStr(date, 1) + "T00:00:00Z"),
  ]);
  const day = computeDaySlots({ date, durationMin: duration, weekly, overrides, bookings });
  const slot = day.slots.find((s) => s.startAtISO === startAtISO);
  if (!slot || slot.status !== "open") {
    return { ok: false, error: "예약할 수 없는 시간입니다." };
  }
  const res = await createBooking({
    studentId,
    teacherId: me.id,
    startAtISO,
    durationMin: duration,
    lessonTitle: profile?.subject ?? null,
  });
  if (!res.ok) return { ok: false, error: res.error };
  revalidatePath("/teacher");
  revalidatePath("/teacher/bookings");
  return { ok: true, shareToken: res.shareToken };
}

// 주간 그리드에서 빈 슬롯 클릭 → 그 시간만 휴강(CLOSE) 처리
export async function quickCloseSlotAction(
  date: string,
  startTime: string,
  endTime: string,
): Promise<Result> {
  const me = await requireRole("TEACHER");
  try {
    await addOverride(me.id, {
      date,
      type: "CLOSE",
      start_time: startTime,
      end_time: endTime,
      lesson_note: null,
    });
    revalidatePath("/teacher");
    revalidatePath("/teacher/schedule");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export type Result = { ok: boolean; error?: string };

export async function updateLessonSettingsAction(input: {
  lessonDurationMin: number;
  cancelCutoffHours: number;
  bookingWindowDays: number;
  shareTemplate: string;
  cancelNotice: string;
}): Promise<Result> {
  const me = await requireRole("TEACHER");
  if (input.lessonDurationMin < 10 || input.lessonDurationMin > 240)
    return { ok: false, error: "레슨 길이는 10~240분 사이여야 합니다." };
  try {
    await updateTeacherProfile(me.id, {
      lesson_duration_min: input.lessonDurationMin,
      teacher_cancel_cutoff_hours: input.cancelCutoffHours,
      booking_window_days: input.bookingWindowDays,
      share_message_template: input.shareTemplate.trim() || null,
      cancel_notice: input.cancelNotice.trim() || null,
    });
    revalidatePath("/teacher/schedule");
    revalidatePath("/teacher");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// 선생님이 학생(임시) 계정 생성 + 본인에게 자동 연결(ACTIVE)
export async function createStudentAction(input: {
  name: string;
  username: string;
  password: string;
}): Promise<Result> {
  const me = await requireRole("TEACHER");
  if (!input.name || !input.username)
    return { ok: false, error: "이름/아이디를 입력하세요." };
  if (input.username.includes("@") || /\s/.test(input.username))
    return { ok: false, error: "아이디에 공백이나 @는 쓸 수 없습니다." };
  if (input.password.length < 6)
    return { ok: false, error: "임시 비밀번호는 6자 이상이어야 합니다." };
  if (await usernameTaken(input.username))
    return { ok: false, error: "이미 사용 중인 아이디입니다." };
  const res = await createAuthUser({
    email: syntheticEmail(),
    username: input.username,
    password: input.password,
    name: input.name,
    role: "STUDENT",
    tier: "TEMP",
  });
  if (!res.ok || !res.userId) return { ok: false, error: res.error };
  try {
    await createLink(res.userId, me.id); // ACTIVE 연결
    revalidatePath("/teacher/students");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function approveLinkAction(id: string): Promise<Result> {
  const me = await requireRole("TEACHER");
  try {
    await setLinkStatusByTeacher(id, me.id, "ACTIVE");
    revalidatePath("/teacher");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function rejectLinkAction(id: string): Promise<Result> {
  const me = await requireRole("TEACHER");
  try {
    await rejectLinkByTeacher(id, me.id);
    revalidatePath("/teacher");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function ownedBooking(id: string) {
  const me = await requireRole("TEACHER");
  const b = await getBooking(id);
  if (!b || b.teacher_id !== me.id) return null;
  return b;
}

function refresh() {
  revalidatePath("/teacher");
  revalidatePath("/teacher/bookings");
}

export async function saveCommentAction(
  id: string,
  studentMessage: string,
  privateMemo: string,
): Promise<Result> {
  const b = await ownedBooking(id);
  if (!b) return { ok: false, error: "권한이 없습니다." };
  try {
    await updateBookingComments(id, studentMessage, privateMemo);
    revalidatePath("/teacher/bookings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function completeBookingAction(id: string): Promise<Result> {
  const b = await ownedBooking(id);
  if (!b) return { ok: false, error: "권한이 없습니다." };
  const endMs = new Date(b.start_at).getTime() + b.duration_min * 60000;
  if (Date.now() < endMs)
    return { ok: false, error: "수업 종료 후에 완료할 수 있어요." };
  await setBookingStatus(id, "COMPLETED", { completed_at: new Date().toISOString() });
  await decrementRemainingLessons(b.student_id, b.teacher_id); // 잔여 횟수 설정 시 차감
  refresh();
  return { ok: true };
}

export async function saveStudentMgmtAction(
  linkId: string,
  memo: string,
  remaining: number | null,
): Promise<Result> {
  const me = await requireRole("TEACHER");
  try {
    await updateStudentMgmt(linkId, me.id, {
      teacher_memo: memo.trim() || null,
      remaining_lessons:
        remaining == null || Number.isNaN(remaining) ? null : Math.max(0, remaining),
    });
    revalidatePath("/teacher/students");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function noShowBookingAction(id: string): Promise<Result> {
  const b = await ownedBooking(id);
  if (!b) return { ok: false, error: "권한이 없습니다." };
  if (Date.now() < new Date(b.start_at).getTime())
    return { ok: false, error: "수업 시작 후에 노쇼 처리할 수 있어요." };
  await setBookingStatus(id, "NO_SHOW", { no_show_at: new Date().toISOString() });
  refresh();
  return { ok: true };
}

export async function cancelBookingAction(id: string): Promise<Result> {
  const b = await ownedBooking(id);
  if (!b) return { ok: false, error: "권한이 없습니다." };
  if (b.status !== "BOOKED" && b.status !== "PENDING")
    return { ok: false, error: "취소할 수 없는 예약입니다." };
  const me = await requireRole("TEACHER");
  await setBookingStatus(id, "CANCELED", {
    canceled_by: me.id,
    canceled_at: new Date().toISOString(),
  });
  refresh();
  return { ok: true };
}
