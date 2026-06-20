// 학생 취소 정책: 수업 시작 N시간 전까지 취소 가능 (README 기준 48h).
export const STUDENT_CANCEL_CUTOFF_HOURS = 48;

export function studentCancelDeadline(startAtISO: string): Date {
  return new Date(
    new Date(startAtISO).getTime() - STUDENT_CANCEL_CUTOFF_HOURS * 3600 * 1000,
  );
}

export function canStudentCancel(startAtISO: string, now: Date = new Date()): boolean {
  return now.getTime() < studentCancelDeadline(startAtISO).getTime();
}
