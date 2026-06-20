import { requireRole } from "@/lib/auth";
import { getStudentBookings } from "@/lib/data/bookings";
import { getStudentTeachers } from "@/lib/data/links";
import { canStudentCancel, studentCancelDeadline } from "@/lib/policy";
import MyBookings, { type UIBooking } from "./MyBookings";

const DEFAULT_CANCEL_NOTICE =
  "연습실 취소 수수료가 있어요. 부득이한 경우가 아니면 48시간 이전에 취소 부탁드립니다. ㅠㅠ";

export default async function Page() {
  const me = await requireRole("STUDENT");
  const [rows, teachers] = await Promise.all([
    getStudentBookings(me.id),
    getStudentTeachers(me.id),
  ]);
  const cancelNotice = teachers[0]?.cancel_notice ?? DEFAULT_CANCEL_NOTICE;
  const hasTeacher = teachers.length > 0;
  const now = Date.now();

  const toUI = (r: (typeof rows)[number]): UIBooking => ({
    id: r.id,
    start_at: r.start_at,
    duration_min: r.duration_min,
    status: r.status,
    teacher_name: r.teacher_name,
    lesson_title: r.lesson_title_snapshot,
    seriesId: r.recurring_series_id,
    shareToken: r.share_token,
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

  return (
    <MyBookings
      upcoming={upcoming}
      past={past}
      cancelNotice={cancelNotice}
      canNotifyPayment={hasTeacher}
    />
  );
}
