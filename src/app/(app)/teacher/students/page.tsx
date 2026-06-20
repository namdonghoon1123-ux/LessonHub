import { requireRole } from "@/lib/auth";
import { getTeacherStudents } from "@/lib/data/links";
import StudentsManager from "./StudentsManager";

export default async function Page() {
  const me = await requireRole("TEACHER");
  const students = await getTeacherStudents(me.id);
  return <StudentsManager students={students} />;
}
