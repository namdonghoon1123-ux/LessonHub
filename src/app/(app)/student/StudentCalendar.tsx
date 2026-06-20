"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { Avatar, PageTitle } from "@/components/ui";
import type { DaySlots, Slot } from "@/lib/slots";
import { WEEKDAY_KO, addDaysStr, dayNum } from "@/lib/time";
import { bookSlotAction } from "./actions";

export default function StudentCalendar({
  teacherId,
  teacherName,
  subject,
  cancelCutoffHours,
  weekStart,
  today,
  days,
}: {
  teacherId: string;
  teacherName: string;
  subject: string | null;
  cancelCutoffHours: number;
  weekStart: string;
  today: string;
  days: DaySlots[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaultDay =
    days.find((d) => d.date === today && !d.isPast)?.date ??
    days.find((d) => !d.isPast)?.date ??
    days[0].date;
  const [selected, setSelected] = useState(defaultDay);
  const selectedDay = days.find((d) => d.date === selected) ?? days[0];

  const prevWeek = addDaysStr(weekStart, -7);
  const nextWeek = addDaysStr(weekStart, 7);

  const openSlot = (s: Slot) => {
    setError(null);
    setTarget(s);
  };

  const confirmBook = () => {
    if (!target) return;
    startTransition(async () => {
      setError(null);
      const res = await bookSlotAction(teacherId, target.startAtISO);
      if (!res.ok) setError(res.error ?? "예약에 실패했습니다.");
      else {
        setTarget(null);
        router.refresh();
      }
    });
  };

  return (
    <>
      <PageTitle
        title="예약하기"
        right={
          <div className="flex items-center gap-1.5">
            <WeekNav href={`/student?week=${prevWeek}`}>←</WeekNav>
            <span className="px-1 text-[12.5px] font-semibold text-sub tabular-nums">
              {weekStart.slice(5)} ~ {addDaysStr(weekStart, 6).slice(5)}
            </span>
            <WeekNav href={`/student?week=${nextWeek}`}>→</WeekNav>
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <Avatar name={teacherName} size={44} />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-bold">
            {teacherName} 선생님{subject ? ` · ${subject}` : ""}
          </p>
          <p className="text-[12.5px] text-muted">🕓 Asia/Seoul · KST</p>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-[10px] bg-coral-tint px-3 py-2 text-[13px] font-medium text-coral-deep">
          {error}
        </p>
      )}

      {/* ── 모바일: day-strip + 슬롯 리스트 ── */}
      <div className="lg:hidden">
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {days.map((d) => {
            const isSel = d.date === selected;
            return (
              <button
                key={d.date}
                type="button"
                onClick={() => setSelected(d.date)}
                className={
                  "flex min-w-[52px] shrink-0 flex-col items-center rounded-[12px] border px-2 py-2 " +
                  (isSel
                    ? "border-coral bg-coral text-white"
                    : d.date === today
                      ? "border-coral-border bg-surface"
                      : "border-line bg-surface")
                }
              >
                <span
                  className={`text-[11px] font-semibold ${isSel ? "text-white/90" : d.weekday === 0 ? "text-rose" : "text-muted"}`}
                >
                  {WEEKDAY_KO[d.weekday]}
                </span>
                <span className="text-[18px] font-bold tabular-nums">
                  {dayNum(d.date)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          {selectedDay.isPast ? (
            <Centered>지난 날짜입니다.</Centered>
          ) : selectedDay.isOff ? (
            <Centered>이 날은 휴무입니다.</Centered>
          ) : selectedDay.slots.length === 0 ? (
            <Centered>예약 가능한 시간이 없어요.</Centered>
          ) : (
            selectedDay.slots.map((s) => (
              <SlotRow key={s.startAtISO} slot={s} onBook={() => openSlot(s)} />
            ))
          )}
        </div>
      </div>

      {/* ── 데스크톱: 7열 그리드 ── */}
      <div className="hidden grid-cols-7 gap-2 lg:grid">
        {days.map((day) => {
          const isToday = day.date === today;
          return (
            <div
              key={day.date}
              className={
                "flex min-h-[140px] flex-col rounded-[var(--radius-card)] border bg-surface " +
                (isToday
                  ? "border-coral-border shadow-[0_0_0_3px_var(--color-coral-tint)]"
                  : "border-line")
              }
            >
              <div
                className={
                  "rounded-t-[var(--radius-card)] px-2.5 py-2 " +
                  (isToday ? "bg-coral-tint" : "")
                }
              >
                <div
                  className={`text-[12px] font-semibold ${day.weekday === 0 ? "text-rose" : "text-sub"}`}
                >
                  {WEEKDAY_KO[day.weekday]}
                </div>
                <div
                  className={`text-[19px] font-bold tabular-nums ${isToday ? "text-coral-deep" : ""}`}
                >
                  {dayNum(day.date)}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-2">
                {day.isPast ? (
                  <Centered>지난 날짜</Centered>
                ) : day.isOff ? (
                  <Centered>휴무</Centered>
                ) : day.slots.length === 0 ? (
                  <Centered>없음</Centered>
                ) : (
                  day.slots.map((s) => (
                    <SlotChip key={s.startAtISO} slot={s} onBook={() => openSlot(s)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 범례 + 취소정책 */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[12px] text-sub">
        <div className="flex flex-wrap items-center gap-3">
          <Legend className="border-[1.5px] border-coral-border bg-surface" />
          <span>예약 가능</span>
          <Legend className="bg-rose" />
          <span>내 예약</span>
          <Legend className="bg-line-soft" />
          <span>마감</span>
        </div>
        <span className="text-muted">
          취소는 수업 <b className="text-coral-deep">{cancelCutoffHours}시간 전</b>까지
        </span>
      </div>

      <Modal open={target != null} onClose={() => setTarget(null)} title="예약 확인">
        {target && (
          <div className="text-[14px]">
            <Row label="선생님" value={`${teacherName} 선생님`} />
            <Row label="시간" value={target.time} />
            <Row label="취소 정책" value={`수업 ${cancelCutoffHours}시간 전까지`} />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTarget(null)}
                className="h-11 rounded-[var(--radius-btn)] border border-line px-4 text-[14px] font-medium text-sub hover:bg-line-soft"
              >
                취소
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirmBook}
                className="h-11 rounded-[var(--radius-btn)] bg-coral px-5 text-[14px] font-bold text-white disabled:opacity-60"
              >
                {pending ? "예약 중…" : "예약 확정"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// 모바일 큰 터치 행 (≥52px)
function SlotRow({ slot, onBook }: { slot: Slot; onBook: () => void }) {
  if (slot.status === "open")
    return (
      <button
        type="button"
        onClick={onBook}
        className="flex h-[52px] items-center justify-between rounded-[13px] border-[1.5px] border-coral-border bg-surface px-4 text-left active:bg-coral-tint/40"
      >
        <span className="text-[17px] font-bold text-coral-deep tabular-nums">
          {slot.time}
        </span>
        <span className="text-[13px] font-semibold text-coral-deep">
          예약 가능 ›
        </span>
      </button>
    );
  if (slot.status === "mine")
    return (
      <div className="flex h-[52px] items-center justify-between rounded-[13px] bg-rose px-4 text-white">
        <span className="text-[17px] font-bold tabular-nums">{slot.time}</span>
        <span className="text-[13px] font-semibold">내 예약</span>
      </div>
    );
  if (slot.status === "full")
    return (
      <div className="flex h-[52px] items-center justify-between rounded-[13px] bg-line-soft px-4 opacity-70">
        <span className="text-[17px] font-bold text-muted tabular-nums">
          {slot.time}
        </span>
        <span className="text-[13px] font-semibold text-muted">마감</span>
      </div>
    );
  return (
    <div className="flex h-[44px] items-center px-4">
      <span className="text-[15px] text-[#D8C8C0] line-through tabular-nums">
        {slot.time}
      </span>
    </div>
  );
}

// 데스크톱 칩
function SlotChip({ slot, onBook }: { slot: Slot; onBook: () => void }) {
  if (slot.status === "open")
    return (
      <button
        type="button"
        onClick={onBook}
        className="rounded-[7px] border-[1.5px] border-coral-border bg-surface py-1 text-[13px] font-bold text-coral-deep tabular-nums transition-colors hover:bg-coral-tint/40"
      >
        {slot.time}
      </button>
    );
  if (slot.status === "mine")
    return (
      <span className="rounded-[7px] bg-rose py-1 text-center text-[12.5px] font-bold text-white tabular-nums">
        {slot.time} · 내 예약
      </span>
    );
  if (slot.status === "full")
    return (
      <span className="rounded-[7px] bg-line-soft py-1 text-center text-[12px] font-semibold text-muted tabular-nums">
        {slot.time} · 마감
      </span>
    );
  return (
    <span className="py-1 text-center text-[12px] text-[#D8C8C0] line-through tabular-nums">
      {slot.time}
    </span>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center py-6 text-center text-[12.5px] text-muted">
      {children}
    </div>
  );
}

function WeekNav({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="grid h-9 w-9 place-items-center rounded-[8px] border border-line text-sub hover:bg-line-soft"
    >
      {children}
    </Link>
  );
}

function Legend({ className }: { className: string }) {
  return <span className={`inline-block h-4 w-7 rounded-[5px] ${className}`} />;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line-soft py-2 last:border-0">
      <span className="text-sub">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
