import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PatchNote = {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
  created_at: string;
};

export async function getPatchNotes(onlyPublished = false): Promise<PatchNote[]> {
  const db = createAdminClient();
  let q = db
    .from("patch_notes")
    .select("id, title, body, published_at, created_at")
    .order("created_at", { ascending: false });
  if (onlyPublished) q = q.not("published_at", "is", null);
  const { data } = await q;
  return (data as PatchNote[]) ?? [];
}

export async function createPatchNote(input: {
  title: string;
  body: string;
  authorId: string;
  publish: boolean;
}) {
  const db = createAdminClient();
  const { error } = await db.from("patch_notes").insert({
    title: input.title,
    body: input.body,
    author_id: input.authorId,
    published_at: input.publish ? new Date().toISOString() : null,
  });
  if (error) throw new Error(error.message);
}

export async function deletePatchNote(id: string) {
  const db = createAdminClient();
  const { error } = await db.from("patch_notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
