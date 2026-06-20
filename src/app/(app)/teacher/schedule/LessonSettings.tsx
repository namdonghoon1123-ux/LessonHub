"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { updateLessonSettingsAction } from "../actions";

export default function LessonSettings({
  durationMin,
  cancelCutoffHours,
  bookingWindowDays,
}: {
  durationMin: number;
  cancelCutoffHours: number;
  bookingWindowDays: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [duration, setDuration] = useState(durationMin);
  const [cutoff, setCutoff] = useState(cancelCutoffHours);
  const [windowDays, setWindowDays] = useState(bookingWindowDays);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    duration !== durationMin ||
    cutoff !== cancelCutoffHours ||
    windowDays !== bookingWindowDays;

  const save = () =>
    startTransition(async () => {
      setError(null);
      setSaved(false);
      const res = await updateLessonSettingsAction({
        lessonDurationMin: duration,
        cancelCutoffHours: cutoff,
        bookingWindowDays: windowDays,
      });
      if (!res.ok) setError(res.error ?? "저장 실패");
      else {
        setSaved(true);
        router.refresh();
      }
    });

  return (
    <Card className="mb-5 p-5">
      <h2 className="mb-3 text-[15px] font-bold">레슨 설정</h2>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-[13px] font-semibold text-sub">
          레슨 길이
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 h-10 w-full rounded-[10px] border-[1.5px] border-line bg-surface px-3 text-[14px] outline-none focus:border-coral"
          >
            {[30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m}분{m === 60 ? " (기본)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-[13px] font-semibold text-sub">
          취소 마감(시작 N시간 전)
          <input
            type="number"
            min={0}
            value={cutoff}
            onChange={(e) => setCutoff(Number(e.target.value))}
            className="mt-1 h-10 w-full rounded-[10px] border-[1.5px] border-line px-3 text-[14px] tabular-nums outline-none focus:border-coral"
          />
        </label>
        <label className="flex-1 text-[13px] font-semibold text-sub">
          예약 가능 기간(일)
          <input
            type="number"
            min={1}
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="mt-1 h-10 w-full rounded-[10px] border-[1.5px] border-line px-3 text-[14px] tabular-nums outline-none focus:border-coral"
          />
        </label>
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={save}
          className="h-10 shrink-0 rounded-[var(--radius-btn)] bg-coral px-5 text-[14px] font-bold text-white disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
      {saved && !dirty && (
        <p className="mt-2 text-[12.5px] font-medium text-success">저장되었습니다.</p>
      )}
      {error && <p className="mt-2 text-[12.5px] text-coral-deep">{error}</p>}
    </Card>
  );
}
