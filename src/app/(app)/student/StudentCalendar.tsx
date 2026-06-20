"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { Avatar, PageTitle } from "@/components/ui";
import type { DaySlots, Slot } from "@/lib/slots";
import { WEEKDAY_KO, addDaysStr, dayNum } from "@/lib/time";
import { holidayName } from "@/lib/holidays";
import { bookRecurringAction, bookSlotAction } from "./actions";

const pad = (n: number) => String(n).padStart(2, "0");
function addMonths(ym1: string, delta: number): string {
  const [y, m] = ym1.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`;
}

export default function StudentCalendar({
  teacherId,
  teacherName,
  subject,
  durationMin,
  cancelCutoffHours,
  view,
  periodStart,
  today,
  days,
}: {
  teacherId: string;
  teacherName: string;
  subject: string | null;
  durationMin: number;
  cancelCutoffHours: number;
  view: "week" | "month";
  periodStart: string;
  today: string;
  days: DaySlots[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [repeat, setRepeat] = useState(1);
  const [note, setNote] = useState("");

  const month = periodStart.slice(0, 7);
  const defaultDay =
    days.find((d) => d.date === today && !d.isPast)?.date ??
    days.find((d) => !d.isPast && (view === "week" || d.date.slice(0, 7) === month))?.date ??
    days[0].date;
  const [selected, setSelected] = useState(defaultDay);
  const selectedDay = days.find((d) => d.date === selected) ?? days[0];

  const prev = view === "month" ? addMonths(periodStart, -1) : addDaysStr(periodStart, -7);
  const next = view === "month" ? addMonths(periodStart, 1) : addDaysStr(periodStart, 7);
  const label =
    view === "month"
      ? `${month.replace("-", ". ")}`
      : `${periodStart.slice(5)} ~ ${addDaysStr(periodStart, 6).slice(5)}`;

  const openSlot = (s: Slot) => {
    setError(null);
    setNotice(null);
    setRepeat(1);
    setNote("");
    setTarget(s);
  };

  const confirmBook = () => {
    if (!target) return;
    const slot = target;
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const res =
        repeat > 1
          ? await bookRecurringAction(teacherId, slot.startAtISO, repeat, note)
          : await bookSlotAction(teacherId, slot.startAtISO, note);
      if (!res.ok) {
        setError(res.error ?? "예약에 실패했습니다.");
        router.refresh();
      } else {
        setTarget(null);
        if (res.requested && res.created !== undefined && res.created < res.requested)
          setNotice(`반복 ${res.requested}회 중 ${res.created}회 예약됨 (나머지는 불가능한 시간이라 제외).`);
        else if (res.requested) setNotice(`매주 ${res.created}회 반복 예약 완료.`);
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
            <ViewToggle view={view} />
            <WeekNav href={`/student?view=${view}&period=${prev}`}>←</WeekNav>
            <span className="px-1 text-[12.5px] font-semibold text-sub tabular-nums">{label}</span>
            <WeekNav href={`/student?view=${view}&period=${next}`}>→</WeekNav>
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <Avatar name={teacherName} size={44} />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-bold">
            {teacherName} 선생님{subject ? ` · ${subject}` : ""}
          </p>
          <p className="text-[12.5px] text-muted">
            🕓 Asia/Seoul · KST · <b className="text-coral-deep">레슨 {durationMin}분</b>
          </p>
        </div>
      </div>

      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="ok">{notice}</Banner>}

      {view === "month" ? (
        <MonthGrid
          days={days}
          month={month}
          today={today}
          selected={selected}
          onSelect={setSelected}
        />
      ) : (
        <WeekStrip
          days={days}
          today={today}
          selected={selected}
          onSelect={setSelected}
        />
      )}

      {/* 선택 날짜 슬롯 리스트 (월간 + 모바일 주간 공통) */}
      <div className={view === "month" ? "mt-4" : "mt-3 lg:hidden"}>
        <p className="mb-2 text-[13px] font-bold text-sub tabular-nums">
          {selectedDay.date.slice(5).replace("-", ". ")} ({WEEKDAY_KO[selectedDay.weekday]})
          {holidayName(selectedDay.date) && (
            <span className="ml-1.5 font-semibold text-rose">· {holidayName(selectedDay.date)}</span>
          )}
        </p>
        <DaySlotList day={selectedDay} onBook={openSlot} />
      </div>

      {/* 데스크톱 주간 7열 그리드 */}
      {view === "week" && (
        <div className="mt-4 hidden grid-cols-7 gap-2 lg:grid">
          {days.map((day) => (
            <WeekDayCard key={day.date} day={day} today={today} onBook={openSlot} />
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[12px] text-sub">
        <div className="flex flex-wrap items-center gap-3">
          <Legend className="border-[1.5px] border-coral-border bg-surface" /> <span>예약 가능</span>
          <Legend className="bg-rose" /> <span>내 예약</span>
          <Legend className="bg-line-soft" /> <span>마감</span>
        </div>
        <span className="text-muted">
          취소는 수업 <b className="text-coral-deep">{cancelCutoffHours}시간 전</b>까지
        </span>
      </div>

      <Modal open={target != null} onClose={() => setTarget(null)} title="예약 확인">
        {target && (
          <div className="text-[14px]">
            <Row label="선생님" value={`${teacherName} 선생님`} />
            <Row label="날짜" value={target.startAtISO.slice(0, 10)} />
            <Row label="시간" value={`${target.time} (${durationMin}분)`} />
            <Row label="취소 정책" value={`수업 ${cancelCutoffHours}시간 전까지`} />

            <div className="mt-3">
              <p className="mb-1.5 text-[13px] font-semibold text-sub">반복</p>
              <div className="flex gap-1.5">
                {[1, 2, 4, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRepeat(n)}
                    className={
                      "flex-1 rounded-[10px] border py-2 text-[13px] font-semibold transition-colors " +
                      (repeat === n
                        ? "border-coral bg-coral-tint text-coral-deep"
                        : "border-line text-sub hover:bg-line-soft")
                    }
                  >
                    {n === 1 ? "1회" : `매주 ${n}회`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-1.5 text-[13px] font-semibold text-sub">
                선생님께 한마디 <span className="font-normal text-muted">(선택)</span>
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="예: 10분 정도 늦을 수 있어요"
                className="w-full rounded-[10px] border-[1.5px] border-line px-3 py-2 text-[14px] outline-none focus:border-coral"
              />
            </div>

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

function MonthGrid({
  days,
  month,
  today,
  selected,
  onSelect,
}: {
  days: DaySlots[];
  month: string;
  today: string;
  selected: string;
  onSelect: (d: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line">
      <div className="grid grid-cols-7 bg-line-soft">
        {WEEKDAY_KO.map((w, i) => (
          <div
            key={w}
            className={`py-1.5 text-center text-[11.5px] font-bold ${i === 0 ? "text-rose" : "text-sub"}`}
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const inMonth = d.date.slice(0, 7) === month;
          const open = d.slots.filter((s) => s.status === "open").length;
          const mine = d.slots.some((s) => s.status === "mine");
          const isToday = d.date === today;
          const isSel = d.date === selected;
          const clickable = inMonth && !d.isPast;
          const hol = holidayName(d.date);
          return (
            <button
              key={d.date}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelect(d.date)}
              className={
                "flex min-h-[58px] flex-col items-center gap-0.5 border-b border-r border-line-soft p-1 text-center sm:min-h-[72px] " +
                (isSel ? "bg-coral-tint " : "") +
                (clickable ? "hover:bg-coral-tint/40 " : "cursor-default ")
              }
            >
              <span
                className={
                  "text-[12.5px] font-bold tabular-nums " +
                  (!inMonth || d.isPast
                    ? "text-muted/50"
                    : isToday
                      ? "text-coral-deep"
                      : hol || d.weekday === 0
                        ? "text-rose"
                        : "text-ink")
                }
              >
                {dayNum(d.date)}
              </span>
              {inMonth && hol && (
                <span className="max-w-full truncate text-[9px] font-semibold text-rose">
                  {hol}
                </span>
              )}
              {inMonth && !d.isPast && (
                mine ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-rose" />
                ) : d.isOff ? (
                  <span className="text-[9.5px] text-muted">휴무</span>
                ) : open > 0 ? (
                  <span className="rounded-full bg-coral px-1 text-[9.5px] font-bold text-white">
                    {open}
                  </span>
                ) : null
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekStrip({
  days,
  today,
  selected,
  onSelect,
}: {
  days: DaySlots[];
  today: string;
  selected: string;
  onSelect: (d: string) => void;
}) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:hidden">
      {days.map((d) => {
        const isSel = d.date === selected;
        return (
          <button
            key={d.date}
            type="button"
            onClick={() => onSelect(d.date)}
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
            <span className="text-[18px] font-bold tabular-nums">{dayNum(d.date)}</span>
          </button>
        );
      })}
    </div>
  );
}

function DaySlotList({ day, onBook }: { day: DaySlots; onBook: (s: Slot) => void }) {
  if (day.isPast) return <Centered>지난 날짜입니다.</Centered>;
  if (day.isOff) return <Centered>이 날은 휴무입니다.</Centered>;
  const slots = day.slots.filter((s) => s.status !== "blocked");
  if (slots.length === 0) return <Centered>예약 가능한 시간이 없어요.</Centered>;
  return (
    <div className="flex flex-col gap-2">
      {slots.map((s) => (
        <SlotRow key={s.startAtISO} slot={s} onBook={() => onBook(s)} />
      ))}
    </div>
  );
}

function WeekDayCard({
  day,
  today,
  onBook,
}: {
  day: DaySlots;
  today: string;
  onBook: (s: Slot) => void;
}) {
  const isToday = day.date === today;
  return (
    <div
      className={
        "flex min-h-[140px] flex-col rounded-[var(--radius-card)] border bg-surface " +
        (isToday
          ? "border-coral-border shadow-[0_0_0_3px_var(--color-coral-tint)]"
          : "border-line")
      }
    >
      <div className={"rounded-t-[var(--radius-card)] px-2.5 py-2 " + (isToday ? "bg-coral-tint" : "")}>
        <div className={`text-[12px] font-semibold ${holidayName(day.date) || day.weekday === 0 ? "text-rose" : "text-sub"}`}>
          {WEEKDAY_KO[day.weekday]}
        </div>
        <div className={`text-[19px] font-bold tabular-nums ${isToday ? "text-coral-deep" : holidayName(day.date) ? "text-rose" : ""}`}>
          {dayNum(day.date)}
        </div>
        {holidayName(day.date) && (
          <div className="truncate text-[9.5px] font-semibold text-rose">{holidayName(day.date)}</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        {day.isPast ? (
          <Centered>지난 날짜</Centered>
        ) : day.isOff ? (
          <Centered>휴무</Centered>
        ) : (
          (() => {
            const slots = day.slots.filter((s) => s.status !== "blocked");
            if (slots.length === 0) return <Centered>없음</Centered>;
            return slots.map((s) => (
              <SlotChip key={s.startAtISO} slot={s} onBook={() => onBook(s)} />
            ));
          })()
        )}
      </div>
    </div>
  );
}

function SlotRow({ slot, onBook }: { slot: Slot; onBook: () => void }) {
  if (slot.status === "open")
    return (
      <button
        type="button"
        onClick={onBook}
        className="flex h-[52px] items-center justify-between rounded-[13px] border-[1.5px] border-coral-border bg-surface px-4 text-left active:bg-coral-tint/40"
      >
        <span className="text-[17px] font-bold text-coral-deep tabular-nums">{slot.time}</span>
        <span className="text-[13px] font-semibold text-coral-deep">예약 가능 ›</span>
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
        <span className="text-[17px] font-bold text-muted tabular-nums">{slot.time}</span>
        <span className="text-[13px] font-semibold text-muted">마감</span>
      </div>
    );
  return (
    <div className="flex h-[44px] items-center px-4">
      <span className="text-[15px] text-[#D8C8C0] line-through tabular-nums">{slot.time}</span>
    </div>
  );
}

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

function ViewToggle({ view }: { view: "week" | "month" }) {
  return (
    <div className="mr-1 flex overflow-hidden rounded-[8px] border border-line">
      <Link
        href="/student?view=week"
        className={"px-2.5 py-1 text-[12px] font-semibold " + (view === "week" ? "bg-coral text-white" : "text-sub")}
      >
        주
      </Link>
      <Link
        href="/student?view=month"
        className={"px-2.5 py-1 text-[12px] font-semibold " + (view === "month" ? "bg-coral text-white" : "text-sub")}
      >
        월
      </Link>
    </div>
  );
}

function Banner({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p
      className={
        "mb-3 rounded-[10px] px-3 py-2 text-[13px] font-medium " +
        (tone === "error" ? "bg-coral-tint text-coral-deep" : "bg-success-bg text-success")
      }
    >
      {children}
    </p>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-[12px] border border-line bg-surface py-6 text-center text-[12.5px] text-muted">
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
