import { requireRole } from "@/lib/auth";
import {
  getStudentFeedback,
  markFeedbackSeen,
} from "@/lib/data/bookings";
import { EmptyState, PageTitle } from "@/components/ui";
import { Linkify } from "@/components/Linkify";
import type { FeedbackRow } from "@/lib/data/bookings";
import { WEEKDAY_KO, fmtTime, kstWall } from "@/lib/time";

function groupByMonth(items: FeedbackRow[]): [string, FeedbackRow[]][] {
  const map = new Map<string, FeedbackRow[]>();
  for (const r of items) {
    const w = kstWall(new Date(r.start_at));
    const key = `${w.y}. ${String(w.mo + 1).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return [...map.entries()];
}

export default async function Page() {
  const me = await requireRole("STUDENT");
  const rows = await getStudentFeedback(me.id);
  const unseen = new Set(
    rows
      .filter((r) => r.comment_delivered_at && !r.comment_seen_at)
      .map((r) => r.id),
  );
  // 본 것으로 표시 (다음 방문부터 배지 사라짐)
  if (unseen.size > 0) await markFeedbackSeen(me.id);

  return (
    <>
      <PageTitle title="피드백" desc="선생님이 남긴 레슨 코멘트입니다." />
      {rows.length === 0 ? (
        <EmptyState>아직 받은 피드백이 없습니다.</EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {groupByMonth(rows).map(([month, list]) => (
            <div key={month}>
              <p className="mb-2 text-[13px] font-bold text-sub tabular-nums">{month}</p>
              <div className="flex flex-col gap-2.5">
                {list.map((r) => {
                  const w = kstWall(new Date(r.start_at));
                  const isNew = unseen.has(r.id);
                  return (
                    <div
                      key={r.id}
                      className={
                        "rounded-[14px] border bg-surface p-4 " +
                        (isNew ? "border-coral-border shadow-[0_0_0_3px_var(--color-coral-tint)]" : "border-line")
                      }
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-[13px] font-bold tabular-nums">
                          {w.mo + 1}.{w.d} ({WEEKDAY_KO[w.weekday]}) {fmtTime(new Date(r.start_at))}
                        </span>
                        <span className="text-[12.5px] text-muted">
                          · {r.teacher_name} 선생님{r.lesson_title_snapshot ? ` · ${r.lesson_title_snapshot}` : ""}
                        </span>
                        {isNew && (
                          <span className="ml-auto rounded-full bg-coral px-2 py-0.5 text-[10.5px] font-bold text-white">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-[14px] leading-relaxed text-ink">
                        <Linkify text={r.teacher_comment} />
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
