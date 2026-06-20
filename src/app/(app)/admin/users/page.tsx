import { requireRole } from "@/lib/auth";
import { getAllUsers } from "@/lib/data/admin";
import AdminUsers from "./AdminUsers";

export default async function Page() {
  await requireRole("POWER_ADMIN");
  const users = await getAllUsers();
  return <AdminUsers users={users} />;
}
