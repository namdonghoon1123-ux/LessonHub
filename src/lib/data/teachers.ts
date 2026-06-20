import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type TeacherProfile = {
  teacher_id: string;
  display_name: string | null;
  subject: string | null;
  slug: string | null;
  bio: string | null;
  lesson_duration_min: number;
  booking_window_days: number;
  teacher_cancel_cutoff_hours: number;
  student_cancel_day_before_hour: number | null;
};

export async function getTeacherProfile(
  teacherId: string,
): Promise<TeacherProfile | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("teacher_profiles")
    .select("*")
    .eq("teacher_id", teacherId)
    .single();
  return (data as TeacherProfile) ?? null;
}

export async function updateTeacherProfile(
  teacherId: string,
  fields: Partial<{
    lesson_duration_min: number;
    teacher_cancel_cutoff_hours: number;
    booking_window_days: number;
    subject: string;
    display_name: string;
  }>,
) {
  const db = createAdminClient();
  const { error } = await db
    .from("teacher_profiles")
    .update(fields)
    .eq("teacher_id", teacherId);
  if (error) throw new Error(error.message);
}

export async function getTeacherBySlug(slug: string): Promise<{
  id: string;
  name: string;
  subject: string | null;
  bio: string | null;
  lesson_duration_min: number;
} | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("public_teachers")
    .select("id, name, subject, bio, lesson_duration_min")
    .eq("slug", slug)
    .single();
  return data ?? null;
}
