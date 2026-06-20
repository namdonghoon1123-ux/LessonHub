-- 자동 완료 배치: 매분 BOOKED → COMPLETED (수업 종료 시각 경과 시)
-- pg_cron 확장 필요 (Supabase 기본 제공). 0001_init.sql 적용 후 실행.
-- 이미 등록돼 있으면 unschedule 후 재등록.

create extension if not exists pg_cron;

select cron.unschedule('auto-complete-bookings')
  where exists (select 1 from cron.job where jobname = 'auto-complete-bookings');

select cron.schedule(
  'auto-complete-bookings',
  '* * * * *',
  $$ select public.auto_complete_bookings() $$
);
