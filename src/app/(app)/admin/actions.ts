"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  countActiveAdmins,
  createAuthUser,
  createLink,
  deleteLink,
  getUserRole,
  resetUserPassword,
  setUserActive,
} from "@/lib/data/admin";
import { logAudit } from "@/lib/data/audit";
import {
  createPatchNote,
  deletePatchNote,
} from "@/lib/data/patchNotes";
import type { Profile, Role, StudentTier } from "@/lib/types";

function actor(me: Profile) {
  return { actorId: me.id, actorEmail: me.email, actorRole: me.role };
}

export type AdminResult = { ok: boolean; error?: string; tempPassword?: string };

export async function createUserAction(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
  tier?: StudentTier;
}): Promise<AdminResult> {
  const me = await requireRole("POWER_ADMIN");
  if (!input.email || !input.name) return { ok: false, error: "이름/이메일 필수" };
  if (input.password.length < 6)
    return { ok: false, error: "비밀번호는 6자 이상" };
  const res = await createAuthUser(input);
  if (res.ok) {
    await logAudit({ ...actor(me), action: "user.create", targetType: "user", payload: { email: input.email, role: input.role } });
    revalidatePath("/admin/users");
  }
  return res;
}

export async function setUserActiveAction(
  userId: string,
  active: boolean,
): Promise<AdminResult> {
  const me = await requireRole("POWER_ADMIN");
  if (!active) {
    // 마지막 활성 관리자 보호
    const role = await getUserRole(userId);
    if (role === "POWER_ADMIN" && (await countActiveAdmins()) <= 1) {
      return { ok: false, error: "마지막 활성 관리자는 비활성화할 수 없습니다." };
    }
    if (userId === me.id) {
      return { ok: false, error: "본인 계정은 비활성화할 수 없습니다." };
    }
  }
  try {
    await setUserActive(userId, active);
    await logAudit({ ...actor(me), action: active ? "user.activate" : "user.deactivate", targetType: "user", targetId: userId });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function createLinkAction(
  studentId: string,
  teacherId: string,
): Promise<AdminResult> {
  const me = await requireRole("POWER_ADMIN");
  if (!studentId || !teacherId)
    return { ok: false, error: "학생/선생님을 선택하세요." };
  try {
    await createLink(studentId, teacherId);
    await logAudit({ ...actor(me), action: "link.create", targetType: "link", payload: { studentId, teacherId } });
    revalidatePath("/admin/links");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteLinkAction(id: string): Promise<AdminResult> {
  const me = await requireRole("POWER_ADMIN");
  try {
    await deleteLink(id);
    await logAudit({ ...actor(me), action: "link.delete", targetType: "link", targetId: id });
    revalidatePath("/admin/links");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function resetPasswordAction(userId: string): Promise<AdminResult> {
  const me = await requireRole("POWER_ADMIN");
  const temp = "Lh" + globalThis.crypto.randomUUID().slice(0, 8);
  const res = await resetUserPassword(userId, temp);
  if (!res.ok) return res;
  await logAudit({ ...actor(me), action: "user.reset_password", targetType: "user", targetId: userId });
  revalidatePath("/admin/users");
  return { ok: true, tempPassword: temp };
}

export async function createPatchNoteAction(input: {
  title: string;
  body: string;
  publish: boolean;
}): Promise<AdminResult> {
  const me = await requireRole("POWER_ADMIN");
  if (!input.title.trim() || !input.body.trim())
    return { ok: false, error: "제목과 내용을 입력하세요." };
  try {
    await createPatchNote({ ...input, authorId: me.id });
    await logAudit({ ...actor(me), action: "patch_note.create", targetType: "patch_note", payload: { title: input.title } });
    revalidatePath("/admin/patch-notes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deletePatchNoteAction(id: string): Promise<AdminResult> {
  const me = await requireRole("POWER_ADMIN");
  try {
    await deletePatchNote(id);
    await logAudit({ ...actor(me), action: "patch_note.delete", targetType: "patch_note", targetId: id });
    revalidatePath("/admin/patch-notes");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
