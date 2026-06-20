-- 취소 안내 문구(선생님별, 기본값 지정)
alter table public.teacher_profiles add column if not exists cancel_notice text;
update public.teacher_profiles
  set cancel_notice = '연습실 취소 수수료가 있어요. 부득이한 경우가 아니면 48시간 이전에 취소 부탁드립니다. ㅠㅠ'
  where cancel_notice is null;

-- 입금 등 학생 → 선생님 알림
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete set null,
  kind       text not null default 'PAYMENT',
  message    text,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists idx_notif_teacher on public.notifications(teacher_id, read_at);

alter table public.notifications enable row level security;
grant all on public.notifications to service_role;
grant select, insert, update, delete on public.notifications to authenticated;
