-- 이메일 없이 '아이디'(한글 가능) 로그인 지원: profiles.username (고유)
alter table public.profiles add column if not exists username text unique;

-- 가입/생성 시 metadata.username을 profiles에 반영하도록 트리거 갱신
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta     jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  role_val user_role := coalesce((meta->>'role')::user_role, 'STUDENT');
begin
  insert into public.profiles (id, name, email, username, role, student_tier, must_change_password)
  values (
    new.id,
    coalesce(nullif(meta->>'name',''), nullif(meta->>'username',''), split_part(coalesce(new.email,''), '@', 1), '사용자'),
    new.email,
    nullif(meta->>'username',''),
    role_val,
    case when role_val = 'STUDENT'
         then coalesce((meta->>'tier')::student_tier, 'FULL')
         else null end,
    coalesce((meta->>'must_change_password')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 기존 데모 계정: 이메일 local-part를 아이디로 백필(이메일 로그인도 계속 가능)
update public.profiles
  set username = split_part(email, '@', 1)
  where username is null and email is not null;
