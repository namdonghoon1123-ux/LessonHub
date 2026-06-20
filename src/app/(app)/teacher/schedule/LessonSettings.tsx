"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { updateLessonSettingsAction } from "../actions";

export default function LessonSettings({
  durationMin,
  cancelCutoffHours,
  bookingWindowDays,
  shareTemplate,
  cancelNotice,
}: {
  durationMin: number;
  cancelCutoffHours: number;
  bookingWindowDays: number;
  shareTemplate: string;
  cancelNotice: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [duration, setDuration] = useState(durationMin);
  const [cutoff, setCutoff] = useState(cancelCutoffHours);
  const [windowDays, setWindowDays] = useState(bookingWindowDays);
  const [template, setTemplate] = useState(shareTemplate);
  const [notice, setNotice] = useState(cancelNotice);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    duration !== durationMin ||
    cutoff !== cancelCutoffHours ||
    windowDays !== bookingWindowDays ||
    template !== shareTemplate ||
    notice !== cancelNotice;

  const save = () =>
    startTransition(async () => {
      setError(null);
      setSaved(false);
      const res = await updateLessonSettingsAction({
        lessonDurationMin: duration,
        cancelCutoffHours: cutoff,
        bookingWindowDays: windowDays,
        shareTemplate: template,
        cancelNotice: notice,
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

      <label className="mt-4 block text-[13px] font-semibold text-sub">
        공유 문구 (예약 잡고 학생에게 링크 보낼 때 자동 복사됨)
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={2}
          placeholder="예: 안녕하세요! 아래 시간으로 레슨 예약했어요~ 링크 참고 부탁드립니다 :)"
          className="mt-1 w-full rounded-[10px] border-[1.5px] border-line px-3 py-2 text-[14px] outline-none focus:border-coral"
        />
        <span className="mt-1 block font-normal text-muted">
          날짜·시간·링크는 복사할 때 자동으로 아래에 붙어요. (특정 위치에 넣고 싶으면 {"{날짜}"} {"{시간}"} 를 적으세요)
        </span>
      </label>

      <label className="mt-4 block text-[13px] font-semibold text-sub">
        취소 안내 문구 (학생이 예약 취소할 때 보여줄 안내)
        <textarea
          value={notice}
          onChange={(e) => setNotice(e.target.value)}
          rows={2}
          placeholder="예: 연습실 취소 수수료가 있어요. 48시간 이전에 취소 부탁드립니다 ㅠㅠ"
          className="mt-1 w-full rounded-[10px] border-[1.5px] border-line px-3 py-2 text-[14px] outline-none focus:border-coral"
        />
      </label>

      {saved && !dirty && (
        <p className="mt-2 text-[12.5px] font-medium text-success">저장되었습니다.</p>
      )}
      {error && <p className="mt-2 text-[12.5px] text-coral-deep">{error}</p>}
    </Card>
  );
}
