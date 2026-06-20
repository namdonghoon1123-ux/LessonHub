"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { getBooking, setBookingStatus } from "@/lib/data/bookings";
import {
  rejectLinkByTeacher,
  setLinkStatusByTeacher,
} from "@/lib/data/links";

export type Result = { ok: boolean; error?: string };

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

export async function completeBookingAction(id: string): Promise<Result> {
  const b = await ownedBooking(id);
  if (!b) return { ok: false, error: "권한이 없습니다." };
  await setBookingStatus(id, "COMPLETED", { completed_at: new Date().toISOString() });
  refresh();
  return { ok: true };
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
