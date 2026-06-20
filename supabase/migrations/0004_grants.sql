-- Supabase 역할 GRANT (raw postgres 접속으로 테이블을 만들면 자동 grant가 안 붙으므로 수동 부여).
-- 행 단위 접근은 RLS가 통제하고, 이 GRANT는 테이블 단위 접근 권한만 부여한다.
-- service_role은 BYPASSRLS → 서버(secret 키) 작업 전체 허용.

grant usage on schema public to anon, authenticated, service_role;

-- 기존 객체
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines  in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all routines in schema public to authenticated;

grant select on all tables in schema public to anon;
grant execute on all routines in schema public to anon;

-- 향후 생성 객체 기본 권한
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines  to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant select on tables to anon;
