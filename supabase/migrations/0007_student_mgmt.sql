-- 선생님의 학생 관리: 학생별 메모 + 잔여 레슨 횟수(선택)
alter table public.links add column if not exists teacher_memo text;
alter table public.links add column if not exists remaining_lessons int; -- null = 미사용(무제한)

-- 학생 예약 시 한마디 (선택)
alter table public.bookings add column if not exists student_note text;
