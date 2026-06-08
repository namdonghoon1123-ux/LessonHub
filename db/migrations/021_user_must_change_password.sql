-- 021: 첫 로그인 강제 비밀번호 변경
-- 선생님이 만든 임시 학생 계정 / 관리자가 초기화한 비밀번호처럼
-- "임시 비밀번호"로 시작하는 계정은 첫 로그인 시 비밀번호 변경을 강제한다.
-- 본인이 비밀번호를 직접 변경하면 플래그가 해제된다.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- 조회용 인덱스 (강제 변경 대상 카운트 등)
CREATE INDEX IF NOT EXISTS idx_users_must_change_password
  ON users (must_change_password)
  WHERE must_change_password = TRUE;
