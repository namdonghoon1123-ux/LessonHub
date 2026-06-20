import { requireRole } from "@/lib/auth";
import { getAvailableTeachers, getStudentLinks } from "@/lib/data/links";
import StudentTeachers from "./StudentTeachers";

export default async function Page() {
  const me = await requireRole("STUDENT");
  const [links, all] = await Promise.all([
    getStudentLinks(me.id),
    getAvailableTeachers(),
  ]);
  const linkedIds = new Set(links.map((l) => l.teacher_id));
  const available = all.filter((t) => !linkedIds.has(t.teacher_id));
  return <StudentTeachers links={links} available={available} />;
}
