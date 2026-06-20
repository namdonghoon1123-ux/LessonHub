import { requireRole } from "@/lib/auth";
import { getTeacherBookings } from "@/lib/data/bookings";
import TeacherBookings, { type UITB } from "./TeacherBookings";

export default async function Page() {
  const me = await requireRole("TEACHER");
  const rows = await getTeacherBookings(me.id);
  const items: UITB[] = rows.map((r) => ({
    id: r.id,
    start_at: r.start_at,
    duration_min: r.duration_min,
    status: r.status,
    student_name: r.student_name,
    lesson_title: r.lesson_title_snapshot,
  }));
  return <TeacherBookings items={items} />;
}
