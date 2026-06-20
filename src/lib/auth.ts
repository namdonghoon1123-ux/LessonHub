import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleHome, type Profile, type Role } from "./types";

const PROFILE_COLS =
  "id, role, name, email, is_active, must_change_password, student_tier";

// 현재 로그인 사용자의 profiles 행. 비로그인/프로필없음 → null.
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_COLS)
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

// 로그인 필수. 비로그인 → /login.
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

// 특정 역할 필수. 불일치 → 본인 역할 홈으로.
export async function requireRole(role: Role): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== role) redirect(roleHome[profile.role]);
  return profile;
}
