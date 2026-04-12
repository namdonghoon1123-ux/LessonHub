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
