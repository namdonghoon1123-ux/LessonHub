"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import { Linkify } from "@/components/Linkify";
import type { DaySlots, Slot } from "@/lib/slots";
import { WEEKDAY_KO, addDaysStr, addMinutesToTime, dayNum } from "@/lib/time";
import { holidayName } from "@/lib/holidays";
import { bookForStudentAction, quickCloseSlotAction } from "./actions";

export type SlotInfo = {
  student_name: string;
  student_note: string | null;
  status: string;
  id: string;
  share_token: string;
};

type StudentOpt = { id: string; name: string };

function fmtKDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}
function buildShareText(
  template: string,
  dateStr: string,
  timeStr: string,
  url: string,
): string {
  const base =
    (template && template.trim()) ||
    "안녕하세요! 아래 시간으로 레슨 예약했어요~ 링크 참고 부탁드립니다 :)";
  const replaced = base
    .replaceAll("{날짜}", dateStr)
    .replaceAll("{시간}", timeStr);
  return `${replaced}\n\n📅 ${dateStr} ${timeStr}\n🔗 ${url}`;
}
function shareUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/l/${token}`;
}
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const pad = (n: number) => String(n).padStart(2, "0");
function addMonths(ym1: string, delta: number): string {
  const [y, m] = ym1.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`;
}
function gcalUrl(startISO: string, durationMin: number, title: string): string {
  const s = startISO.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(new Date(startISO).getTime() + durationMin * 60000)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const p = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${s}/${end}` });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export default function TeacherCalendar({
  view,
  periodStart,
  today,
  days,
  durationMin,
  infoBySlot,
  students,
  shareTemplate,
}: {
  view: "week" | "month";
  periodStart: string;
  today: string;
  days: DaySlots[];
  durationMin: number;
  infoBySlot: Record<string, SlotInfo>;
  students: StudentOpt[];
  shareTemplate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [info, setInfo] = useState<{ slot: Slot; info: SlotInfo; date: string } | null>(null);
  const [menu, setMenu] = useState<{ slot: Slot; date: string } | null>(null);
  const [bookSid, setBookSid] = useState("");
  const [share, setShare] = useState<{ text: string; url: string } | null>(null);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState<string | null>(null);

  const month = periodStart.slice(0, 7);
  const defaultDay =
    days.find((d) => d.date === today)?.date ??
    days.find((d) => view === "week" || d.date.slice(0, 7) === month)?.date ??
    days[0].date;
  const [selected, setSelected] = useState(defaultDay);
  const selectedDay = days.find((d) => d.date === selected) ?? days[0];

  const prev = view === "month" ? addMonths(periodStart, -1) : addDaysStr(periodStart, -7);
  const next = view === "month" ? addMonths(periodStart, 1) : addDaysStr(periodStart, 7);
  const label =
    view === "month"
      ? month.replace("-", ". ")
      : `${periodStart.slice(5)} ~ ${addDaysStr(periodStart, 6).slice(5)}`;

  const onSlot = (s: Slot, date: string) => {
    const i = infoBySlot[s.startAtISO];
    if (i) setInfo({ slot: s, info: i, date });
    else if (s.status === "open") {
      setBookSid(students[0]?.id ?? "");
      setError(null);
      setMenu({ slot: s, date });
    }
  };

  // 빈 슬롯 → 학생 예약 잡기 → 공유 모달
  const bookForStudent = () => {
    if (!menu || !bookSid) return;
    const { slot: s, date } = menu;
    startTransition(async () => {
      setError(null);
      const res = await bookForStudentAction(bookSid, s.startAtISO);
      if (!res.ok || !res.shareToken) {
        setError(res.error ?? "예약 실패");
        return;
      }
      const url = shareUrl(res.shareToken);
      setMenu(null);
      setCopied("");
      setShare({
        url,
        text: buildShareText(shareTemplate, fmtKDate(date), s.time, url),
      });
      router.refresh();
    });
  };

  const closeSlot = () => {
    if (!menu) return;
    const { slot: s, date } = menu;
    startTransition(async () => {
      setError(null);
      const res = await quickCloseSlotAction(date, s.time, addMinutesToTime(s.time, durationMin));
      if (!res.ok) setError(res.error ?? "처리 실패");
      else {
        setMenu(null);
        router.refresh();
      }
    });
  };

  // 예약 정보 모달에서 링크 복사
  const copyInfoShare = async () => {
    if (!info) return;
    const url = shareUrl(info.info.share_token);
    const text = buildShareText(shareTemplate, fmtKDate(info.date), info.slot.time, url);
    setCopied((await copy(text)) ? "info" : "");
  };

  return (
    <>
      <div className="mb-3 flex items-center justify-end gap-1.5">
        <ViewToggle view={view} />
        <Nav href={`/teacher?view=${view}&period=${prev}`}>←</Nav>
        <span className="px-1 text-[12.5px] font-semibold text-sub tabular-nums">{label}</span>
        <Nav href={`/teacher?view=${view}&period=${next}`}>→</Nav>
      </div>

      {error && (
        <p className="mb-3 rounded-[10px] bg-coral-tint px-3 py-2 text-[13px] font-medium text-coral-deep">
          {error}
        </p>
      )}

      {view === "month" ? (
        <MonthGrid days={days} month={month} today={today} selected={selected} onSelect={setSelected} infoBySlot={infoBySlot} />
      ) : (
        <WeekStrip days={days} today={today} selected={selected} onSelect={setSelected} />
      )}

      <div className={view === "month" ? "mt-4" : "mt-3 lg:hidden"}>
        <p className="mb-2 text-[13px] font-bold text-sub tabular-nums">
          {selectedDay.date.slice(5).replace("-", ". ")} ({WEEKDAY_KO[selectedDay.weekday]})
          {holidayName(selectedDay.date) && (
            <span className="ml-1.5 font-semibold text-rose">· {holidayName(selectedDay.date)}</span>
          )}
        </p>
        <DayList day={selectedDay} infoBySlot={infoBySlot} onSlot={onSlot} />
      </div>

      {view === "week" && (
        <div className="mt-4 hidden grid-cols-7 gap-2 lg:grid">
          {days.map((d) => (
            <WeekDayCard key={d.date} day={d} today={today} infoBySlot={infoBySlot} onSlot={onSlot} />
          ))}
        </div>
      )}

      <p className="mt-4 text-[12px] text-muted">
        빈 시간을 누르면 <b>학생 예약을 잡거나 휴강</b>, 예약된 시간을 누르면 <b>정보·공유</b>.
      </p>

      {/* 예약 정보 모달 */}
      <Modal open={info != null} onClose={() => setInfo(null)} title="예약 정보">
        {info && (
          <div className="text-[14px]">
            <Row label="학생" value={info.info.student_name} />
            <Row label="시간" value={`${info.date} ${info.slot.time}`} />
            <Row label="상태" value={info.info.status} />
            {info.info.student_note && (
              <div className="border-b border-line-soft py-2">
                <p className="text-sub">학생 메모</p>
                <p className="mt-1 font-medium text-coral-deep">
                  <Linkify text={info.info.student_note} />
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={copyInfoShare}
              className="mt-4 grid h-11 w-full place-items-center rounded-[var(--radius-btn)] bg-coral text-[14px] font-bold text-white hover:opacity-95"
            >
              {copied === "info" ? "복사됨! 학생에게 붙여넣기" : "📋 레슨 링크·문구 복사"}
            </button>
            <a
              href={gcalUrl(info.slot.startAtISO, durationMin, `${info.info.student_name} 레슨`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 grid h-10 w-full place-items-center rounded-[var(--radius-btn)] border border-line text-[13.5px] font-semibold text-sub hover:bg-line-soft"
            >
              구글 캘린더에 추가
            </a>
          </div>
        )}
      </Modal>

      {/* 빈 슬롯: 학생 예약 잡기 / 휴강 */}
      <Modal
        open={menu != null}
        onClose={() => setMenu(null)}
        title={menu ? `${menu.date} ${menu.slot.time}` : ""}
      >
        {menu && (
          <div className="text-[14px]">
            <p className="mb-1.5 text-[13px] font-semibold text-sub">학생 예약 잡기</p>
            {students.length === 0 ? (
              <p className="text-[13px] text-muted">연결된 학생이 없습니다.</p>
            ) : (
              <div className="flex gap-2">
                <select
                  value={bookSid}
                  onChange={(e) => setBookSid(e.target.value)}
                  className="h-11 flex-1 rounded-[10px] border-[1.5px] border-line bg-surface px-3 text-[14px] outline-none focus:border-coral"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={pending || !bookSid}
                  onClick={bookForStudent}
                  className="h-11 shrink-0 rounded-[var(--radius-btn)] bg-coral px-5 text-[14px] font-bold text-white disabled:opacity-60"
                >
                  예약 잡기
                </button>
              </div>
            )}
            {error && <p className="mt-2 text-[12.5px] text-coral-deep">{error}</p>}

            <div className="my-4 h-px bg-line-soft" />
            <button
              type="button"
              disabled={pending}
              onClick={closeSlot}
              className="h-10 w-full rounded-[var(--radius-btn)] border border-line text-[14px] font-medium text-sub hover:bg-line-soft disabled:opacity-60"
            >
              이 시간 휴강 처리
            </button>
          </div>
        )}
      </Modal>

      {/* 예약 후 공유 모달 */}
      <Modal
        open={share != null}
        onClose={() => setShare(null)}
        title="예약 완료 · 학생에게 공유"
      >
        {share && (
          <div className="text-[14px]">
            <p className="mb-2 text-[13px] text-sub">
              아래 문구를 복사해 학생에게 보내세요. 학생이 링크를 누르면 바로 본인 예약이 보여요.
            </p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-[10px] bg-line-soft p-3 text-[13px] text-ink">
              {share.text}
            </pre>
            <button
              type="button"
              onClick={async () => setCopied((await copy(share.text)) ? "share" : "")}
              className="mt-3 grid h-11 w-full place-items-center rounded-[var(--radius-btn)] bg-coral text-[14px] font-bold text-white hover:opacity-95"
            >
              {copied === "share" ? "복사됨!" : "📋 문구 전체 복사"}
            </button>
            <button
              type="button"
              onClick={async () => setCopied((await copy(share.url)) ? "url" : "")}
              className="mt-2 grid h-10 w-full place-items-center rounded-[var(--radius-btn)] border border-line text-[13.5px] font-semibold text-sub hover:bg-line-soft"
            >
              {copied === "url" ? "링크 복사됨!" : "링크만 복사"}
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}

function MonthGrid({
  days, month, today, selected, onSelect, infoBySlot,
}: {
  days: DaySlots[]; month: string; today: string; selected: string;
  onSelect: (d: string) => void; infoBySlot: Record<string, SlotInfo>;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-line">
      <div className="grid grid-cols-7 bg-line-soft">
        {WEEKDAY_KO.map((w, i) => (
          <div key={w} className={`py-1.5 text-center text-[11.5px] font-bold ${i === 0 ? "text-rose" : "text-sub"}`}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const inMonth = d.date.slice(0, 7) === month;
          const booked = d.slots.filter((s) => infoBySlot[s.startAtISO]).length;
          const open = d.slots.filter((s) => s.status === "open").length;
          const isToday = d.date === today;
          const isSel = d.date === selected;
          const hol = holidayName(d.date);
          return (
            <button
              key={d.date}
              type="button"
              disabled={!inMonth}
              onClick={() => inMonth && onSelect(d.date)}
              className={
                "flex min-h-[58px] flex-col items-center gap-0.5 border-b border-r border-line-soft p-1 sm:min-h-[72px] " +
                (isSel ? "bg-coral-tint " : "") + (inMonth ? "hover:bg-coral-tint/40 " : "cursor-default ")
              }
            >
              <span className={"text-[12.5px] font-bold tabular-nums " + (!inMonth ? "text-muted/50" : isToday ? "text-coral-deep" : hol || d.weekday === 0 ? "text-rose" : "text-ink")}>
                {dayNum(d.date)}
              </span>
              {inMonth && hol && (
                <span className="max-w-full truncate text-[9px] font-semibold text-rose">{hol}</span>
              )}
              {inMonth && (
                <div className="flex flex-col items-center gap-0.5">
                  {booked > 0 && (
                    <span className="rounded-full bg-rose px-1 text-[9.5px] font-bold text-white">예약 {booked}</span>
                  )}
                  {open > 0 && (
                    <span className="text-[9.5px] font-semibold text-coral-deep">열림 {open}</span>
                  )}
                  {d.isOff && <span className="text-[9.5px] text-muted">휴무</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekStrip({
  days, today, selected, onSelect,
}: { days: DaySlots[]; today: string; selected: string; onSelect: (d: string) => void }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:hidden">
      {days.map((d) => {
        const isSel = d.date === selected;
        return (
          <button key={d.date} type="button" onClick={() => onSelect(d.date)}
            className={"flex min-w-[52px] shrink-0 flex-col items-center rounded-[12px] border px-2 py-2 " +
              (isSel ? "border-coral bg-coral text-white" : d.date === today ? "border-coral-border bg-surface" : "border-line bg-surface")}>
            <span className={`text-[11px] font-semibold ${isSel ? "text-white/90" : d.weekday === 0 ? "text-rose" : "text-muted"}`}>
              {WEEKDAY_KO[d.weekday]}
            </span>
            <span className="text-[18px] font-bold tabular-nums">{dayNum(d.date)}</span>
          </button>
        );
      })}
    </div>
  );
}

function DayList({
  day, infoBySlot, onSlot,
}: { day: DaySlots; infoBySlot: Record<string, SlotInfo>; onSlot: (s: Slot, date: string) => void }) {
  if (day.isOff) return <Centered>휴무입니다.</Centered>;
  if (day.slots.length === 0) return <Centered>이 날은 열린 시간이 없습니다.</Centered>;
  return (
    <div className="flex flex-col gap-2">
      {day.slots.map((s) => <SlotRow key={s.startAtISO} slot={s} info={infoBySlot[s.startAtISO]} onSlot={() => onSlot(s, day.date)} />)}
    </div>
  );
}

function SlotRow({ slot, info, onSlot }: { slot: Slot; info?: SlotInfo; onSlot: () => void }) {
  if (info)
    return (
      <button type="button" onClick={onSlot}
        className="flex h-[52px] items-center justify-between rounded-[13px] border-l-4 border-rose bg-rose-tint px-4 text-left">
        <span className="text-[16px] font-bold text-rose tabular-nums">{slot.time}</span>
        <span className="text-[13px] font-semibold text-rose">{info.student_name} ›</span>
      </button>
    );
  if (slot.status === "open")
    return (
      <button type="button" onClick={onSlot}
        className="flex h-[52px] items-center justify-between rounded-[13px] border-[1.5px] border-dashed border-coral-border bg-surface px-4 text-left active:bg-coral-tint/40">
        <span className="text-[16px] font-bold text-coral-deep tabular-nums">{slot.time}</span>
        <span className="text-[13px] font-medium text-coral-deep">열림 · 휴강하기</span>
      </button>
    );
  return (
    <div className="flex h-[44px] items-center px-4">
      <span className="text-[15px] text-[#D8C8C0] line-through tabular-nums">{slot.time}</span>
    </div>
  );
}

function WeekDayCard({
  day, today, infoBySlot, onSlot,
}: { day: DaySlots; today: string; infoBySlot: Record<string, SlotInfo>; onSlot: (s: Slot, date: string) => void }) {
  const isToday = day.date === today;
  return (
    <div className={"flex min-h-[130px] flex-col rounded-[var(--radius-card)] border bg-surface " + (isToday ? "border-coral-border" : "border-line")}>
      <div className={"px-2.5 py-2 " + (isToday ? "bg-coral-tint" : "")}>
        <div className={`text-[12px] font-semibold ${holidayName(day.date) || day.weekday === 0 ? "text-rose" : "text-sub"}`}>{WEEKDAY_KO[day.weekday]}</div>
        <div className={`text-[18px] font-bold tabular-nums ${isToday ? "text-coral-deep" : holidayName(day.date) ? "text-rose" : ""}`}>{dayNum(day.date)}</div>
        {holidayName(day.date) && <div className="truncate text-[9px] font-semibold text-rose">{holidayName(day.date)}</div>}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2">
        {day.isOff ? <Centered>휴무</Centered> : day.slots.length === 0 ? <Centered>—</Centered> : (
          day.slots.map((s) => {
            const info = infoBySlot[s.startAtISO];
            if (info)
              return (
                <button key={s.startAtISO} type="button" onClick={() => onSlot(s, day.date)}
                  className="rounded-[6px] border-l-2 border-rose bg-rose-tint px-1.5 py-1 text-left text-[11.5px] font-semibold text-rose tabular-nums">
                  {s.time} {info.student_name}
                </button>
              );
            if (s.status === "open")
              return (
                <button key={s.startAtISO} type="button" onClick={() => onSlot(s, day.date)}
                  className="rounded-[6px] border border-dashed border-coral-border px-1.5 py-1 text-left text-[11.5px] text-coral-deep tabular-nums hover:bg-coral-tint/40">
                  {s.time} 열림
                </button>
              );
            return <span key={s.startAtISO} className="px-1.5 py-1 text-[11.5px] text-muted tabular-nums">{s.time}</span>;
          })
        )}
      </div>
    </div>
  );
}

function ViewToggle({ view }: { view: "week" | "month" }) {
  return (
    <div className="mr-1 flex overflow-hidden rounded-[8px] border border-line">
      <Link href="/teacher?view=week" className={"px-2.5 py-1 text-[12px] font-semibold " + (view === "week" ? "bg-coral text-white" : "text-sub")}>주</Link>
      <Link href="/teacher?view=month" className={"px-2.5 py-1 text-[12px] font-semibold " + (view === "month" ? "bg-coral text-white" : "text-sub")}>월</Link>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center rounded-[12px] border border-line bg-surface py-6 text-center text-[12.5px] text-muted">{children}</div>;
}
function Nav({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="grid h-9 w-9 place-items-center rounded-[8px] border border-line text-sub hover:bg-line-soft">{children}</Link>;
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line-soft py-2 last:border-0">
      <span className="text-sub">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
