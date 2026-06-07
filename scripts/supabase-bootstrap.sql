-- ============================================================
-- LessonHub · Supabase bootstrap SQL (auto-generated)
-- 
-- 사용법: Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run
--        또는 psql "$SUPABASE_DB_URL" -f scripts/supabase-bootstrap.sql
-- 
-- 포함: 마이그레이션 001~020 + 시드 001
-- ============================================================

-- ============================================================
-- db/migrations/001_init.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('TEACHER', 'STUDENT')),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_profiles (
  teacher_user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lesson_duration_min INT NOT NULL DEFAULT 60 CHECK (lesson_duration_min > 0),
  timezone TEXT NOT NULL DEFAULT 'Asia/Seoul',
  cancel_cutoff_hours INT NOT NULL DEFAULT 6 CHECK (cancel_cutoff_hours >= 0),
  booking_window_days INT NOT NULL DEFAULT 30 CHECK (booking_window_days > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_availabilities (
  id BIGSERIAL PRIMARY KEY,
  teacher_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday INT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time_local TIME NOT NULL,
  end_time_local TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_time_local < end_time_local)
);

CREATE TABLE IF NOT EXISTS availability_exceptions (
  id BIGSERIAL PRIMARY KEY,
  teacher_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_local DATE NOT NULL,
  start_time_local TIME NULL,
  end_time_local TIME NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (start_time_local IS NULL AND end_time_local IS NULL)
    OR (start_time_local IS NOT NULL AND end_time_local IS NOT NULL AND start_time_local < end_time_local)
  )
);

CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  teacher_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  duration_min INT NOT NULL CHECK (duration_min > 0),
  status TEXT NOT NULL CHECK (
    status IN ('BOOKED', 'CANCELED_BY_STUDENT', 'CANCELED_BY_TEACHER', 'COMPLETED', 'NO_SHOW')
  ),
  canceled_at TIMESTAMPTZ NULL,
  cancel_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_teacher_start_active
  ON bookings (teacher_user_id, start_at)
  WHERE status = 'BOOKED';

