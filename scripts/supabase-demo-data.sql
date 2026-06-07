-- ============================================================
-- LessonHub · 데모 계정 + 시연 데이터 (idempotent)
-- ============================================================
-- 사용법:
--   1. Supabase 대시보드 → SQL Editor 에 이 파일 전체 붙여넣기 → Run
--   2. 또는 psql "$SUPABASE_DB_URL" -f scripts/supabase-demo-data.sql
--
-- 멱등 보장: 여러 번 실행해도 데이터 중복 안 됨 (ON CONFLICT / NOT EXISTS).
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. 계정 비밀번호 갱신 (시드된 3 계정 → 알려진 로그인 정보로)
-- ──────────────────────────────────────────────────────────────

-- 선생님: teacher@example.com / teacher123
UPDATE users
SET password_hash = '$2a$10$TKyv5m8IV36ernj55lskveKY.mrxgT8d9RVMvx/8m5t2gB9OdeI6C',
    name = '이지원 선생님',
    is_active = TRUE,
    updated_at = NOW()
WHERE email = 'teacher@example.com';

-- 학생: student@example.com / student123
UPDATE users
SET password_hash = '$2a$10$kLThFZDG2yp.4NPAb5IphuckkpEMVzPutbKQYM0H8qYT7Wpwplc6u',
    name = '최서연',
    is_active = TRUE,
    updated_at = NOW()
WHERE email = 'student@example.com';

-- 파워관리자: admin / admin123 (poweradmin 은 백업으로 보존)
INSERT INTO users (role, email, password_hash, name, account_tier, is_active)
VALUES (
  'POWER_ADMIN',
  'admin',
  '$2a$10$dkoQq/OfaKId0GWSjIZZZezs99CYcs10wfHujS9SybgjH82ct5HuC',
  'LessonHub Admin',
  'FULL',
  TRUE
)
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      role          = EXCLUDED.role,
      name          = EXCLUDED.name,
      account_tier  = EXCLUDED.account_tier,
      is_active     = TRUE,
      updated_at    = NOW();

-- ──────────────────────────────────────────────────────────────
-- 2. 데모 데이터: 학생 ↔ 선생 연결 + 선생 프로필
-- ──────────────────────────────────────────────────────────────

-- 학생을 선생에게 연결 (시드에서 이미 했어도 멱등 보장)
UPDATE users s
SET assigned_teacher_user_id = (
      SELECT id FROM users WHERE email = 'teacher@example.com' AND is_active LIMIT 1
    ),
    updated_at = NOW()
WHERE s.email = 'student@example.com'
  AND s.assigned_teacher_user_id IS NULL;

-- 선생님 프로필 강화 (display_name, bio, 정책)
UPDATE teacher_profiles
SET lesson_duration_min        = 60,
    timezone                   = 'Asia/Seoul',
    cancel_cutoff_hours        = 6,
    booking_window_days        = 30,
    student_cancel_day_before_hour = 21,
    student_notice = '수업 시작 전 화장실 다녀와 주세요. 악보는 미리 보내드립니다.',
    display_name = '이지원 · 피아노',
    bio = '8년차 피아노 강사. 클래식 · 재즈 · 입시 모두 가능.',
    updated_at = NOW()
WHERE teacher_user_id = (SELECT id FROM users WHERE email = 'teacher@example.com');

-- ──────────────────────────────────────────────────────────────
-- 3. 데모 시간표 · 예외
-- ──────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_teacher_id BIGINT;
  v_student_id BIGINT;
  v_admin_id   BIGINT;
  v_today_kst  DATE;
  v_weekday    INT;
