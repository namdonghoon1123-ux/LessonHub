-- LessonHub 초기 스키마 (Supabase / PostgreSQL)
-- 컨셉 출처: concept-and-features.md  ·  검증된 도메인 모델은 구 프로젝트 스키마에서 흡수
-- 인증: Supabase Auth (auth.users, uuid).  ID는 전부 uuid.
-- 시간대: timestamptz는 UTC 저장, 앱에서 Asia/Seoul 표시. *_local time 컬럼은 선생님 로컬 기준.
--
-- 권한 모델(v1): 전 테이블 RLS ON(기본 차단). Next.js 서버가 service role 키로
-- DB 작업 수행 + 역할 기반 인가를 앱 코드에서 강제. 아래 정책은 anon/본인 직접 접근 최소 경로만 연다.

-- ───────────────────────── ENUMS ─────────────────────────
create type user_role      as enum ('STUDENT','TEACHER','POWER_ADMIN');
create type student_tier   as enum ('FULL','TEMP');                 -- 정식 / 임시(선생 생성)
create type link_status    as enum ('PENDING','ACTIVE');            -- 연결 대기 / 연결됨
create type override_type  as enum ('OPEN','OFF','CLOSE');          -- 일회용 오픈 / 휴무(전일) / 휴강(부분)
create type booking_status as enum ('PENDING','BOOKED','COMPLETED','NO_SHOW','CANCELED');

-- ─────────────────────── updated_at 트리거 ───────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ───────────────────────── PROFILES (1:1 auth.users) ─────────────────────────
create table public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  role                 user_role     not null default 'STUDENT',
  name                 text          not null,
  email                text,
  phone                text,
  is_active            boolean       not null default true,        -- 소프트 삭제
  deactivated_at       timestamptz,
  deactivated_reason   text,
  must_change_password boolean       not null default false,       -- 첫 로그인 강제 비번변경
  student_tier         student_tier,                               -- STUDENT일 때만 의미
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ───────────────────────── TEACHER PROFILES ─────────────────────────
create table public.teacher_profiles (
  teacher_id                     uuid primary key references public.profiles(id) on delete cascade,
  display_name                   text,
  subject                        text,                             -- 과목 (예: 피아노)
  slug                           text unique,                      -- 공개 프로필 /t/<slug>
  bio                            text,
  timezone                       text not null default 'Asia/Seoul',
  lesson_duration_min            int  not null default 30 check (lesson_duration_min > 0),
  booking_window_days            int  not null default 30,         -- 예약 가능 기간(일)
  teacher_cancel_cutoff_hours    int  not null default 2,          -- 선생: 시작 N시간 전까지 취소
  student_cancel_day_before_hour int,                              -- 학생: 전날 N시(00~23)까지 취소. null=무제한
  student_notice                 text,                             -- 학생에게 노출할 안내문
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);
create trigger trg_teacher_profiles_updated before update on public.teacher_profiles
  for each row execute function public.set_updated_at();

-- ───────────────────────── LINKS (학생-선생 연결) ─────────────────────────
create table public.links (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  status     link_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  unique (student_id, teacher_id)
);
create index idx_links_teacher on public.links(teacher_id);
create index idx_links_student on public.links(student_id);

-- ───────────────────────── WEEKLY AVAILABILITY (주간 반복 시간표) ─────────────────────────
create table public.weekly_availabilities (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references public.profiles(id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6),  -- 0=일요일
  start_time   time not null,
  end_time     time not null,
  is_active    boolean not null default true,
  lesson_title text,
  lesson_note  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_time > start_time)
);
create index idx_weekly_teacher on public.weekly_availabilities(teacher_id);
create trigger trg_weekly_updated before update on public.weekly_availabilities
  for each row execute function public.set_updated_at();

-- ───────────────────────── DATE OVERRIDES (일회용 오픈 / 예외 / 휴무) ─────────────────────────
create table public.date_overrides (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references public.profiles(id) on delete cascade,
  date         date not null,
  type         override_type not null,
  start_time   time,            -- OPEN/CLOSE 부분 시간. OFF(전일 휴무)는 null 허용
  end_time     time,
  lesson_title text,
  lesson_note  text,
  created_at   timestamptz not null default now(),
  check (end_time is null or start_time is null or end_time > start_time)
);
create index idx_overrides_teacher_date on public.date_overrides(teacher_id, date);

