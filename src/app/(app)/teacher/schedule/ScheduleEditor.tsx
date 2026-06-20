"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Chip, PageTitle } from "@/components/ui";
import Modal from "@/components/Modal";
import { WEEKDAY_KO, dayNum, fmtTimeStr } from "@/lib/time";
import type { OverrideRow, WeeklyRow } from "@/lib/data/availability";
import {
  addOverrideAction,
  addWeeklyRangeAction,
  deleteOverrideAction,
  deleteWeeklyRangeAction,
} from "./actions";

const OVERRIDE_LABEL: Record<OverrideRow["type"], string> = {
  OFF: "휴무",
  CLOSE: "휴강",
  OPEN: "오픈",
};
const OVERRIDE_TONE: Record<OverrideRow["type"], "muted" | "coral" | "success"> =
  { OFF: "muted", CLOSE: "coral", OPEN: "success" };

export default function ScheduleEditor({
  weekly,
  overrides,
}: {
  weekly: WeeklyRow[];
  overrides: OverrideRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rangeModal, setRangeModal] = useState<number | null>(null); // weekday
  const [exceptionModal, setExceptionModal] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "오류가 발생했습니다.");
      else router.refresh();
    });

  const byDay = (wd: number) =>
    weekly.filter((w) => w.weekday === wd && w.is_active);

  return (
    <>
      <PageTitle
        title="시간표 · 예외"
        desc="주간 가능 시간 + 특정 날짜 예외 = 학생에게 보이는 슬롯"
      />

      {error && (
        <p className="mb-4 rounded-[10px] bg-coral-tint px-3 py-2 text-[13px] font-medium text-coral-deep">
          {error}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.25fr_320px]">
        {/* 주간 가능 시간 */}
        <Card className="p-5">
          <h2 className="mb-3 text-[15px] font-bold">주간 가능 시간</h2>
          <div className="flex flex-col divide-y divide-line-soft">
            {WEEKDAY_KO.map((label, wd) => {
              const ranges = byDay(wd);
              return (
                <div key={wd} className="flex items-center gap-3 py-2.5">
                  <span
                    className={`w-7 text-[13.5px] font-semibold ${wd === 0 ? "text-rose" : "text-ink"}`}
                  >
                    {label}
                  </span>
                  <div className="flex flex-1 flex-wrap items-center gap-1.5">
                    {ranges.length === 0 && (
                      <span className="text-[12.5px] text-muted">휴무</span>
                    )}
                    {ranges.map((r) => (
                      <span
                        key={r.id}
                        className="inline-flex items-center gap-1 rounded-[8px] bg-coral-tint px-2 py-1 text-[12.5px] font-semibold text-coral-deep"
                      >
                        {fmtTimeStr(r.start_time)} – {fmtTimeStr(r.end_time)}
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(() => deleteWeeklyRangeAction(r.id))
                          }
                          className="ml-0.5 text-coral-deep/60 hover:text-coral-deep"
                          aria-label="삭제"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setRangeModal(wd)}
                      className="rounded-[8px] border border-dashed border-coral-border px-2 py-1 text-[12.5px] font-medium text-coral-deep hover:bg-coral-tint/40"
                    >
                      + 시간
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 예외 · 휴무 */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-bold">예외 · 휴무</h2>
            <button
              type="button"
              onClick={() => setExceptionModal(true)}
              className="rounded-[var(--radius-btn)] bg-coral px-3 py-1.5 text-[13px] font-bold text-white hover:opacity-95"
            >
              + 예외 추가
            </button>
          </div>
          {overrides.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] text-muted">
              등록된 예외가 없습니다.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {overrides.map((o) => (
                <div
                  key={o.id}
                  className="rounded-[12px] border border-line p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-bold tabular-nums">
                      {o.date.slice(5)} ({WEEKDAY_KO[new Date(o.date).getUTCDay()]})
                    </span>
                    <div className="flex items-center gap-2">
                      <Chip tone={OVERRIDE_TONE[o.type]}>
                        {OVERRIDE_LABEL[o.type]}
                      </Chip>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => deleteOverrideAction(o.id))}
                        className="text-[12px] text-muted hover:text-coral-deep"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  {o.start_time && o.end_time && (
                    <p className="mt-1 text-[12.5px] text-sub tabular-nums">
                      {fmtTimeStr(o.start_time)} – {fmtTimeStr(o.end_time)}
                    </p>
                  )}
                  {o.lesson_note && (
                    <p className="mt-0.5 text-[12px] text-muted">{o.lesson_note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <RangeModal
        weekday={rangeModal}
        pending={pending}
        onClose={() => setRangeModal(null)}
        onSubmit={(start, end) => {
          if (rangeModal == null) return;
          const wd = rangeModal;
          setRangeModal(null);
          run(() => addWeeklyRangeAction(wd, start, end));
        }}
      />

      <ExceptionModal
        open={exceptionModal}
        pending={pending}
        onClose={() => setExceptionModal(false)}
        onSubmit={(input) => {
          setExceptionModal(false);
          run(() => addOverrideAction(input));
        }}
      />
    </>
  );
}

function RangeModal({
  weekday,
  pending,
  onClose,
  onSubmit,
}: {
  weekday: number | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (start: string, end: string) => void;
}) {
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("12:00");
  return (
    <Modal
      open={weekday != null}
      onClose={onClose}
      title={`${weekday != null ? WEEKDAY_KO[weekday] : ""}요일 시간 추가`}
    >
      <div className="flex items-center gap-2">
        <TimeInput value={start} onChange={setStart} />
        <span className="text-muted">–</span>
        <TimeInput value={end} onChange={setEnd} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <CancelBtn onClick={onClose} />
        <button
          type="button"
          disabled={pending}
          onClick={() => onSubmit(start, end)}
          className="h-10 rounded-[var(--radius-btn)] bg-coral px-4 text-[14px] font-bold text-white disabled:opacity-60"
        >
          추가
        </button>
      </div>
    </Modal>
  );
}

function ExceptionModal({
  open,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: {
    date: string;
    type: "OPEN" | "OFF" | "CLOSE";
    start: string;
    end: string;
    note: string;
  }) => void;
}) {
  const [date, setDate] = useState("");
  const [type, setType] = useState<"OPEN" | "OFF" | "CLOSE">("OFF");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("12:00");
  const [note, setNote] = useState("");
  const needTime = type !== "OFF";

  return (
    <Modal open={open} onClose={onClose} title="예외 추가">
      <div className="flex flex-col gap-3">
        <label className="text-[13px] font-semibold text-sub">
          날짜
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-10 w-full rounded-[10px] border-[1.5px] border-line px-3 text-[14px] outline-none focus:border-coral"
          />
        </label>
        <label className="text-[13px] font-semibold text-sub">
          종류
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="mt-1 h-10 w-full rounded-[10px] border-[1.5px] border-line bg-surface px-3 text-[14px] outline-none focus:border-coral"
          >
            <option value="OFF">휴무 (전일)</option>
            <option value="CLOSE">휴강 (부분 시간)</option>
            <option value="OPEN">오픈 (일회용 추가)</option>
          </select>
        </label>
        {needTime && (
          <div className="flex items-center gap-2">
            <TimeInput value={start} onChange={setStart} />
            <span className="text-muted">–</span>
            <TimeInput value={end} onChange={setEnd} />
          </div>
        )}
        <label className="text-[13px] font-semibold text-sub">
          메모 (선택)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 개인 사정"
            className="mt-1 h-10 w-full rounded-[10px] border-[1.5px] border-line px-3 text-[14px] outline-none focus:border-coral"
          />
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <CancelBtn onClick={onClose} />
        <button
          type="button"
          disabled={pending || !date}
          onClick={() => onSubmit({ date, type, start, end, note })}
          className="h-10 rounded-[var(--radius-btn)] bg-coral px-4 text-[14px] font-bold text-white disabled:opacity-60"
        >
          추가
        </button>
      </div>
    </Modal>
  );
}

function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-[10px] border-[1.5px] border-line px-3 text-[14px] tabular-nums outline-none focus:border-coral"
    />
  );
}

function CancelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-[var(--radius-btn)] border border-line px-4 text-[14px] font-medium text-sub hover:bg-line-soft"
    >
      취소
    </button>
  );
}
