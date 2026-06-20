import { requireRole } from "@/lib/auth";
import { getAllUsers, getLinksDetailed } from "@/lib/data/admin";
import AdminLinks from "./AdminLinks";

export default async function Page() {
  await requireRole("POWER_ADMIN");
  const [links, users] = await Promise.all([getLinksDetailed(), getAllUsers()]);
  const students = users
    .filter((u) => u.role === "STUDENT" && u.is_active)
    .map((u) => ({ id: u.id, name: u.name }));
  const teachers = users
    .filter((u) => u.role === "TEACHER" && u.is_active)
    .map((u) => ({ id: u.id, name: u.name }));
  return <AdminLinks links={links} students={students} teachers={teachers} />;
}
