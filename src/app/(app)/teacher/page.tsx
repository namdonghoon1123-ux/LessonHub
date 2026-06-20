import { requireRole } from "@/lib/auth";
import { getOverrides, getWeekly } from "@/lib/data/availability";
import { getTeacherBookings } from "@/lib/data/bookings";
import { getPendingRequests } from "@/lib/data/links";
import { getTeacherProfile } from "@/lib/data/teachers";
import { computeRange } from "@/lib/slots";
import {
  WEEKDAY_KO,
  addDaysStr,
  dayNum,
  fmtTime,
  kstDateStr,
  kstTodayStr,
  weekStartStr,
} from "@/lib/time";
import { Card, PageTitle } from "@/components/ui";
import PendingRequests from "./PendingRequests";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const me = await requireRole("TEACHER");
  const sp = await searchParams;
  const profile = await getTeacherProfile(me.id);
  const duration = profile?.lesson_duration_min ?? 30;

  const today = kstTodayStr();
  const weekStart = sp.week ?? weekStartStr(today);
  const weekEnd = addDaysStr(weekStart, 7);

  const [weekly, overrides, allBookings, pendingReqs] = await Promise.all([
    getWeekly(me.id),
    getOverrides(me.id, weekStart),
    getTeacherBookings(me.id),
    getPendingRequests(me.id),
  ]);

  // 이번 주 활성 예약 → start_at ISO별 학생명 맵
  const weekActive = allBookings.filter(
    (b) =>
      (b.status === "BOOKED" || b.status === "PENDING") &&
      b.start_at >= isoStart(weekStart) &&
      b.start_at < isoStart(weekEnd),
  );
  const nameBySlot = new Map(
    weekActive.map((b) => [new Date(b.start_at).toISOString(), b.student_name]),
  );

  const days = computeRange(weekStart, 7, {
    durationMin: duration,
    weekly,
    overrides,
    bookings: weekActive.map((b) => ({
      start_at: b.start_at,
      student_id: b.student_id,
      status: b.status,
    })),
  });

  const openCount = days.reduce(
    (n, d) => n + d.slots.filter((s) => s.status === "open").length,
    0,
  );
  const todayCount = allBookings.filter(
    (b) =>
      (b.status === "BOOKED" || b.status === "COMPLETED") &&
      kstDateStr(new Date(b.start_at)) === today,
  ).length;
  const exceptionDays = new Set(
    overrides
      .filter((o) => o.date >= weekStart && o.date < weekEnd)
      .map((o) => o.date),
  ).size;

  return (
    <>
      <PageTitle
        title="이번 주 운영"
        desc={`${weekStart.slice(5)} ~ ${addDaysStr(weekStart, 6).slice(5)} · Asia/Seoul`}
        right={
          <div className="flex gap-1.5">
            <NavA href={`/teacher?week=${addDaysStr(weekStart, -7)}`}>←</NavA>
            <NavA href={`/teacher?week=${addDaysStr(weekStart, 7)}`}>→</NavA>
          </div>
        }
      />

      <PendingRequests requests={pendingReqs} />

      {/* 통계 스트립 */}
      <Card className="mb-4 grid grid-cols-2 divide-x divide-line-soft sm:grid-cols-4">
        <Stat n={todayCount} label="오늘 수업" highlight />
        <Stat n={weekActive.length} label="이번 주 예약" />
        <Stat n={openCount} label="열어둔 빈 슬롯" />
        <Stat n={exceptionDays} label="예외·휴무" />
      </Card>

      {/* 주간 그리드 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((d) => {
          const isToday = d.date === today;
          return (
            <div
              key={d.date}
              className={
                "flex min-h-[130px] flex-col rounded-[var(--radius-card)] border bg-surface " +
                (isToday ? "border-coral-border" : "border-line")
              }
            >
              <div className={"px-2.5 py-2 " + (isToday ? "bg-coral-tint" : "")}>
                <div className={`text-[12px] font-semibold ${d.weekday === 0 ? "text-rose" : "text-sub"}`}>
                  {WEEKDAY_KO[d.weekday]}
                </div>
                <div className={`text-[18px] font-bold tabular-nums ${isToday ? "text-coral-deep" : ""}`}>
                  {dayNum(d.date)}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-2">
                {d.isOff ? (
                  <Mini>휴무</Mini>
                ) : d.slots.length === 0 ? (
                  <Mini>—</Mini>
                ) : (
                  d.slots.map((s) => {
                    const name = nameBySlot.get(s.startAtISO);
                    if (s.status === "full" || s.status === "mine")
                      return (
                        <span
                          key={s.startAtISO}
                          className="rounded-[6px] border-l-2 border-rose bg-rose-tint px-1.5 py-1 text-[11.5px] font-semibold text-rose tabular-nums"
                        >
                          {fmtTime(new Date(s.startAtISO))} {name ?? ""}
                        </span>
                      );
                    if (s.status === "open")
                      return (
                        <span
                          key={s.startAtISO}
                          className="rounded-[6px] border border-dashed border-coral-border px-1.5 py-1 text-[11.5px] text-coral-deep tabular-nums"
                        >
                          {fmtTime(new Date(s.startAtISO))} 열림
                        </span>
                      );
                    return (
                      <span
                        key={s.startAtISO}
                        className="px-1.5 py-1 text-[11.5px] text-muted tabular-nums"
                      >
                        {fmtTime(new Date(s.startAtISO))}
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function isoStart(dateStr: string): string {
  // KST 자정 → UTC ISO
  return new Date(new Date(`${dateStr}T00:00:00+09:00`)).toISOString();
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

function Mini({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center py-3 text-[11.5px] text-muted">
      {children}
    </div>
  );
}

function NavA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="grid h-8 w-8 place-items-center rounded-[8px] border border-line text-sub hover:bg-line-soft"
    >
      {children}
    </a>
  );
}
