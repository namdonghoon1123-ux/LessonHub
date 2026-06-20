import { requireRole } from "@/lib/auth";
import { getOverrides, getWeekly } from "@/lib/data/availability";
import { getTeacherBookings } from "@/lib/data/bookings";
import { getPendingRequests, getTeacherStudents } from "@/lib/data/links";
import { getTeacherProfile } from "@/lib/data/teachers";
import { computeRange } from "@/lib/slots";
import {
  addDaysStr,
  kstDateStr,
  kstTodayStr,
  weekStartStr,
  weekdayOf,
} from "@/lib/time";
import { Card, PageTitle } from "@/components/ui";
import PendingRequests from "./PendingRequests";
import TeacherCalendar, { type SlotInfo } from "./TeacherCalendar";

const STATUS_KO: Record<string, string> = {
  BOOKED: "확정",
  PENDING: "대기",
};
const isoStart = (d: string) => new Date(`${d}T00:00:00+09:00`).toISOString();

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; period?: string }>;
}) {
  const me = await requireRole("TEACHER");
  const sp = await searchParams;
  const profile = await getTeacherProfile(me.id);
  const duration = profile?.lesson_duration_min ?? 60;
  const today = kstTodayStr();
  const view = sp.view === "month" ? "month" : "week";

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
  const fromISO = isoStart(gridStart);
  const toISO = isoStart(addDaysStr(gridStart, dayCount));

  const [weekly, overrides, allBookings, pendingReqs, students] = await Promise.all([
    getWeekly(me.id),
    getOverrides(me.id, gridStart),
    getTeacherBookings(me.id),
    getPendingRequests(me.id),
    getTeacherStudents(me.id),
  ]);
  const activeStudentOpts = students
    .filter((s) => s.status === "ACTIVE")
    .map((s) => ({ id: s.student_id, name: s.name }));

  const periodActive = allBookings.filter(
    (b) =>
      (b.status === "BOOKED" || b.status === "PENDING") &&
      b.start_at >= fromISO &&
      b.start_at < toISO,
  );
  const infoBySlot: Record<string, SlotInfo> = {};
  for (const b of periodActive) {
    infoBySlot[new Date(b.start_at).toISOString()] = {
      student_name: b.student_name,
      student_note: b.student_note,
      status: STATUS_KO[b.status] ?? b.status,
      id: b.id,
      share_token: b.share_token,
    };
  }

  const days = computeRange(gridStart, dayCount, {
    durationMin: duration,
    weekly,
    overrides,
    bookings: periodActive.map((b) => ({
      start_at: b.start_at,
      student_id: b.student_id,
      status: b.status,
    })),
  });

  // 통계
  const wkStart = weekStartStr(today);
  const wkFrom = isoStart(wkStart);
  const wkTo = isoStart(addDaysStr(wkStart, 7));
  const todayCount = allBookings.filter(
    (b) =>
      (b.status === "BOOKED" || b.status === "COMPLETED") &&
      kstDateStr(new Date(b.start_at)) === today,
  ).length;
  const weekActive = allBookings.filter(
    (b) =>
      (b.status === "BOOKED" || b.status === "PENDING") &&
      b.start_at >= wkFrom &&
      b.start_at < wkTo,
  ).length;

  return (
    <>
      <PageTitle
        title={`${me.name} 선생님 · 운영`}
        desc="Asia/Seoul · 빈 시간 클릭=휴강, 예약 클릭=정보"
      />

      <PendingRequests requests={pendingReqs} />

      <Card className="mb-4 grid grid-cols-2 divide-x divide-line-soft">
        <Stat n={todayCount} label="오늘 수업" highlight />
        <Stat n={weekActive} label="이번 주 예약" />
      </Card>

      <TeacherCalendar
        view={view}
        periodStart={periodStart}
        today={today}
        days={days}
        durationMin={duration}
        infoBySlot={infoBySlot}
        students={activeStudentOpts}
        shareTemplate={profile?.share_message_template ?? ""}
      />
    </>
  );
}

function Stat({ n, label, highlight }: { n: number; label: string; highlight?: boolean }) {
  return (
    <div className="px-4 py-3">
      <div className={`text-[22px] font-bold tabular-nums ${highlight ? "text-coral-deep" : ""}`}>
        {n}
      </div>
      <div className="text-[12px] text-muted">{label}</div>
    </div>
  );
}
