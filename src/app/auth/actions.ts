"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveLoginEmail, syntheticEmail, usernameTaken } from "@/lib/account";
import { roleHome, type Role } from "@/lib/types";

export type AuthState = { error?: string };

async function destinationForCurrentUser(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/login";
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return data ? roleHome[data.role as Role] : "/";
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const email = await resolveLoginEmail(identifier);
  if (!email) return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  redirect(await destinationForCurrentUser());
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (name.length < 1) return { error: "이름을 입력해 주세요." };
  if (username.length < 2) return { error: "아이디는 2자 이상이어야 합니다." };
  if (username.includes("@") || /\s/.test(username))
    return { error: "아이디에 공백이나 @는 쓸 수 없습니다." };
  if (password.length < 6) return { error: "비밀번호는 6자 이상이어야 합니다." };
  if (await usernameTaken(username))
    return { error: "이미 사용 중인 아이디입니다." };

  const admin = createAdminClient();
  const email = syntheticEmail();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, name, role: "STUDENT", tier: "FULL" },
  });
  if (error) return { error: error.message };

  // 세션 설정 (쿠키)
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password });
  redirect("/student");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
