"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui";
import { Linkify } from "@/components/Linkify";
import { WEEKDAY_KO, fmtTime, kstWall } from "@/lib/time";

export type UIFeedback = {
  id: string;
  start_at: string;
  teacher_comment: string;
  lesson_title: string | null;
  teacher_name: string;
  isNew: boolean;
};

const PAGE_SIZE = 15;
const mKey = (iso: string) => {
  const w = kstWall(new Date(iso));
  return `${w.y}-${String(w.mo + 1).padStart(2, "0")}`;
};
const mLabel = (k: string) => k.replace("-", ". ");

export default function FeedbackList({ items }: { items: UIFeedback[] }) {
  const [month, setMonth] = useState("all");
  const [page, setPage] = useState(1);

  const months = [...new Set(items.map((i) => mKey(i.start_at)))].sort((a, b) =>
    b.localeCompare(a),
  );
  const filtered =
    month === "all" ? items : items.filter((i) => mKey(i.start_at) === month);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const slice = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const groups = new Map<string, UIFeedback[]>();
  for (const f of slice) {
    const k = mLabel(mKey(f.start_at));
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(f);
  }

  if (items.length === 0)
    return <EmptyState>아직 받은 피드백이 없습니다.</EmptyState>;

  return (
    <>
      {months.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[12.5px] font-semibold text-sub">월 선택</span>
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-[10px] border-[1.5px] border-line bg-surface px-3 text-[13px] font-medium outline-none focus:border-coral"
          >
            <option value="all">전체</option>
            {months.map((m) => (
              <option key={m} value={m}>{mLabel(m)}</option>
            ))}
          </select>
          <span className="text-[12.5px] text-muted">{filtered.length}개</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {[...groups.entries()].map(([m, list]) => (
          <div key={m}>
            <p className="mb-2 text-[13px] font-bold text-sub tabular-nums">{m}</p>
            <div className="flex flex-col gap-2.5">
              {list.map((r) => {
                const w = kstWall(new Date(r.start_at));
                return (
                  <div
                    key={r.id}
                    className={
                      "rounded-[14px] border bg-surface p-4 " +
                      (r.isNew
                        ? "border-coral-border shadow-[0_0_0_3px_var(--color-coral-tint)]"
                        : "border-line")
                    }
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-bold tabular-nums">
                        {w.mo + 1}.{w.d} ({WEEKDAY_KO[w.weekday]}) {fmtTime(new Date(r.start_at))}
                      </span>
                      <span className="text-[12.5px] text-muted">
                        · {r.teacher_name} 선생님{r.lesson_title ? ` · ${r.lesson_title}` : ""}
                      </span>
                      {r.isNew && (
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

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={cur <= 1}
            onClick={() => setPage(cur - 1)}
            className="rounded-[8px] border border-line px-3 py-1.5 text-[12.5px] font-medium text-sub hover:bg-line-soft disabled:opacity-40"
          >
            ← 이전
          </button>
          <span className="text-[12.5px] font-semibold text-sub tabular-nums">
            {cur} / {totalPages}
          </span>
          <button
            type="button"
            disabled={cur >= totalPages}
            onClick={() => setPage(cur + 1)}
            className="rounded-[8px] border border-line px-3 py-1.5 text-[12.5px] font-medium text-sub hover:bg-line-soft disabled:opacity-40"
          >
            다음 →
          </button>
        </div>
      )}
    </>
  );
}
