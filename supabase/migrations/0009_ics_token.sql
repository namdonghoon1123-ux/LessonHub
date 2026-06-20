-- 캘린더 구독(ICS)용 선생님별 토큰 (URL에 포함, 쿠키 인증 없이 구독 가능)
alter table public.teacher_profiles
  add column if not exists ics_token uuid not null default gen_random_uuid();

create index if not exists idx_teacher_ics_token on public.teacher_profiles(ics_token);
