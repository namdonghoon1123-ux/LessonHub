// 슬롯 계산 (순수 함수). 주간 템플릿 + 일회용 오픈 − 예외(휴무/휴강) − 기존 예약.
import {
  addDaysStr,
  kstToUtc,
  timeToMinutes,
  weekdayOf,
  kstDateStr,
  addMinutesToTime,
} from "./time";

export type Weekly = {
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};
export type Override = {
  date: string;
  type: "OPEN" | "OFF" | "CLOSE";
  start_time: string | null;
  end_time: string | null;
};
export type BookingLite = {
  start_at: string; // ISO
  student_id: string;
  status: string;
  duration_min: number;
};

// 슬롯 시작 간격(분). 레슨은 duration_min 길이지만 시작은 30분 단위.
export const SLOT_STEP_MIN = 30;

export type SlotStatus = "open" | "full" | "mine" | "past";
export type Slot = { time: string; startAtISO: string; status: SlotStatus };
export type DaySlots = {
  date: string;
  weekday: number;
  isOff: boolean;
  isPast: boolean;
  slots: Slot[];
};

type Interval = { start: number; end: number }; // minutes

function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else out.push({ ...iv });
  }
  return out;
}

// base 구간들에서 cut 구간들을 제거
function subtractIntervals(base: Interval[], cuts: Interval[]): Interval[] {
  let result = mergeIntervals(base);
  for (const cut of cuts) {
    const next: Interval[] = [];
    for (const iv of result) {
      if (cut.end <= iv.start || cut.start >= iv.end) {
        next.push(iv); // 겹침 없음
      } else {
        if (cut.start > iv.start) next.push({ start: iv.start, end: cut.start });
        if (cut.end < iv.end) next.push({ start: cut.end, end: iv.end });
      }
    }
    result = next;
  }
  return result;
}

export type ComputeParams = {
  date: string;
  durationMin: number;
  weekly: Weekly[];
  overrides: Override[];
  bookings: BookingLite[]; // 해당 선생의 활성 예약
  viewingStudentId?: string;
  now?: Date;
};

export function computeDaySlots(p: ComputeParams): DaySlots {
  const now = p.now ?? new Date();
  const todayStr = kstDateStr(now);
  const wd = weekdayOf(p.date);
  const isPast = p.date < todayStr;

  const dayOverrides = p.overrides.filter((o) => o.date === p.date);
  const offAllDay = dayOverrides.some(
    (o) => o.type === "OFF" && (o.start_time == null || o.end_time == null),
  );

  if (offAllDay) {
    return { date: p.date, weekday: wd, isOff: true, isPast, slots: [] };
  }

  // 가용 구간: 주간(해당 요일, 활성) + 일회용 OPEN
  const base: Interval[] = [];
  for (const w of p.weekly) {
    if (w.weekday === wd && w.is_active) {
      base.push({
        start: timeToMinutes(w.start_time),
        end: timeToMinutes(w.end_time),
      });
    }
  }
  for (const o of dayOverrides) {
    if (o.type === "OPEN" && o.start_time && o.end_time) {
      base.push({
        start: timeToMinutes(o.start_time),
        end: timeToMinutes(o.end_time),
      });
    }
  }

  // 제거 구간: CLOSE(부분 휴강) + 부분 OFF
  const cuts: Interval[] = [];
  for (const o of dayOverrides) {
    if ((o.type === "CLOSE" || o.type === "OFF") && o.start_time && o.end_time) {
      cuts.push({
        start: timeToMinutes(o.start_time),
        end: timeToMinutes(o.end_time),
      });
    }
  }

  const ranges = subtractIntervals(base, cuts);

  // 활성 예약을 시간 구간(ms)으로 — 겹침 판정용
  const intervals = p.bookings.map((b) => {
    const s = new Date(b.start_at).getTime();
    return { s, e: s + b.duration_min * 60000, student_id: b.student_id };
  });
  const nowMs = now.getTime();

  const slots: Slot[] = [];
  for (const iv of ranges) {
    let t = iv.start;
    // 시작은 30분 단위, 레슨 길이는 durationMin (겹치는 시작시간 허용)
    while (t + p.durationMin <= iv.end) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const startAt = kstToUtc(p.date, timeStr);
      const sMs = startAt.getTime();
      const eMs = sMs + p.durationMin * 60000;
      // 이 슬롯 구간과 겹치는 예약 찾기
      const ov = intervals.find((b) => b.s < eMs && b.e > sMs);

      let status: SlotStatus;
      if (ov) {
        status =
          p.viewingStudentId && ov.student_id === p.viewingStudentId
            ? "mine"
            : "full";
      } else if (sMs <= nowMs) {
        status = "past";
      } else {
        status = "open";
      }
      slots.push({ time: timeStr, startAtISO: startAt.toISOString(), status });
      t += SLOT_STEP_MIN;
    }
  }

  return { date: p.date, weekday: wd, isOff: false, isPast, slots };
}

export function computeRange(
  from: string,
  days: number,
  base: Omit<ComputeParams, "date">,
): DaySlots[] {
  const out: DaySlots[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysStr(from, i);
    out.push(computeDaySlots({ ...base, date }));
  }
  return out;
}

export { addMinutesToTime };
