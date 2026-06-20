import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function logAudit(entry: {
  actorId: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  payload?: Record<string, unknown>;
}) {
  const db = createAdminClient();
  await db.from("audit_logs").insert({
    actor_id: entry.actorId,
    actor_email: entry.actorEmail ?? null,
    actor_role: entry.actorRole ?? null,
    action: entry.action,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    payload: entry.payload ?? null,
  });
}

export type AuditRow = {
  id: number;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export async function getAuditLogs(limit = 100): Promise<AuditRow[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AuditRow[]) ?? [];
}
