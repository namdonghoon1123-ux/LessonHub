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
