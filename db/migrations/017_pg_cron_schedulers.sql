-- Supabase pg_cron 기반 스케줄러
-- Vercel Serverless 환경에서는 setInterval 백그라운드 작업이 불가능하므로
-- backend/src/index.js의 startAutoCompletionScheduler / startGuestRetentionScheduler
-- 를 데이터베이스 측 cron job 으로 이관한다.
--
-- 적용 환경: Supabase (또는 pg_cron 확장이 활성화된 PostgreSQL)
-- Docker 로컬 환경에서는 이 파일은 NO-OP 으로 건너뛴다.

DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not available, skipping scheduler migration (likely local Docker)';
    RETURN;
  END IF;

  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- 기존 등록된 잡 정리 (멱등 보장)
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('lh-auto-complete', 'lh-guest-retention');

  -- 1) 자동 완료: 매 분, BOOKED → COMPLETED (수업 종료 시각 경과)
  PERFORM cron.schedule(
    'lh-auto-complete',
    '* * * * *',
    $job$
      UPDATE bookings
      SET status = 'COMPLETED',
          completed_at = COALESCE(completed_at, NOW()),
          updated_at = NOW()
      WHERE status = 'BOOKED'
        AND (start_at + make_interval(mins => duration_min)) <= NOW();
    $job$
  );

  -- 2) 게스트 보존 정리: 매일 02:00 KST (UTC 17:00), 365일 기준
  PERFORM cron.schedule(
    'lh-guest-retention',
    '0 17 * * *',
    $job$
      UPDATE bookings
      SET guest_student_name = NULL,
          public_access_token_hash = NULL,
          public_access_token_expires_at = NULL,
          public_access_created_at = NULL,
          public_access_revoked_at = NOW(),
          updated_at = NOW()
      WHERE guest_student_id IS NOT NULL
        AND start_at < NOW() - make_interval(days => 365);

      DELETE FROM guest_students gs
      WHERE NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.guest_student_id = gs.id
          AND b.start_at >= NOW() - make_interval(days => 365)
      );
    $job$
  );
END;
$migration$;
