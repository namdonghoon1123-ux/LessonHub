"use server";

import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleHome } from "@/lib/types";

export type PwState = { error?: string };

export async function changePasswordAction(
  _prev: PwState,
  formData: FormData,
): Promise<PwState> {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const pw = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (pw.length < 6) return { error: "비밀번호는 6자 이상이어야 합니다." };
  if (pw !== confirm) return { error: "비밀번호가 일치하지 않습니다." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) return { error: error.message };

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", profile.id);

  redirect(roleHome[profile.role]);
}
