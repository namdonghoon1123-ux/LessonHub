// Asia/Seoul 시간 유틸. KST는 DST 없는 고정 오프셋(+09:00)이라 단순 산술로 충분.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");

export type KstWall = {
  y: number;
  mo: number; // 0-based
  d: number;
  weekday: number; // 0=일
  h: number;
  mi: number;
};

// UTC instant → KST 벽시계 값
export function kstWall(date: Date): KstWall {
  const k = new Date(date.getTime() + KST_OFFSET_MS);
  return {
    y: k.getUTCFullYear(),
    mo: k.getUTCMonth(),
    d: k.getUTCDate(),
    weekday: k.getUTCDay(),
    h: k.getUTCHours(),
    mi: k.getUTCMinutes(),
  };
}

// KST 벽시계 → UTC instant
export function kstToUtc(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - KST_OFFSET_MS);
}

// 'YYYY-MM-DD' (KST 기준)
export function ymd(y: number, mo0: number, d: number): string {
  return `${y}-${pad(mo0 + 1)}-${pad(d)}`;
}

export function kstDateStr(date: Date): string {
  const w = kstWall(date);
  return ymd(w.y, w.mo, w.d);
}

export function kstTodayStr(): string {
  return kstDateStr(new Date());
}

// 'YYYY-MM-DD'에 일수 더하기 (KST 정오 기준으로 안전하게)
export function addDaysStr(dateStr: string, days: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const base = new Date(Date.UTC(y, mo - 1, d, 12));
  base.setUTCDate(base.getUTCDate() + days);
  return ymd(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate());
}

// 'YYYY-MM-DD' → 요일 (0=일)
export function weekdayOf(dateStr: string): number {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

// 주의 일요일 시작 날짜 문자열
export function weekStartStr(dateStr: string): string {
  return addDaysStr(dateStr, -weekdayOf(dateStr));
}

// 표시용
export function fmtTime(date: Date): string {
  const w = kstWall(date);
  return `${pad(w.h)}:${pad(w.mi)}`;
}

export function fmtTimeStr(timeStr: string): string {
  // 'HH:MM:SS' → 'HH:MM'
  return timeStr.slice(0, 5);
}

export const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

export function dayNum(dateStr: string): number {
  return Number(dateStr.split("-")[2]);
}

// 분 단위 시각문자열 더하기: 'HH:MM' + n분 → 'HH:MM'
export function addMinutesToTime(timeStr: string, mins: number): string {
  const [h, mi] = timeStr.slice(0, 5).split(":").map(Number);
  const total = h * 60 + mi + mins;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function timeToMinutes(timeStr: string): number {
  const [h, mi] = timeStr.slice(0, 5).split(":").map(Number);
  return h * 60 + mi;
}
