-- 023: 반복(정기) 예약
-- "매주 같은 요일/시간, N회" 형태의 정기 등록.
-- 마스터(recurring_series) 1건이 자식 bookings N건을 묶는다.
-- 개별 회차 취소는 기존 bookings 취소를 그대로 쓰고,
-- 전체 시리즈 취소는 series_id 로 미래 회차를 일괄 취소한다.

CREATE TABLE IF NOT EXISTS recurring_series (
  id BIGSERIAL PRIMARY KEY,
  teacher_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time_local TEXT NOT NULL,        -- 'HH:MM:SS' (Asia/Seoul 기준)
  duration_min INT NOT NULL CHECK (duration_min > 0),
  lesson_title TEXT,
  requested_count INT NOT NULL CHECK (requested_count > 0),
  created_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  canceled_at TIMESTAMPTZ NULL
);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS recurring_series_id BIGINT REFERENCES recurring_series(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_recurring_series
  ON bookings (recurring_series_id)
  WHERE recurring_series_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_series_teacher ON recurring_series (teacher_user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_series_student ON recurring_series (student_user_id);
