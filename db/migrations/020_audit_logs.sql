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