-- ───────────────────────── RECURRING SERIES (반복 예약) ─────────────────────────
create table public.recurring_series (
  id              uuid primary key default gen_random_uuid(),
  teacher_id      uuid not null references public.profiles(id) on delete cascade,
  student_id      uuid not null references public.profiles(id) on delete cascade,
  weekday         smallint not null check (weekday between 0 and 6),
  start_time      time not null,
  duration_min    int  not null check (duration_min > 0),
  lesson_title    text,
  requested_count int  not null,        -- 요청한 반복 횟수
  created_count   int  not null default 0, -- 실제 생성된 예약 수
  created_at      timestamptz not null default now(),
  canceled_at     timestamptz
);
create index idx_series_teacher on public.recurring_series(teacher_id);
create index idx_series_student on public.recurring_series(student_id);

-- ───────────────────────── BOOKINGS ─────────────────────────
create table public.bookings (
  id                   uuid primary key default gen_random_uuid(),
  teacher_id           uuid not null references public.profiles(id) on delete restrict,
  student_id           uuid not null references public.profiles(id) on delete restrict,
  start_at             timestamptz not null,
  duration_min         int not null check (duration_min > 0),
  status               booking_status not null default 'BOOKED',
  recurring_series_id  uuid references public.recurring_series(id) on delete set null,
  lesson_title_snapshot text,           -- 예약 시점 수업명 스냅샷
  teacher_comment      text,            -- 선생님 수업 코멘트
  student_comment      text,
  completed_at         timestamptz,
  no_show_at           timestamptz,     -- 노쇼 처리(수동)
  canceled_at          timestamptz,
  canceled_by          uuid references public.profiles(id),
  cancel_reason        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
-- 중복 차단: 같은 선생·같은 시작시각에 PENDING/BOOKED 1건만
create unique index uniq_booking_active_slot
  on public.bookings (teacher_id, start_at)
  where status in ('PENDING','BOOKED');
create index idx_bookings_student on public.bookings(student_id);
create index idx_bookings_teacher_start on public.bookings(teacher_id, start_at);
create index idx_bookings_series on public.bookings(recurring_series_id);
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();

-- ───────────────────────── 자동 완료 (BOOKED → COMPLETED) ─────────────────────────
-- 수업 종료 시각이 지난 BOOKED를 COMPLETED로. pg_cron 스케줄은 0002_cron.sql 참고.
create or replace function public.auto_complete_bookings()
returns integer language plpgsql as $$
declare n integer;
begin
  update public.bookings
     set status='COMPLETED', completed_at=now()
   where status='BOOKED'
     and start_at + make_interval(mins => duration_min) < now();
  get diagnostics n = row_count;
  return n;
end; $$;

-- ───────────────────────── PATCH NOTES (공지) ─────────────────────────
create table public.patch_notes (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  author_id    uuid references public.profiles(id),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_patch_notes_updated before update on public.patch_notes
  for each row execute function public.set_updated_at();

-- ───────────────────────── AUDIT LOGS ─────────────────────────
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles(id),
  actor_email text,
  actor_role  text,
  action      text not null,
  target_type text,
  target_id   text,
  payload     jsonb,
  ip_inet     inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index idx_audit_created on public.audit_logs(created_at desc);

-- ───────────────────────── 공개 프로필용 안전 뷰 (anon 접근) ─────────────────────────
-- /t/<slug> 비로그인 노출. 민감 컬럼 제외.
create view public.public_teachers as
  select tp.teacher_id as id,
         coalesce(tp.display_name, p.name) as name,
         tp.subject, tp.slug, tp.bio, tp.lesson_duration_min, tp.timezone
  from public.teacher_profiles tp
  join public.profiles p on p.id = tp.teacher_id
  where p.is_active = true and tp.slug is not null;

-- ═════════════════════════ RLS ═════════════════════════
alter table public.profiles              enable row level security;
alter table public.teacher_profiles      enable row level security;
alter table public.links                 enable row level security;
alter table public.weekly_availabilities enable row level security;
alter table public.date_overrides        enable row level security;
alter table public.recurring_series      enable row level security;
alter table public.bookings              enable row level security;
alter table public.patch_notes           enable row level security;
alter table public.audit_logs            enable row level security;

-- 본인 프로필 읽기(로그인 사용자)
create policy "own profile read" on public.profiles
  for select to authenticated using (id = auth.uid());

-- 공개 패치노트 읽기(anon + authenticated)
create policy "published patch notes read" on public.patch_notes
  for select using (published_at is not null);

-- 공개 프로필 뷰는 anon에 select 허용
grant select on public.public_teachers to anon, authenticated;

-- 그 외 모든 접근은 RLS 기본 차단 → Next.js 서버가 service role 키로 수행하고
-- 역할 기반 인가는 앱에서 강제한다. (필요해지면 클라이언트 직접 접근용 정책 추가)