BEGIN
  SELECT id INTO v_teacher_id FROM users WHERE email = 'teacher@example.com' AND is_active LIMIT 1;
  SELECT id INTO v_student_id FROM users WHERE email = 'student@example.com' AND is_active LIMIT 1;
  SELECT id INTO v_admin_id   FROM users WHERE email = 'admin'               AND is_active LIMIT 1;
  v_today_kst := (NOW() AT TIME ZONE 'Asia/Seoul')::date;

  -- 3-1. 주간 시간표: 월~금 09:00 ~ 18:00 (각 요일 1행)
  FOR v_weekday IN 1..5 LOOP
    INSERT INTO weekly_availabilities (
      teacher_user_id, weekday, start_time_local, end_time_local, is_active, lesson_title, lesson_note
    )
    VALUES (
      v_teacher_id, v_weekday, '09:00'::time, '18:00'::time, TRUE,
      CASE v_weekday WHEN 1 THEN '월요일 정규 레슨'
                     WHEN 2 THEN '화요일 정규 레슨'
                     WHEN 3 THEN '수요일 정규 레슨'
                     WHEN 4 THEN '목요일 정규 레슨'
                     WHEN 5 THEN '금요일 정규 레슨'
      END,
      '준비물: 본인 악보, 메트로놈'
    )
    ON CONFLICT (teacher_user_id, weekday, start_time_local, end_time_local) DO NOTHING;
  END LOOP;

  -- 3-2. 일회용 가용 시간: 이번 주 토요일 10:00-14:00 (주말 특강)
  INSERT INTO one_time_availabilities (
    teacher_user_id, date_local, start_time_local, end_time_local, is_active, lesson_title, lesson_note
  )
  VALUES (
    v_teacher_id,
    v_today_kst + ((6 - EXTRACT(DOW FROM v_today_kst)::int + 7) % 7)::int,  -- 이번 주 토요일
    '10:00'::time, '14:00'::time, TRUE,
    '주말 특강 — 입시 곡 연습',
    '월말 마지막 주 토요일만 한정'
  )
  ON CONFLICT (teacher_user_id, date_local, start_time_local, end_time_local) DO NOTHING;

  -- 3-3. 예외: 이번 주 일요일 종일 휴무 (멱등 — 이미 있으면 skip)
  IF NOT EXISTS (
    SELECT 1 FROM availability_exceptions
    WHERE teacher_user_id = v_teacher_id
      AND date_local = v_today_kst + ((0 - EXTRACT(DOW FROM v_today_kst)::int + 7) % 7)::int
      AND start_time_local IS NULL
  ) THEN
    INSERT INTO availability_exceptions (
      teacher_user_id, date_local, start_time_local, end_time_local, reason
    )
    VALUES (
      v_teacher_id,
      v_today_kst + ((0 - EXTRACT(DOW FROM v_today_kst)::int + 7) % 7)::int,
      NULL, NULL,
      '일요일 정기 휴무'
    );
  END IF;

  -- ──────────────────────────────────────────────────────────────
  -- 4. 데모 예약 4건
  -- ──────────────────────────────────────────────────────────────

  -- 4-1. 오늘 14:00 KST · BOOKED · 진행 중
  INSERT INTO bookings (
    teacher_user_id, student_user_id, start_at, duration_min, status, lesson_title_snapshot
  )
  VALUES (
    v_teacher_id, v_student_id,
    (v_today_kst::text || ' 14:00:00+09:00')::timestamptz,
    60, 'BOOKED', '오늘 피아노 — 체르니 30번 1·2번'
  )
  ON CONFLICT DO NOTHING;

  -- 4-2. 내일 10:00 KST · PENDING · 승인 대기
  INSERT INTO bookings (
    teacher_user_id, student_user_id, start_at, duration_min, status, lesson_title_snapshot
  )
  VALUES (
    v_teacher_id, v_student_id,
    ((v_today_kst + 1)::text || ' 10:00:00+09:00')::timestamptz,
    60, 'PENDING', '내일 피아노 — 곡 선정 상담'
  )
  ON CONFLICT DO NOTHING;

  -- 4-3. 4일 후 15:00 KST · BOOKED
  INSERT INTO bookings (
    teacher_user_id, student_user_id, start_at, duration_min, status, lesson_title_snapshot
  )
  VALUES (
    v_teacher_id, v_student_id,
    ((v_today_kst + 4)::text || ' 15:00:00+09:00')::timestamptz,
    60, 'BOOKED', '주말 피아노 — 입시 자유곡'
  )
  ON CONFLICT DO NOTHING;

  -- 4-4. 7일 전 11:00 KST · COMPLETED · 코멘트 포함
  INSERT INTO bookings (
    teacher_user_id, student_user_id, start_at, duration_min, status,
    lesson_title_snapshot, completed_at, teacher_private_comment, student_comment
  )
  VALUES (
    v_teacher_id, v_student_id,
    ((v_today_kst - 7)::text || ' 11:00:00+09:00')::timestamptz,
    60, 'COMPLETED',
    '지난 주 피아노 — 자세 교정',
    ((v_today_kst - 7)::text || ' 12:00:00+09:00')::timestamptz,
    '학생 자세 안정됨. 다음 주 손목 풀기 추가.',
    '오늘 정말 즐거웠어요. 다음 주 기대됩니다!'
  )
  ON CONFLICT DO NOTHING;

  -- ──────────────────────────────────────────────────────────────
  -- 5. 데모 패치노트 (admin 작성)
  -- ──────────────────────────────────────────────────────────────

  IF NOT EXISTS (SELECT 1 FROM admin_patch_notes WHERE title = 'v0.1.0 — Coral Blush 디자인 적용') THEN
    INSERT INTO admin_patch_notes (title, body, created_by_user_id)
    VALUES (
      'v0.1.0 — Coral Blush 디자인 적용',
      E'코랄·핑크를 주색으로 한 따뜻한 디자인 언어로 전면 리뉴얼.\n- 로그인 화면 좌 그라데이션 패널\n- 학생 슬롯 칩 4상태 (예약 가능 / 내 예약 / 마감 / 휴무)\n- 선생님 통계 스트립 4분할 + 알림 2칸\n- 관리자 역할 칩 색상 (학생 코랄 / 선생님 로즈 / 관리자 그린)',
      (SELECT id FROM users WHERE email = 'admin' LIMIT 1)
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM admin_patch_notes WHERE title = 'v0.1.1 — Vercel + Supabase 인프라') THEN
    INSERT INTO admin_patch_notes (title, body, created_by_user_id)
    VALUES (
      'v0.1.1 — Vercel + Supabase 인프라',
      E'Docker 로컬 → Vercel(호스팅) + Supabase(Postgres) 로 이전.\n- 정적 프론트는 Vercel CDN 으로 배포\n- Express 백엔드는 단일 Serverless Function 으로 래핑\n- setInterval 스케줄러 2건을 pg_cron 잡으로 이관 (자동 완료 / 게스트 정리)',
      (SELECT id FROM users WHERE email = 'admin' LIMIT 1)
    );
  END IF;

END $$;

-- ============================================================
-- 검증 쿼리 (수동 실행)
-- ============================================================
-- SELECT email, role, account_tier, name FROM users ORDER BY id;
-- SELECT teacher_user_id, weekday, start_time_local, end_time_local FROM weekly_availabilities ORDER BY weekday;
-- SELECT status, start_at, lesson_title_snapshot FROM bookings ORDER BY start_at;
-- SELECT title, created_at FROM admin_patch_notes ORDER BY created_at DESC;
