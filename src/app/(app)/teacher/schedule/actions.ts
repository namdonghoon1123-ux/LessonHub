"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  addOverride,
  addWeeklyRange,
  deleteOverride,
  deleteWeeklyRange,
} from "@/lib/data/availability";
import { timeToMinutes } from "@/lib/time";

export type ActionResult = { ok: boolean; error?: string };

export async function addWeeklyRangeAction(
  weekday: number,
  start: string,
  end: string,
): Promise<ActionResult> {
  const me = await requireRole("TEACHER");
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    return { ok: false, error: "종료 시간이 시작 시간보다 늦어야 합니다." };
  }
  try {
    await addWeeklyRange(me.id, weekday, start, end);
    revalidatePath("/teacher/schedule");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteWeeklyRangeAction(id: string): Promise<ActionResult> {
  const me = await requireRole("TEACHER");
  try {
    await deleteWeeklyRange(me.id, id);
    revalidatePath("/teacher/schedule");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function addOverrideAction(input: {
  date: string;
  type: "OPEN" | "OFF" | "CLOSE";
  start: string;
  end: string;
  note: string;
}): Promise<ActionResult> {
  const me = await requireRole("TEACHER");
  const partial = input.type !== "OFF" || (input.start && input.end);
  if (partial && input.start && input.end) {
    if (timeToMinutes(input.end) <= timeToMinutes(input.start)) {
      return { ok: false, error: "종료 시간이 시작 시간보다 늦어야 합니다." };
    }
  }
  if ((input.type === "OPEN" || input.type === "CLOSE") && !(input.start && input.end)) {
    return { ok: false, error: "시작/종료 시간을 입력해 주세요." };
  }
  try {
    await addOverride(me.id, {
      date: input.date,
      type: input.type,
      start_time: input.start || null,
      end_time: input.end || null,
      lesson_note: input.note || null,
    });
    revalidatePath("/teacher/schedule");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteOverrideAction(id: string): Promise<ActionResult> {
  const me = await requireRole("TEACHER");
  try {
    await deleteOverride(me.id, id);
    revalidatePath("/teacher/schedule");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
