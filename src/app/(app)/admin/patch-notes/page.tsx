import { requireRole } from "@/lib/auth";
import { getPatchNotes } from "@/lib/data/patchNotes";
import PatchNotes from "./PatchNotes";

export default async function Page() {
  await requireRole("POWER_ADMIN");
  const notes = await getPatchNotes();
  return <PatchNotes notes={notes} />;
}
