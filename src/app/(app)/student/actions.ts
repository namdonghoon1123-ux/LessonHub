"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  getStudentTeachers,
  removeStudentLink,
  requestStudentLink,
} from "@/lib/data/links";
import { getOverrides, getWeekly } from "@/lib/data/availability";
import {
  createBooking,
  getActiveBookings,
  getBooking,
  setBookingStatus,
} from "@/lib/data/bookings";
import { computeDaySlots } from "@/lib/slots";
import { kstDateStr, addDaysStr } from "@/lib/time";
import { canStudentCancel } from "@/lib/policy";

export type Result = { ok: boolean; error?: string };

export async function bookSlotAction(
  teacherId: string,
  startAtISO: string,
): Promise<Result> {
  const me = await requireRole("STUDENT");

  // 연결 확인 + 선생 정보
  const teachers = await getStudentTeachers(me.id);
  const teacher = teachers.find((t) => t.teacher_id === teacherId);
  if (!teacher) return { ok: false, error: "담당 선생님과 연결되어 있지 않습니다." };

  // 슬롯이 실제로 'open'인지 재검증
  const date = kstDateStr(new Date(startAtISO));
  const [weekly, overrides, bookings] = await Promise.all([
    getWeekly(teacherId),
    getOverrides(teacherId, date),
    getActiveBookings(teacherId, startAtISO, addDaysStr(date, 1) + "T00:00:00Z"),
  ]);
  const day = computeDaySlots({
    date,
    durationMin: teacher.lesson_duration_min,
    weekly,
    overrides,
    bookings,
    viewingStudentId: me.id,
  });
  const slot = day.slots.find((s) => s.startAtISO === startAtISO);
  if (!slot || slot.status !== "open") {
    return { ok: false, error: "예약할 수 없는 시간입니다." };
  }

  const res = await createBooking({
    studentId: me.id,
    teacherId,
    startAtISO,
    durationMin: teacher.lesson_duration_min,
    lessonTitle: teacher.subject,
  });
  if (!res.ok) return res;
  revalidatePath("/student");
  revalidatePath("/student/bookings");
  return { ok: true };
}

export async function requestLinkAction(teacherId: string): Promise<Result> {
  const me = await requireRole("STUDENT");
  try {
    await requestStudentLink(me.id, teacherId);
    revalidatePath("/student/teachers");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function removeLinkAction(id: string): Promise<Result> {
  const me = await requireRole("STUDENT");
  try {
    await removeStudentLink(id, me.id);
    revalidatePath("/student/teachers");
    revalidatePath("/student");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// 학생 본인 예약 취소 (48h 등 정책은 화면에서 안내, 여기선 소유권 + 미래 여부 확인)
export async function cancelMyBookingAction(
  bookingId: string,
): Promise<Result> {
  const me = await requireRole("STUDENT");
  const b = await getBooking(bookingId);
  if (!b || b.student_id !== me.id) return { ok: false, error: "권한이 없습니다." };
  if (b.status !== "BOOKED" && b.status !== "PENDING") {
    return { ok: false, error: "취소할 수 없는 예약입니다." };
  }
  if (!canStudentCancel(b.start_at)) {
    return { ok: false, error: "취소 마감 시간이 지났습니다." };
  }
  await setBookingStatus(bookingId, "CANCELED", {
    canceled_by: me.id,
    canceled_at: new Date().toISOString(),
  });
  revalidatePath("/student");
  revalidatePath("/student/bookings");
  return { ok: true };
}
