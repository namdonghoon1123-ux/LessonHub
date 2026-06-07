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
