import { requireRole } from "@/lib/auth";
import { getTeacherBookings } from "@/lib/data/bookings";
import { getTeacherStudents } from "@/lib/data/links";
import { Card, PageTitle } from "@/components/ui";
import { WEEKDAY_KO, fmtTime, kstWall } from "@/lib/time";

const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (iso: string) => {
  const w = kstWall(new Date(iso));
  return `${w.y}-${pad(w.mo + 1)}`;
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const me = await requireRole("TEACHER");
  const sp = await searchParams;
  const [all, students] = await Promise.all([
    getTeacherBookings(me.id),
    getTeacherStudents(me.id),
  ]);
  const now = Date.now();

  const completed = all.filter((b) => b.status === "COMPLETED");
  const noShow = all.filter((b) => b.status === "NO_SHOW");
  const upcoming = all.filter(
    (b) =>
      (b.status === "BOOKED" || b.status === "PENDING") &&
      new Date(b.start_at).getTime() >= now,
  );
  const sessions = completed.length + noShow.length;
  const noShowRate = sessions ? Math.round((noShow.length / sessions) * 100) : 0;
  const activeStudents = students.filter((s) => s.status === "ACTIVE").length;

  const tw = kstWall(new Date());
  const thisMonth = `${tw.y}-${pad(tw.mo + 1)}`;
  const thisMonthCompleted = completed.filter(
    (b) => monthKey(b.start_at) === thisMonth,
  ).length;

  // 최근 6개월 완료 추이
  const months: { key: string; label: string; n: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(tw.y, tw.mo - i, 1));
    const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
    months.push({
      key,
      label: `${d.getUTCMonth() + 1}월`,
      n: completed.filter((b) => monthKey(b.start_at) === key).length,
    });
  }
  const maxMonth = Math.max(1, ...months.map((m) => m.n));

  // 학생별 완료 (상위 5)
  const per = new Map<string, number>();
  for (const b of completed) per.set(b.student_name, (per.get(b.student_name) ?? 0) + 1);
  const topStudents = [...per.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // 완료 수업 목록 (페이징 20, 월별 그룹)
  const sorted = [...completed].sort((a, b) => b.start_at.localeCompare(a.start_at));
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(totalPages, Math.max(1, Number(sp.page ?? 1)));
  const slice = sorted.slice((page - 1) * pageSize, page * pageSize);
  const groups = new Map<string, typeof slice>();
  for (const b of slice) {
    const k = monthKey(b.start_at);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(b);
  }

  return (
    <>
      <PageTitle title="통계" desc="레슨 운영 현황과 완료 기록" />

      {/* 핵심 지표 */}
      <Card className="mb-4 grid grid-cols-2 divide-line-soft sm:grid-cols-4 sm:divide-x">
        <Stat n={completed.length} label="총 완료 수업" highlight />
        <Stat n={thisMonthCompleted} label="이번 달 완료" />
        <Stat n={`${noShowRate}%`} label={`노쇼율 (${noShow.length}건)`} />
        <Stat n={activeStudents} label="담당 학생" />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 월별 추이 */}
        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-bold">최근 6개월 완료 추이</h2>
          <div className="flex h-32 items-end gap-2">
            {months.map((m) => (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] font-bold tabular-nums text-coral-deep">
                  {m.n}
                </span>
                <div
                  className="w-full rounded-t-[6px] bg-coral/80"
                  style={{ height: `${(m.n / maxMonth) * 90}px`, minHeight: 3 }}
                />
                <span className="text-[11px] text-muted">{m.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 학생별 완료 */}
        <Card className="p-5">
          <h2 className="mb-3 text-[15px] font-bold">학생별 완료 (상위 5)</h2>
          {topStudents.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-muted">데이터 없음</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topStudents.map(([name, n]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 truncate text-[13px] font-semibold">
                    {name}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                    <div
                      className="h-full rounded-full bg-rose"
                      style={{ width: `${(n / topStudents[0][1]) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-[12.5px] font-bold tabular-nums">
                    {n}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 완료 수업 목록 (월별 그룹 + 페이징) */}
      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold">완료 수업 ({completed.length})</h2>
        <span className="text-[12.5px] text-muted">예정 {upcoming.length}건</span>
      </div>
      {slice.length === 0 ? (
        <Card className="p-10 text-center text-[13px] text-muted">완료된 수업이 없습니다.</Card>
      ) : (
        <div className="flex flex-col gap-4">
          {[...groups.entries()].map(([m, list]) => (
            <div key={m}>
              <p className="mb-2 text-[13px] font-bold text-sub tabular-nums">
                {m.replace("-", ". ")}
              </p>
              <Card className="divide-y divide-line-soft">
                {list.map((b) => {
                  const w = kstWall(new Date(b.start_at));
                  return (
                    <div key={b.id} className="flex items-center gap-3 p-3">
                      <span className="w-20 shrink-0 text-[12.5px] font-semibold tabular-nums text-sub">
                        {w.mo + 1}.{w.d} ({WEEKDAY_KO[w.weekday]})
                      </span>
                      <span className="w-12 shrink-0 text-[13px] font-bold tabular-nums text-coral-deep">
                        {fmtTime(new Date(b.start_at))}
                      </span>
                      <span className="flex-1 truncate text-[13.5px] font-medium">
                        {b.student_name}
                      </span>
                      {b.teacher_comment && (
                        <span className="text-[11.5px] text-muted">코멘트✓</span>
                      )}
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <PageLink page={page - 1} disabled={page <= 1} label="← 이전" />
          <span className="text-[12.5px] font-semibold text-sub tabular-nums">
            {page} / {totalPages}
          </span>
          <PageLink page={page + 1} disabled={page >= totalPages} label="다음 →" />
        </div>
      )}
    </>
  );
}

function Stat({
  n,
  label,
  highlight,
}: {
  n: number | string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="px-4 py-3">
      <div className={`text-[22px] font-bold tabular-nums ${highlight ? "text-coral-deep" : ""}`}>
        {n}
      </div>
      <div className="text-[12px] text-muted">{label}</div>
    </div>
  );
}

function PageLink({
  page,
  disabled,
  label,
}: {
  page: number;
  disabled: boolean;
  label: string;
}) {
  if (disabled)
    return (
      <span className="rounded-[8px] border border-line px-3 py-1.5 text-[12.5px] text-muted opacity-50">
        {label}
      </span>
    );
  return (
    <a
      href={`/teacher/stats?page=${page}`}
      className="rounded-[8px] border border-line px-3 py-1.5 text-[12.5px] font-medium text-sub hover:bg-line-soft"
    >
      {label}
    </a>
  );
}
