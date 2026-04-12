ALTER TABLE users
  ADD COLUMN IF NOT EXISTS assigned_teacher_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_assigned_teacher_user_id
  ON users (assigned_teacher_user_id)
  WHERE assigned_teacher_user_id IS NOT NULL;
