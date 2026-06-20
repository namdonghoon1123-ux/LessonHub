import { requireRole } from "@/lib/auth";
import { getOverrides, getWeekly } from "@/lib/data/availability";
import { getTeacherProfile } from "@/lib/data/teachers";
import { kstTodayStr } from "@/lib/time";
import { PageTitle } from "@/components/ui";
import LessonSettings from "./LessonSettings";
import ScheduleEditor from "./ScheduleEditor";

export default async function Page() {
  const me = await requireRole("TEACHER");
  const [weekly, overrides, profile] = await Promise.all([
    getWeekly(me.id),
    getOverrides(me.id, kstTodayStr()),
    getTeacherProfile(me.id),
  ]);
  return (
    <>
      <PageTitle
        title="시간표 · 예외"
        desc="레슨 설정 + 주간 가능 시간 + 예외 = 학생에게 보이는 슬롯"
      />
      <LessonSettings
        durationMin={profile?.lesson_duration_min ?? 60}
        cancelCutoffHours={profile?.teacher_cancel_cutoff_hours ?? 2}
        bookingWindowDays={profile?.booking_window_days ?? 30}
      />
      <ScheduleEditor weekly={weekly} overrides={overrides} />
    </>
  );
}
