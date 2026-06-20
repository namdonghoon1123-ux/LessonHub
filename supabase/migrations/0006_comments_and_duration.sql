-- 기본 레슨 길이 60분 (선생님이 조절 가능)
alter table public.teacher_profiles alter column lesson_duration_min set default 60;
update public.teacher_profiles set lesson_duration_min = 60 where lesson_duration_min = 30;

-- 레슨 후 코멘트: 선생님 개인메모 + 학생 전달 메시지(전달/확인 시각)
-- (teacher_comment = 학생 전달 메시지로 사용, student_comment = 학생 본인 메모)
alter table public.bookings add column if not exists teacher_private_comment text;
alter table public.bookings add column if not exists comment_delivered_at timestamptz;
alter table public.bookings add column if not exists comment_seen_at timestamptz;
