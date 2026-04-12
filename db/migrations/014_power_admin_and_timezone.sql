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
