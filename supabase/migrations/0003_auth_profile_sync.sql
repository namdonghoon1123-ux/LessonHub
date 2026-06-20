-- auth.users insert 시 public.profiles 자동 생성.
-- 가입/관리자 생성 시 metadata로 name/role/tier/must_change_password 전달 가능.
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
  insert into public.profiles (id, name, email, role, student_tier, must_change_password)
  values (
    new.id,
    coalesce(nullif(meta->>'name',''), split_part(coalesce(new.email,''), '@', 1), '사용자'),
    new.email,
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
