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
  weekdayOf,
} from "@/lib/time";
import { EmptyState, PageTitle } from "@/components/ui";
import { STUDENT_CANCEL_CUTOFF_HOURS } from "@/lib/policy";
import StudentCalendar from "./StudentCalendar";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; period?: string; view?: string }>;
}) {
  const me = await requireRole("STUDENT");
  const sp = await searchParams;
  const teachers = await getStudentTeachers(me.id);

  if (teachers.length === 0) {
    return (
      <>
        <PageTitle title="예약하기" desc="담당 선생님의 빈 슬롯을 보고 예약하세요." />
        <EmptyState>
          연결된 담당 선생님이 없습니다. 선생님이 연결해 주면 예약할 수 있어요.
        </EmptyState>
      </>
    );
  }

  const teacher = teachers.find((t) => t.teacher_id === sp.t) ?? teachers[0];
  const today = kstTodayStr();
  const view = sp.view === "week" ? "week" : "month";

  let periodStart: string;
  let gridStart: string;
  let dayCount: number;
  if (view === "month") {
    periodStart = sp.period ?? today.slice(0, 7) + "-01";
    gridStart = addDaysStr(periodStart, -weekdayOf(periodStart));
    dayCount = 42;
  } else {
    periodStart = sp.period ?? weekStartStr(today);
    gridStart = periodStart;
    dayCount = 7;
  }

  const fromISO = kstToUtc(gridStart, "00:00").toISOString();
  const toISO = kstToUtc(addDaysStr(gridStart, dayCount), "00:00").toISOString();

  const [weekly, overrides, bookings] = await Promise.all([
    getWeekly(teacher.teacher_id),
    getOverrides(teacher.teacher_id, gridStart),
    getActiveBookings(teacher.teacher_id, fromISO, toISO),
  ]);

  const days = computeRange(gridStart, dayCount, {
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
      durationMin={teacher.lesson_duration_min}
      cancelCutoffHours={STUDENT_CANCEL_CUTOFF_HOURS}
      view={view}
      periodStart={periodStart}
      today={today}
      days={days}
    />
  );
}
