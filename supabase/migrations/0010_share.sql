-- 레슨 공유 링크용 토큰 (예약별, 안정적) + 공유 문구 템플릿(선생님별)
alter table public.bookings add column if not exists share_token uuid not null default gen_random_uuid();
-- 기존 행 토큰 보강(혹시 null이면)
update public.bookings set share_token = gen_random_uuid() where share_token is null;
create unique index if not exists uniq_bookings_share_token on public.bookings(share_token);

alter table public.teacher_profiles add column if not exists share_message_template text;
