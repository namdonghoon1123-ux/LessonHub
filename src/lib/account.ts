import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 아이디 로그인을 위해 내부적으로 쓰는 가짜 이메일 (실제 메일 발송 없음)
export function syntheticEmail(): string {
  return `u-${globalThis.crypto.randomUUID()}@lessonhub.local`;
}

export async function usernameTaken(username: string): Promise<boolean> {
  const db = createAdminClient();
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  return !!data;
}

// 로그인 식별자(아이디 또는 이메일) → 실제 인증 이메일
export async function resolveLoginEmail(
  identifier: string,
): Promise<string | null> {
  const id = identifier.trim();
  if (id.includes("@")) return id; // 이메일로 입력한 경우
  const db = createAdminClient();
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("username", id)
    .maybeSingle();
  if (!data) return null;
  const { data: u } = await db.auth.admin.getUserById(data.id);
  return u?.user?.email ?? null;
}
