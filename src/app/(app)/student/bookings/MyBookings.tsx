"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Chip, EmptyState, PageTitle } from "@/components/ui";
import type { BookingStatus } from "@/lib/data/bookings";
import { WEEKDAY_KO, fmtTime, kstWall } from "@/lib/time";
import { cancelMyBookingAction, cancelMySeriesAction } from "../actions";

export type UIBooking = {
  id: string;
  start_at: string;
  duration_min: number;
  status: BookingStatus;
  teacher_name: string;
  lesson_title: string | null;
  seriesId: string | null;
  canCancel: boolean;
  deadlineISO: string;
};

const PAGE_SIZE = 15;
const mKey = (iso: string) => {
  const w = kstWall(new Date(iso));
  return `${w.y}-${String(w.mo + 1).padStart(2, "0")}`;
};
const mLabel = (key: string) => key.replace("-", ". ");

function groupByMonth(items: UIBooking[]): [string, UIBooking[]][] {
  const map = new Map<string, UIBooking[]>();
  for (const b of items) {
    const key = mLabel(mKey(b.start_at));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(b);
  }
  return [...map.entries()];
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "대기",
  BOOKED: "확정",
  COMPLETED: "완료",
  NO_SHOW: "노쇼",
  CANCELED: "취소됨",
};

export default function MyBookings({
  upcoming,
  past,
}: {
  upcoming: UIBooking[];
  past: UIBooking[];
}) {
  const [month, setMonth] = useState("all");
  const [page, setPage] = useState(1);
  const months = [...new Set(past.map((b) => mKey(b.start_at)))].sort((a, b) =>
    b.localeCompare(a),
  );
  const pastFiltered =
    month === "all" ? past : past.filter((b) => mKey(b.start_at) === month);
  const totalPages = Math.max(1, Math.ceil(pastFiltered.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const pastSlice = pastFiltered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  return (
    <>
      <PageTitle
        title="내 예약"
        right={
          <span className="rounded-full bg-line-soft px-3 py-1 text-[12px] font-semibold text-sub">
            취소는 수업 48시간 전까지
          </span>
        }
      />

      <h2 className="mb-2 mt-2 text-[15px] font-bold">
        다가오는 예약{" "}
        <span className="text-muted">({upcoming.length})</span>
      </h2>
      {upcoming.length === 0 ? (
        <EmptyState>다가오는 예약이 없습니다.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {upcoming.map((b) => (
            <BookingCard key={b.id} b={b} />
          ))}
        </div>
      )}

      <div className="mb-2 mt-7 flex flex-wrap items-center gap-2">
        <h2 className="text-[15px] font-bold">
          지난 수업 <span className="text-muted">({past.length})</span>
        </h2>
        {months.length > 0 && (
          <select
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setPage(1);
            }}
            className="ml-auto h-9 rounded-[10px] border-[1.5px] border-line bg-surface px-3 text-[13px] font-medium outline-none focus:border-coral"
          >
            <option value="all">전체</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {mLabel(m)}
              </option>
            ))}
          </select>
        )}
      </div>
      {pastFiltered.length === 0 ? (
        <EmptyState>지난 수업이 없습니다.</EmptyState>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {groupByMonth(pastSlice).map(([m, list]) => (
              <div key={m}>
                <p className="mb-2 text-[13px] font-bold text-sub tabular-nums">{m}</p>
                <div className="flex flex-col gap-2.5">
                  {list.map((b) => (
                    <BookingCard key={b.id} b={b} past />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-2">
              <PgBtn disabled={cur <= 1} onClick={() => setPage(cur - 1)}>← 이전</PgBtn>
              <span className="text-[12.5px] font-semibold text-sub tabular-nums">
                {cur} / {totalPages}
              </span>
              <PgBtn disabled={cur >= totalPages} onClick={() => setPage(cur + 1)}>다음 →</PgBtn>
            </div>
          )}
        </>
      )}
    </>
  );
}

function PgBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-[8px] border border-line px-3 py-1.5 text-[12.5px] font-medium text-sub hover:bg-line-soft disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function BookingCard({ b, past }: { b: UIBooking; past?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const w = kstWall(new Date(b.start_at));
  const dl = kstWall(new Date(b.deadlineISO));

  const cancel = () =>
    startTransition(async () => {
      setError(null);
      const res = await cancelMyBookingAction(b.id);
      if (!res.ok) setError(res.error ?? "취소 실패");
      else router.refresh();
    });

  const cancelSeries = () =>
    startTransition(async () => {
      setError(null);
      const res = await cancelMySeriesAction(b.seriesId!);
      if (!res.ok) setError(res.error ?? "취소 실패");
      else router.refresh();
    });

  const statusTone =
    b.status === "BOOKED"
      ? "rose"
      : b.status === "COMPLETED"
        ? "success"
        : b.status === "CANCELED" || b.status === "NO_SHOW"
          ? "coral"
          : "neutral";

  return (
    <div
      className={`flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4 sm:flex-row sm:items-center ${past ? "opacity-75" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-3 sm:flex-1 sm:gap-4">
        {/* 날짜 블록 */}
        <div className="w-11 shrink-0 text-center">
          <div className={`text-[12px] font-bold ${w.weekday === 0 ? "text-rose" : "text-sub"}`}>
            {WEEKDAY_KO[w.weekday]}
          </div>
          <div className="text-[21px] font-extrabold tabular-nums">{w.d}</div>
        </div>
        <div className="h-10 w-px bg-line-soft" />
        {/* 시간 */}
        <div className="shrink-0 text-[22px] font-extrabold text-coral-deep tabular-nums">
          {fmtTime(new Date(b.start_at))}
        </div>
        {/* 정보 */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">
            {b.teacher_name} 선생님{b.lesson_title ? ` · ${b.lesson_title}` : ""}
          </p>
          {!past && b.status === "BOOKED" && (
            <p className="mt-0.5 text-[12px] text-sub">
              {b.canCancel ? (
                <>
                  {dl.mo + 1}.{dl.d} {String(dl.h).padStart(2, "0")}:
                  {String(dl.mi).padStart(2, "0")}까지 취소 가능
                </>
              ) : (
                <span className="font-semibold text-coral-deep">⚠ 취소 마감 지남</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* 상태 + 취소 */}
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {b.seriesId && <Chip tone="coral">반복</Chip>}
        <Chip tone={statusTone}>{STATUS_LABEL[b.status]}</Chip>
        {!past && b.status === "BOOKED" && (
          <>
            <button
              type="button"
              disabled={pending || !b.canCancel}
              onClick={cancel}
              className="rounded-[var(--radius-btn)] border border-line px-3 py-2 text-[13px] font-medium text-sub enabled:hover:bg-line-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              {b.canCancel ? "예약 취소" : "취소 마감"}
            </button>
            {b.seriesId && (
              <button
                type="button"
                disabled={pending}
                onClick={cancelSeries}
                className="rounded-[var(--radius-btn)] border border-line px-3 py-2 text-[13px] font-medium text-coral-deep enabled:hover:bg-coral-tint/40 disabled:opacity-50"
              >
                반복 취소
              </button>
            )}
          </>
        )}
      </div>
      {error && <p className="w-full text-[12px] text-coral-deep">{error}</p>}
    </div>
  );
}
