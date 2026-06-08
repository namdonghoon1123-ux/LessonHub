-- 022: 노쇼(NO_SHOW) 처리
-- NO_SHOW 상태값은 001_init 의 bookings.status CHECK 제약에 이미 포함되어 있다.
-- 여기서는 "언제 노쇼로 표시했는지" 기록용 컬럼과, 학생별 노쇼 누적 집계용 인덱스만 추가한다.
--
-- 설계 메모: 자동완료(BOOKED→COMPLETED)가 수업 종료 즉시 동작하므로
-- "자동 노쇼"는 자동완료와 충돌한다. 따라서 노쇼는 선생님이 수동으로 표시한다.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMPTZ;

-- 학생별 노쇼 누적 카운트 집계 가속
CREATE INDEX IF NOT EXISTS idx_bookings_student_no_show
  ON bookings (student_user_id)
  WHERE status = 'NO_SHOW';
