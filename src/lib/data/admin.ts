import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role, StudentTier } from "@/lib/types";

export type AdminUser = {
  id: string;
  role: Role;
  name: string;
  email: string | null;
  username: string | null;
  is_active: boolean;
  student_tier: StudentTier | null;
  must_change_password: boolean;
  created_at: string;
};

export async function getAllUsers(): Promise<AdminUser[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("profiles")
    .select(
      "id, role, name, email, username, is_active, student_tier, must_change_password, created_at",
    )
    .order("created_at", { ascending: false });
  return (data as AdminUser[]) ?? [];
}

export async function countActiveAdmins(): Promise<number> {
  const db = createAdminClient();
  const { count } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "POWER_ADMIN")
    .eq("is_active", true);
  return count ?? 0;
}

export async function createAuthUser(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
  tier?: StudentTier;
  username?: string;
}): Promise<{ ok: boolean; error?: string; userId?: string }> {
  const db = createAdminClient();
  const { data, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      name: input.name,
      role: input.role,
      ...(input.tier ? { tier: input.tier } : {}),
      ...(input.username ? { username: input.username } : {}),
      must_change_password: true,
    },
  });
  if (error) {
    if (/registered|already/i.test(error.message))
      return { ok: false, error: "이미 등록된 이메일입니다." };
    return { ok: false, error: error.message };
  }
  return { ok: true, userId: data.user.id };
}

export async function setUserActive(userId: string, active: boolean) {
  const db = createAdminClient();
  const patch = active
    ? { is_active: true, deactivated_at: null, deactivated_reason: null }
    : { is_active: false, deactivated_at: new Date().toISOString() };
  const { error } = await db.from("profiles").update(patch).eq("id", userId);
  if (error) throw new Error(error.message);
  if (!active) {
    // 연결 해제
    await db.from("links").delete().or(`student_id.eq.${userId},teacher_id.eq.${userId}`);
  }
}

export async function resetUserPassword(
  userId: string,
  tempPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = createAdminClient();
  const { error } = await db.auth.admin.updateUserById(userId, {
    password: tempPassword,
  });
  if (error) return { ok: false, error: error.message };
  await db.from("profiles").update({ must_change_password: true }).eq("id", userId);
  return { ok: true };
}

export type LinkDetailed = {
  id: string;
  student_id: string;
  teacher_id: string;
  status: "PENDING" | "ACTIVE";
  student_name: string;
  teacher_name: string;
  created_at: string;
};

export async function getLinksDetailed(): Promise<LinkDetailed[]> {
  const db = createAdminClient();
  const { data: links } = await db
    .from("links")
    .select("id, student_id, teacher_id, status, created_at")
    .order("created_at", { ascending: false });
  const rows = links ?? [];
  const ids = [
    ...new Set(rows.flatMap((l) => [l.student_id, l.teacher_id])),
  ];
  const { data: profs } = await db
    .from("profiles")
    .select("id, name")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const nm = new Map((profs ?? []).map((p) => [p.id, p.name]));
  return rows.map((l) => ({
    ...l,
    status: l.status as "PENDING" | "ACTIVE",
    student_name: nm.get(l.student_id) ?? "학생",
    teacher_name: nm.get(l.teacher_id) ?? "선생님",
  }));
}

export async function createLink(studentId: string, teacherId: string) {
  const db = createAdminClient();
  const { error } = await db
    .from("links")
    .upsert(
      { student_id: studentId, teacher_id: teacherId, status: "ACTIVE" },
      { onConflict: "student_id,teacher_id" },
    );
  if (error) throw new Error(error.message);
}

export async function deleteLink(id: string) {
  const db = createAdminClient();
  const { error } = await db.from("links").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getUserRole(userId: string): Promise<Role | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return (data?.role as Role) ?? null;
}
