-- ⚠️ 파괴적: public 스키마의 모든 테이블/타입/뷰/함수를 삭제하고 재생성한다.
-- auth/storage 등 Supabase 관리 스키마는 건드리지 않는다.
-- 실행 순서: reset.sql → migrations/0001_init.sql

drop schema public cascade;
create schema public;

grant usage on schema public to anon, authenticated, service_role;
grant all   on schema public to postgres, service_role;