CREATE INDEX IF NOT EXISTS idx_bookings_student_start_at
  ON bookings (student_user_id, start_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_teacher_start_at
  ON bookings (teacher_user_id, start_at DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_availabilities_teacher_weekday_active
  ON weekly_availabilities (teacher_user_id, weekday, is_active);

CREATE INDEX IF NOT EXISTS idx_availability_exceptions_teacher_date
  ON availability_exceptions (teacher_user_id, date_local);

-- ============================================================
-- db/migrations/002_users_role_index.sql
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- db/migrations/003_auth_token_revocations.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS auth_token_revocations (
  token_id TEXT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_token_revocations_expires_at
  ON auth_token_revocations (expires_at);

-- ============================================================
-- db/migrations/004_booking_pending_approval.sql
-- ============================================================
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (
    status IN (
      'PENDING',
      'BOOKED',
      'CANCELED_BY_STUDENT',
      'CANCELED_BY_TEACHER',
      'COMPLETED',
      'NO_SHOW'
    )
  );

DROP INDEX IF EXISTS uq_bookings_teacher_start_active;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_teacher_start_active
  ON bookings (teacher_user_id, start_at)
  WHERE status IN ('PENDING', 'BOOKED');

-- ============================================================
-- db/migrations/005_availability_lesson_metadata.sql
-- ============================================================
ALTER TABLE weekly_availabilities
  ADD COLUMN IF NOT EXISTS lesson_title TEXT NULL,
  ADD COLUMN IF NOT EXISTS lesson_note TEXT NULL;

-- ============================================================
-- db/migrations/006_one_time_availabilities.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS one_time_availabilities (
  id BIGSERIAL PRIMARY KEY,
  teacher_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_local DATE NOT NULL,
  start_time_local TIME NOT NULL,
  end_time_local TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  lesson_title TEXT NULL,
  lesson_note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_time_local < end_time_local)
);

CREATE INDEX IF NOT EXISTS idx_one_time_availabilities_teacher_date_active
  ON one_time_availabilities (teacher_user_id, date_local, is_active, start_time_local);

-- ============================================================
-- db/migrations/007_booking_completion_and_teacher_comment.sql
-- ============================================================
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS teacher_comment TEXT NULL;

UPDATE bookings
SET completed_at = COALESCE(completed_at, updated_at)
WHERE status = 'COMPLETED'
  AND completed_at IS NULL;

UPDATE teacher_profiles
SET timezone = 'Asia/Seoul',
    updated_at = NOW()
WHERE timezone = 'UTC';

-- ============================================================
-- db/migrations/008_guest_student_booking_access.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS guest_students (
  id BIGSERIAL PRIMARY KEY,
  phone_normalized TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  contact_name TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookings
  ALTER COLUMN student_user_id DROP NOT NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_student_id BIGINT NULL REFERENCES guest_students(id) ON DELETE SET NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_student_name TEXT NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS public_access_token_hash TEXT NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS public_access_token_expires_at TIMESTAMPTZ NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS public_access_created_at TIMESTAMPTZ NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS public_access_revoked_at TIMESTAMPTZ NULL;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_student_identity_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_student_identity_check CHECK (
    (student_user_id IS NOT NULL AND guest_student_id IS NULL)
    OR (student_user_id IS NULL AND guest_student_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_bookings_guest_student_start_at
  ON bookings (guest_student_id, start_at DESC)
  WHERE guest_student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_public_access_expires
  ON bookings (public_access_token_expires_at)
  WHERE public_access_token_hash IS NOT NULL;

-- ============================================================
-- db/migrations/009_guest_pin_lockout_and_comment_split.sql
-- ============================================================
ALTER TABLE guest_students
  ADD COLUMN IF NOT EXISTS pin_failed_attempts INT NOT NULL DEFAULT 0;

ALTER TABLE guest_students
  ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ NULL;

ALTER TABLE guest_students
  DROP CONSTRAINT IF EXISTS guest_students_pin_failed_attempts_check;

ALTER TABLE guest_students
  ADD CONSTRAINT guest_students_pin_failed_attempts_check CHECK (pin_failed_attempts >= 0);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS teacher_private_comment TEXT NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS student_comment TEXT NULL;

UPDATE bookings
SET student_comment = COALESCE(student_comment, teacher_comment)
WHERE teacher_comment IS NOT NULL;

-- ============================================================
-- db/migrations/010_teacher_cancel_policy_notice_and_dedup.sql
-- ============================================================
ALTER TABLE teacher_profiles
  ADD COLUMN IF NOT EXISTS student_cancel_day_before_hour INT NOT NULL DEFAULT 21;

ALTER TABLE teacher_profiles
  ADD COLUMN IF NOT EXISTS student_notice TEXT NULL;

ALTER TABLE teacher_profiles
  DROP CONSTRAINT IF EXISTS teacher_profiles_student_cancel_day_before_hour_check;

ALTER TABLE teacher_profiles
  ADD CONSTRAINT teacher_profiles_student_cancel_day_before_hour_check
  CHECK (student_cancel_day_before_hour BETWEEN 0 AND 23);

DELETE FROM weekly_availabilities w
USING weekly_availabilities dup
WHERE w.id > dup.id
  AND w.teacher_user_id = dup.teacher_user_id
  AND w.weekday = dup.weekday
  AND w.start_time_local = dup.start_time_local
  AND w.end_time_local = dup.end_time_local;

CREATE UNIQUE INDEX IF NOT EXISTS uq_weekly_availabilities_teacher_slot
  ON weekly_availabilities (teacher_user_id, weekday, start_time_local, end_time_local);

DELETE FROM one_time_availabilities o
USING one_time_availabilities dup
WHERE o.id > dup.id
  AND o.teacher_user_id = dup.teacher_user_id
  AND o.date_local = dup.date_local
  AND o.start_time_local = dup.start_time_local
  AND o.end_time_local = dup.end_time_local;

CREATE UNIQUE INDEX IF NOT EXISTS uq_one_time_availabilities_teacher_slot
  ON one_time_availabilities (teacher_user_id, date_local, start_time_local, end_time_local);

DELETE FROM availability_exceptions e
USING availability_exceptions dup
WHERE e.id > dup.id
  AND e.teacher_user_id = dup.teacher_user_id
  AND e.date_local = dup.date_local
  AND e.start_time_local IS NOT NULL
  AND e.end_time_local IS NOT NULL
  AND dup.start_time_local IS NOT NULL
  AND dup.end_time_local IS NOT NULL
  AND e.start_time_local = dup.start_time_local
  AND e.end_time_local = dup.end_time_local;

DELETE FROM availability_exceptions e
USING availability_exceptions dup
WHERE e.id > dup.id
  AND e.teacher_user_id = dup.teacher_user_id
  AND e.date_local = dup.date_local
  AND e.start_time_local IS NULL
  AND e.end_time_local IS NULL
  AND dup.start_time_local IS NULL
  AND dup.end_time_local IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_availability_exceptions_teacher_slot
  ON availability_exceptions (teacher_user_id, date_local, start_time_local, end_time_local)
  WHERE start_time_local IS NOT NULL AND end_time_local IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_availability_exceptions_teacher_all_day
  ON availability_exceptions (teacher_user_id, date_local)
  WHERE start_time_local IS NULL AND end_time_local IS NULL;

-- ============================================================
-- db/migrations/011_user_phone_and_profile_extensions.sql
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_phone_normalized
  ON users (phone_normalized)
  WHERE phone_normalized IS NOT NULL;

ALTER TABLE teacher_profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT NULL;

ALTER TABLE teacher_profiles
  ADD COLUMN IF NOT EXISTS bio TEXT NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS lesson_title_snapshot TEXT NULL;

-- ============================================================
-- db/migrations/012_student_assigned_teacher.sql
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS assigned_teacher_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_assigned_teacher_user_id
  ON users (assigned_teacher_user_id)
  WHERE assigned_teacher_user_id IS NOT NULL;

-- ============================================================
-- db/migrations/013_student_account_tier_and_upgrade.sql
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_tier TEXT NOT NULL DEFAULT 'FULL';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_account_tier_check;

ALTER TABLE users
  ADD CONSTRAINT users_account_tier_check
  CHECK (account_tier IN ('FULL', 'TEMP'));

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS temp_created_by_teacher_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS upgraded_to_full_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_users_account_tier
  ON users (account_tier);

CREATE INDEX IF NOT EXISTS idx_users_temp_created_by_teacher_user_id
  ON users (temp_created_by_teacher_user_id)
  WHERE temp_created_by_teacher_user_id IS NOT NULL;

-- ============================================================
-- db/migrations/014_power_admin_and_timezone.sql
-- ============================================================
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('TEACHER', 'STUDENT', 'POWER_ADMIN'));

UPDATE teacher_profiles
SET timezone = 'Asia/Seoul',
    updated_at = NOW()
WHERE timezone IS DISTINCT FROM 'Asia/Seoul';

INSERT INTO users (
  role,
  email,
  phone_normalized,
  password_hash,
  name,
  account_tier
)
VALUES (
  'POWER_ADMIN',
  'poweradmin',
  '01099990000',
  '$2a$10$YJSFWM2UixhhcHA6VjZveuZEV03HZqlCZ7BvPfYwvrJ1Ou8XfXVZm',
  'Power Admin',
  'FULL'
)
ON CONFLICT (email) DO UPDATE
SET role = EXCLUDED.role,
    phone_normalized = COALESCE(users.phone_normalized, EXCLUDED.phone_normalized),
    name = EXCLUDED.name,
    account_tier = 'FULL',
    updated_at = NOW();

-- ============================================================
-- db/migrations/015_user_soft_deletion.sql
-- ============================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deactivated_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_users_is_active
  ON users (is_active);

-- ============================================================
-- db/migrations/016_admin_patch_notes_and_power_admin_login_fix.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_patch_notes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_patch_notes_created_at
  ON admin_patch_notes (created_at DESC, id DESC);

INSERT INTO users (
  role,
  email,
  phone_normalized,
  password_hash,
  name,
  account_tier,
  is_active,
  deactivated_at,
  deactivated_reason
)
VALUES (
  'POWER_ADMIN',
  'poweradmin',
  '01099990000',
  '$2a$10$5eVGtCMHIzOkM8ANenqKre6lrqsYcKDT1lJpIB1zvpl0dI1kCs8cq',
  'Power Admin',
  'FULL',
  TRUE,
  NULL,
  NULL
)
ON CONFLICT (email) DO UPDATE
SET role = 'POWER_ADMIN',
    name = EXCLUDED.name,
    account_tier = 'FULL',
    phone_normalized = COALESCE(users.phone_normalized, EXCLUDED.phone_normalized),
    updated_at = NOW();

INSERT INTO admin_patch_notes (title, body, created_by_user_id)
SELECT
  '파워관리자 패치노트 게시판 초기화',
  '파워관리자에서 요청사항/수정사항/검증결과를 누적 기록하도록 패치노트 게시판을 활성화했습니다.',
  (
    SELECT id
    FROM users
    WHERE email = 'poweradmin'
      AND role = 'POWER_ADMIN'
    ORDER BY id DESC
    LIMIT 1
  )
WHERE NOT EXISTS (
  SELECT 1
  FROM admin_patch_notes
);

-- ============================================================
-- db/migrations/017_pg_cron_schedulers.sql
-- ============================================================
-- Supabase pg_cron 기반 스케줄러
-- Vercel Serverless 환경에서는 setInterval 백그라운드 작업이 불가능하므로
-- backend/src/index.js의 startAutoCompletionScheduler / startGuestRetentionScheduler
-- 를 데이터베이스 측 cron job 으로 이관한다.
--
-- 적용 환경: Supabase (또는 pg_cron 확장이 활성화된 PostgreSQL)
-- Docker 로컬 환경에서는 이 파일은 NO-OP 으로 건너뛴다.

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not available, skipping scheduler migration (likely local Docker)';
    RETURN;
  END IF;

  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- 기존 등록된 잡 정리 (멱등 보장)
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('lh-auto-complete', 'lh-guest-retention');

  -- 1) 자동 완료: 매 분, BOOKED → COMPLETED (수업 종료 시각 경과)
  PERFORM cron.schedule(
    'lh-auto-complete',
    '* * * * *',
    $job$
      UPDATE bookings
      SET status = 'COMPLETED',
          completed_at = COALESCE(completed_at, NOW()),
          updated_at = NOW()
      WHERE status = 'BOOKED'
        AND (start_at + make_interval(mins => duration_min)) <= NOW();
    $job$
  );

  -- 2) 게스트 보존 정리: 매일 02:00 KST (UTC 17:00), 365일 기준
  PERFORM cron.schedule(
    'lh-guest-retention',
    '0 17 * * *',
    $job$
      UPDATE bookings
      SET guest_student_name = NULL,
          public_access_token_hash = NULL,
          public_access_token_expires_at = NULL,
          public_access_created_at = NULL,
          public_access_revoked_at = NOW(),
          updated_at = NOW()
      WHERE guest_student_id IS NOT NULL
        AND start_at < NOW() - make_interval(days => 365);

      DELETE FROM guest_students gs
      WHERE NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.guest_student_id = gs.id
          AND b.start_at >= NOW() - make_interval(days => 365)
      );
    $job$
  );
END;
$migration$;

-- ============================================================
-- db/migrations/019_teacher_public_profile.sql
-- ============================================================
-- 019: 선생님 공개 프로필용 slug 컬럼
-- /t/<slug> 또는 /p.html?t=<slug> 로 비로그인 사용자에게 선생님 소개 노출

ALTER TABLE teacher_profiles
  ADD COLUMN IF NOT EXISTS public_slug TEXT;

-- slug 는 unique 하되 NULL 허용 (공개 안 한 선생도 있을 수 있음)
CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_profiles_public_slug
  ON teacher_profiles (public_slug)
  WHERE public_slug IS NOT NULL;

-- 형식 제약: 영문 소문자, 숫자, 하이픈만 허용, 3-40 자
ALTER TABLE teacher_profiles
  DROP CONSTRAINT IF EXISTS teacher_profiles_public_slug_format_chk;

ALTER TABLE teacher_profiles
  ADD CONSTRAINT teacher_profiles_public_slug_format_chk
    CHECK (public_slug IS NULL OR public_slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$');

-- 데모 선생 slug 자동 부여
UPDATE teacher_profiles
SET public_slug = 'jiwon-piano',
    updated_at = NOW()
WHERE teacher_user_id = (SELECT id FROM users WHERE email = 'teacher@example.com' LIMIT 1)
  AND public_slug IS NULL;

-- ============================================================
-- db/migrations/020_audit_logs.sql
-- ============================================================
-- 020: 관리자 액션 audit log
-- 누가, 언제, 무엇을 변경했는지 추적. 운영 사고 대응 + 보안 감사용.

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,            -- 'admin.user.create', 'admin.user.delete', 'admin.password.reset', ...
  target_type TEXT,                -- 'user', 'booking', 'teacher_profile', 'patch_note'
  target_id BIGINT,
  payload JSONB,                   -- 변경 전/후, 파라미터 일부
  ip_inet INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created
  ON audit_logs (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created
  ON audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target
  ON audit_logs (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON audit_logs (created_at DESC);

-- ============================================================
-- db/seeds/001_seed.sql
-- ============================================================
INSERT INTO users (role, email, password_hash, name)
VALUES
  ('TEACHER', 'teacher@example.com', '$2b$10$SAnonO1ZUr6gMNJMzd5CbO8Jx0jCwswrNDrR2eELeMqQfuv1excaG', 'Demo Teacher'),
  ('STUDENT', 'student@example.com', '$2b$10$SAnonO1ZUr6gMNJMzd5CbO8Jx0jCwswrNDrR2eELeMqQfuv1excaG', 'Demo Student'),
  ('POWER_ADMIN', 'poweradmin', '$2a$10$5eVGtCMHIzOkM8ANenqKre6lrqsYcKDT1lJpIB1zvpl0dI1kCs8cq', 'Power Admin')
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  updated_at = NOW();

INSERT INTO teacher_profiles (teacher_user_id, lesson_duration_min, timezone, cancel_cutoff_hours, booking_window_days)
SELECT id, 60, 'Asia/Seoul', 6, 30
FROM users
WHERE email = 'teacher@example.com'
ON CONFLICT (teacher_user_id) DO UPDATE SET
  lesson_duration_min = EXCLUDED.lesson_duration_min,
  timezone = EXCLUDED.timezone,
  cancel_cutoff_hours = EXCLUDED.cancel_cutoff_hours,
  booking_window_days = EXCLUDED.booking_window_days,
  updated_at = NOW();

UPDATE users AS student
SET assigned_teacher_user_id = teacher.id,
    updated_at = NOW()
FROM users AS teacher
WHERE student.email = 'student@example.com'
  AND teacher.email = 'teacher@example.com'
  AND student.role = 'STUDENT'
  AND teacher.role = 'TEACHER';

-- ============================================================
-- 검증 쿼리 (선택)
-- ============================================================
-- SELECT id, email, role, account_tier, is_active FROM users ORDER BY id;
-- SELECT jobname, schedule, active FROM cron.job ORDER BY jobid;
-- SELECT count(*) FROM information_schema.tables WHERE table_schema='public';
-- SELECT public_slug FROM teacher_profiles WHERE public_slug IS NOT NULL;
-- SELECT count(*) FROM audit_logs;
