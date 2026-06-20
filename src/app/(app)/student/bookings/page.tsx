import { requireRole } from "@/lib/auth";
import { getStudentBookings } from "@/lib/data/bookings";
import { canStudentCancel, studentCancelDeadline } from "@/lib/policy";
import MyBookings, { type UIBooking } from "./MyBookings";

export default async function Page() {
  const me = await requireRole("STUDENT");
  const rows = await getStudentBookings(me.id);
  const now = Date.now();

  const toUI = (r: (typeof rows)[number]): UIBooking => ({
    id: r.id,
    start_at: r.start_at,
    duration_min: r.duration_min,
    status: r.status,
    teacher_name: r.teacher_name,
    lesson_title: r.lesson_title_snapshot,
    canCancel: canStudentCancel(r.start_at),
    deadlineISO: studentCancelDeadline(r.start_at).toISOString(),
  });

  const isPast = (r: (typeof rows)[number]) =>
    r.status === "COMPLETED" ||
    r.status === "NO_SHOW" ||
    r.status === "CANCELED" ||
    new Date(r.start_at).getTime() < now;

  const upcoming = rows.filter((r) => !isPast(r)).map(toUI);
  const past = rows
    .filter(isPast)
    .map(toUI)
    .reverse();

  return <MyBookings upcoming={upcoming} past={past} />;
}
