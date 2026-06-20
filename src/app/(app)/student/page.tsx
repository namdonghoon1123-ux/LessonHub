import { requireRole } from "@/lib/auth";
import { getStudentTeachers } from "@/lib/data/links";
import { getOverrides, getWeekly } from "@/lib/data/availability";
import { getActiveBookings } from "@/lib/data/bookings";
import { computeRange } from "@/lib/slots";
import {
  addDaysStr,
  kstToUtc,
  kstTodayStr,
  weekStartStr,
} from "@/lib/time";
import { EmptyState, PageTitle } from "@/components/ui";
import StudentCalendar from "./StudentCalendar";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; week?: string }>;
}) {
  const me = await requireRole("STUDENT");
  const sp = await searchParams;
  const teachers = await getStudentTeachers(me.id);

  if (teachers.length === 0) {
    return (
      <>
        <PageTitle title="예약하기" desc="담당 선생님의 빈 슬롯을 보고 예약하세요." />
        <EmptyState>
          연결된 담당 선생님이 없습니다. 선생님과 연결되면 예약할 수 있어요.
        </EmptyState>
      </>
    );
  }

  const teacher = teachers.find((t) => t.teacher_id === sp.t) ?? teachers[0];
  const today = kstTodayStr();
  const weekStart = sp.week ?? weekStartStr(today);

  const fromISO = kstToUtc(weekStart, "00:00").toISOString();
  const toISO = kstToUtc(addDaysStr(weekStart, 7), "00:00").toISOString();

  const [weekly, overrides, bookings] = await Promise.all([
    getWeekly(teacher.teacher_id),
    getOverrides(teacher.teacher_id, weekStart),
    getActiveBookings(teacher.teacher_id, fromISO, toISO),
  ]);

  const days = computeRange(weekStart, 7, {
    durationMin: teacher.lesson_duration_min,
    weekly,
    overrides,
    bookings,
    viewingStudentId: me.id,
  });

  return (
    <StudentCalendar
      teacherId={teacher.teacher_id}
      teacherName={teacher.name}
      subject={teacher.subject}
      cancelCutoffHours={teacher.teacher_cancel_cutoff_hours}
      weekStart={weekStart}
      today={today}
      days={days}
    />
  );
}
