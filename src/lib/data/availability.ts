import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type WeeklyRow = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  lesson_title: string | null;
};

export type OverrideRow = {
  id: string;
  date: string;
  type: "OPEN" | "OFF" | "CLOSE";
  start_time: string | null;
  end_time: string | null;
  lesson_title: string | null;
  lesson_note: string | null;
};

export async function getWeekly(teacherId: string): Promise<WeeklyRow[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("weekly_availabilities")
    .select("id, weekday, start_time, end_time, is_active, lesson_title")
    .eq("teacher_id", teacherId)
    .order("weekday")
    .order("start_time");
  return (data as WeeklyRow[]) ?? [];
}

export async function getOverrides(
  teacherId: string,
  fromDate?: string,
): Promise<OverrideRow[]> {
  const db = createAdminClient();
  let q = db
    .from("date_overrides")
    .select("id, date, type, start_time, end_time, lesson_title, lesson_note")
    .eq("teacher_id", teacherId)
    .order("date");
  if (fromDate) q = q.gte("date", fromDate);
  const { data } = await q;
  return (data as OverrideRow[]) ?? [];
}

export async function addWeeklyRange(
  teacherId: string,
  weekday: number,
  start: string,
  end: string,
) {
  const db = createAdminClient();
  const { error } = await db.from("weekly_availabilities").insert({
    teacher_id: teacherId,
    weekday,
    start_time: start,
    end_time: end,
  });
  if (error) throw new Error(error.message);
}

export async function deleteWeeklyRange(teacherId: string, id: string) {
  const db = createAdminClient();
  const { error } = await db
    .from("weekly_availabilities")
    .delete()
    .eq("id", id)
    .eq("teacher_id", teacherId); // 소유권 강제
  if (error) throw new Error(error.message);
}

export async function addOverride(
  teacherId: string,
  o: {
    date: string;
    type: "OPEN" | "OFF" | "CLOSE";
    start_time: string | null;
    end_time: string | null;
    lesson_note: string | null;
  },
) {
  const db = createAdminClient();
  const { error } = await db.from("date_overrides").insert({
    teacher_id: teacherId,
    ...o,
  });
  if (error) throw new Error(error.message);
}

export async function deleteOverride(teacherId: string, id: string) {
  const db = createAdminClient();
  const { error } = await db
    .from("date_overrides")
    .delete()
    .eq("id", id)
    .eq("teacher_id", teacherId);
  if (error) throw new Error(error.message);
}
