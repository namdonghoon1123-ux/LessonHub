"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  getBooking,
  setBookingStatus,
  updateBookingComments,
} from "@/lib/data/bookings";
import {
  decrementRemainingLessons,
  rejectLinkByTeacher,
  setLinkStatusByTeacher,
  updateStudentMgmt,
} from "@/lib/data/links";
import { createAuthUser, createLink } from "@/lib/data/admin";
import { updateTeacherProfile } from "@/lib/data/teachers";
import { addOverride } from "@/lib/data/availability";
import { syntheticEmail, usernameTaken } from "@/lib/account";

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
}): Promise<Result> {
  const me = await requireRole("TEACHER");
  if (input.lessonDurationMin < 10 || input.lessonDurationMin > 240)
    return { ok: false, error: "레슨 길이는 10~240분 사이여야 합니다." };
  try {
    await updateTeacherProfile(me.id, {
      lesson_duration_min: input.lessonDurationMin,
      teacher_cancel_cutoff_hours: input.cancelCutoffHours,
      booking_window_days: input.bookingWindowDays,
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
