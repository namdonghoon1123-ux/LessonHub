-- TEACHER 역할 profiles에 teacher_profiles 행을 자동 보장.
-- (관리자 생성/역할 변경 시 teacher_profiles 누락 → 학생에게 안 보이던 문제 방지)
create or replace function public.ensure_teacher_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'TEACHER' then
    insert into public.teacher_profiles (teacher_id)
    values (new.id)
    on conflict (teacher_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ensure_teacher_profile_ins on public.profiles;
create trigger trg_ensure_teacher_profile_ins
  after insert on public.profiles
  for each row execute function public.ensure_teacher_profile();

drop trigger if exists trg_ensure_teacher_profile_upd on public.profiles;
create trigger trg_ensure_teacher_profile_upd
  after update of role on public.profiles
  for each row when (new.role = 'TEACHER')
  execute function public.ensure_teacher_profile();

-- 기존 TEACHER 백필
insert into public.teacher_profiles (teacher_id)
select p.id from public.profiles p
where p.role = 'TEACHER'
  and not exists (select 1 from public.teacher_profiles t where t.teacher_id = p.id);
