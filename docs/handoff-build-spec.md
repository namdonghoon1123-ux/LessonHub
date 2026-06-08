# LessonHub · Build Spec (UI 재작성용 핸드오프)

> **목적**: 디자인/UIUX 를 **처음부터 다시 만들 때** 누락 없이 참고할 수 있는 단일 명세.
> **포함**: 기능 · API · DB 스키마 · Supabase/Vercel 연동 · 비즈니스 규칙 · 시드/데모 · 환경변수.
> **제외**: 화면 디자인 · 색·타이포·레이아웃 (UI 는 새로 만들 예정).
> **DB**: 그대로 활용 (스키마 변경 없음).

---

## 0. 한 줄 요약

**개인 1:1 레슨 예약 SaaS**. 학생은 선생님의 가능 시간을 보고 예약, 선생님은 시간표·예외·예약을 관리, 파워관리자는 사용자·연결·정책을 운영. 기본 시간대 `Asia/Seoul`, 자체 JWT 인증, Vercel(호스팅·서버리스) + Supabase(PostgreSQL).

---

## 1. 아키텍처

```
┌─────────────────────────────────────────┐
│  Browser (User Agent)                   │
│  - 정적 HTML/JS (frontend/*)            │ ──┐
│  - JWT token in localStorage('lb_token')│   │
└────────────────────┬────────────────────┘   │
                     │ HTTPS                  │
                     ▼                         │
┌─────────────────────────────────────────┐   │
│  Vercel CDN + Serverless Functions      │   │
│  - 정적 파일 서빙 (frontend/)            │ ◀─┘
│  - vercel.json rewrites: /api/* → /api  │
│  - api/index.js (Express app wrapper)   │
│  - 함수 메모리 512 MB, maxDuration 30s  │
│  - 보안 헤더 (HSTS, X-Frame-Options 등) │
└────────────────────┬────────────────────┘
                     │ TCP (transaction pooler)
                     ▼
┌─────────────────────────────────────────┐
│  Supabase Postgres (Mumbai ap-south-1)  │
│  - 9 base tables + 1 cron extension    │
│  - pg_cron 잡 2건                       │
│  - bcrypt password (자체 인증)           │
└─────────────────────────────────────────┘
```

**책임 분리**:
- **Frontend** (정적 HTML/JS) — 인증 토큰 보관, API 호출, DOM 렌더
- **Backend** (Express on Vercel) — 비즈니스 로직, JWT 발급/검증, DB 쿼리, audit log
- **DB** (Supabase) — 데이터 저장, pg_cron 으로 백그라운드 작업 (자동 완료, 게스트 정리)

---

## 2. 인프라 연동 정보

### 2.1 Supabase

| 항목 | 값 |
|---|---|
| Project ref | `vhxmcdgnpshklktmbgng` |
| Project URL | `https://vhxmcdgnpshklktmbgng.supabase.co` |
| Region | `ap-south-1` (Mumbai) |
| Plan | Free |
| 인증 방식 | **자체 JWT** (Supabase Auth 미사용). users 테이블에서 직접 bcrypt 검증 |

**Connection strings**:
| 용도 | URI 패턴 | Port |
|---|---|---|
| **Vercel runtime (필수)** | `postgresql://postgres.vhxmcdgnpshklktmbgng:[PWD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | 6543 (Transaction pooler, IPv4) |
| 마이그레이션·시드 (session) | `postgresql://postgres.vhxmcdgnpshklktmbgng:[PWD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres` | 5432 (Session pooler) |
| Direct (IPv6 only) | `postgresql://postgres:[PWD]@db.vhxmcdgnpshklktmbgng.supabase.co:5432/postgres` | ⚠️ Vercel 에서 닿지 않음 |

**스키마 적용**: `scripts/supabase-bootstrap.sql` 통째로 실행 (마이그레이션 022개 + 시드 멱등 보장).
**데모 데이터**: `scripts/supabase-demo-data.sql` 실행 (admin/teacher/student 계정 + 예약 4건).

### 2.2 Vercel

| 항목 | 값 |
|---|---|
| Project | `lesson-hub-eta` (또는 본인 도메인) |
| Build command | `npm run vercel-build` (no-op) |
| Output | `frontend/` |
| Function | `api/index.js` (Express app wrapper) |
| Rewrites | `/api/(.*)` → `/api`, `/t/:slug` → `/p.html?t=:slug` |

### 2.3 환경변수

| Key | 필수 | 설명 |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase pooler URI (port 6543) |
| `JWT_SECRET` | ✅ | JWT 서명 키 (32 바이트 hex, `openssl rand -hex 32`) |
| `NODE_ENV` | ✅ (prod) | `production` |
| `OAUTH_KAKAO_CLIENT_ID` | 선택 | 카카오 OAuth — 활성화 시 `/api/v1/auth/social/providers` 응답에 enabled=true |
| `OAUTH_GOOGLE_CLIENT_ID` | 선택 | (현재 미사용) |
| `OAUTH_NAVER_CLIENT_ID` | 선택 | (현재 미사용) |
| `APP_CONFIG_FILE` | 선택 | 다른 경로의 app.config.json |
| `AUTO_COMPLETE_POLL_MS` | 선택 | setInterval 폴링 (Vercel 에서는 무시 — pg_cron 사용) |
| `GUEST_RETENTION_POLL_MS` | 선택 | 동일 |

---

## 3. 사용자 역할

| Role | 로그인 ID 예 | 진입 화면 | 핵심 액션 |
|---|---|---|---|
| `STUDENT` | `student@example.com` | 학생 캘린더 / 내 예약 / 설정 | 담당 선생 검색·연결·해제 / 슬롯 보고 예약 / 본인 예약 취소 / 반복 예약 / 정식 전환 (TEMP→FULL) / 본인 정보·비번 |
| `TEACHER` | `teacher@example.com` | 선생 주간 / 시간표·예외 / 예약 관리 / 완료 / 설정 | 주간 가능시간·일회용·예외 등록 / 임시 학생 생성·연결 / 예약 승인·완료·노쇼·취소 / 코멘트 / 공개 프로필 slug |
| `POWER_ADMIN` | `admin` | 파워관리자 콘솔 | 사용자 CRUD / 강제 학생-선생 연결 / 비번 강제 reset / 패치노트 작성 / 통계·활동·audit log 조회 / 정책 |

**학생 계정 티어**:
- `FULL` — 정식 가입 (회원가입 또는 정식 전환)
- `TEMP` — 선생이 만든 임시 계정 (학생이 PATCH `/students/me/upgrade` 로 정식 전환)

**`must_change_password` 플래그**: 임시 학생 생성 시 / 관리자 비번 reset 시 `TRUE` → 다음 로그인 후 강제 변경 화면.

---

## 4. 데이터 모델 (Supabase Postgres · 변경 금지)

> 22 마이그레이션 (`001_init.sql` ~ `023_recurring_bookings.sql`) 결과 스키마. **DB 그대로 활용 — 새 UI 는 이 스키마를 정답으로**.

### 4.1 users (모든 계정)
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('TEACHER', 'STUDENT', 'POWER_ADMIN')),
  email TEXT NOT NULL UNIQUE,            -- 로그인 ID 로 사용
  password_hash TEXT NOT NULL,           -- bcrypt
  name TEXT NOT NULL,
  phone_normalized TEXT UNIQUE NULL,     -- 11자리 숫자, NULL 가능
  assigned_teacher_user_id BIGINT REFERENCES users(id),  -- 학생만 사용
  account_tier TEXT DEFAULT 'FULL' CHECK (account_tier IN ('FULL', 'TEMP')),
  temp_created_by_teacher_user_id BIGINT REFERENCES users(id) NULL,
  upgraded_to_full_at TIMESTAMPTZ NULL,
  is_active BOOLEAN DEFAULT TRUE,        -- soft delete
  deactivated_at TIMESTAMPTZ NULL,
  deactivated_reason TEXT NULL,
  must_change_password BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_assigned_teacher ON users(assigned_teacher_user_id) WHERE assigned_teacher_user_id IS NOT NULL;
CREATE INDEX idx_users_account_tier ON users(account_tier);
CREATE INDEX idx_users_temp_created_by ON users(temp_created_by_teacher_user_id) WHERE temp_created_by_teacher_user_id IS NOT NULL;
```

### 4.2 teacher_profiles
```sql
CREATE TABLE teacher_profiles (
  teacher_user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lesson_duration_min INT DEFAULT 60 CHECK (lesson_duration_min > 0),
  timezone TEXT DEFAULT 'Asia/Seoul',
  cancel_cutoff_hours INT DEFAULT 6 CHECK (cancel_cutoff_hours >= 0),  -- 선생 취소 마감
  booking_window_days INT DEFAULT 30 CHECK (booking_window_days > 0), -- 예약 가능 기간
  student_cancel_day_before_hour INT DEFAULT 21 CHECK (student_cancel_day_before_hour BETWEEN 0 AND 23),
  student_notice TEXT NULL,
  display_name TEXT NULL,                -- 학생에게 보이는 이름 (없으면 users.name)
  bio TEXT NULL,
  public_slug TEXT NULL,                 -- /t/<slug> 공개 프로필
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT teacher_profiles_public_slug_format_chk
    CHECK (public_slug IS NULL OR public_slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$')
);
CREATE UNIQUE INDEX uq_teacher_profiles_public_slug
  ON teacher_profiles(public_slug) WHERE public_slug IS NOT NULL;
```

### 4.3 weekly_availabilities (주간 반복 가능시간)
```sql
CREATE TABLE weekly_availabilities (
  id BIGSERIAL PRIMARY KEY,
  teacher_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  weekday INT CHECK (weekday BETWEEN 0 AND 6),  -- 0=일, 6=토
  start_time_local TIME NOT NULL,
  end_time_local TIME NOT NULL CHECK (start_time_local < end_time_local),
  is_active BOOLEAN DEFAULT TRUE,
  lesson_title TEXT NULL,
  lesson_note TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_weekly_teacher_weekday_active ON weekly_availabilities(teacher_user_id, weekday, is_active);
CREATE UNIQUE INDEX uq_weekly_teacher_slot ON weekly_availabilities(teacher_user_id, weekday, start_time_local, end_time_local);
```

### 4.4 one_time_availabilities (특정 날짜 일회용)
```sql
CREATE TABLE one_time_availabilities (
  id BIGSERIAL PRIMARY KEY,
  teacher_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  date_local DATE NOT NULL,
  start_time_local TIME NOT NULL,
  end_time_local TIME NOT NULL CHECK (start_time_local < end_time_local),
  is_active BOOLEAN DEFAULT TRUE,
  lesson_title TEXT NULL,
  lesson_note TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_one_time_teacher_date_active ON one_time_availabilities(teacher_user_id, date_local, is_active);
CREATE UNIQUE INDEX uq_one_time_teacher_slot ON one_time_availabilities(teacher_user_id, date_local, start_time_local, end_time_local);
```

### 4.5 availability_exceptions (예외 · 휴무 · 휴강)
```sql
CREATE TABLE availability_exceptions (
  id BIGSERIAL PRIMARY KEY,
  teacher_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  date_local DATE NOT NULL,
  start_time_local TIME NULL,            -- NULL + end NULL = 종일 휴무
  end_time_local TIME NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (start_time_local IS NULL AND end_time_local IS NULL) OR
    (start_time_local IS NOT NULL AND end_time_local IS NOT NULL AND start_time_local < end_time_local)
  )
);
CREATE INDEX idx_exceptions_teacher_date ON availability_exceptions(teacher_user_id, date_local);
CREATE UNIQUE INDEX uq_exceptions_partial ON availability_exceptions(teacher_user_id, date_local, start_time_local, end_time_local)
  WHERE start_time_local IS NOT NULL AND end_time_local IS NOT NULL;
CREATE UNIQUE INDEX uq_exceptions_all_day ON availability_exceptions(teacher_user_id, date_local)
  WHERE start_time_local IS NULL AND end_time_local IS NULL;
```

### 4.6 bookings (예약 · 수업 기록)
```sql
CREATE TABLE bookings (
  id BIGSERIAL PRIMARY KEY,
  teacher_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  student_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE NULL,
  guest_student_id BIGINT REFERENCES guest_students(id) NULL,
  guest_student_name TEXT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  duration_min INT CHECK (duration_min > 0),
  status TEXT CHECK (status IN (
    'PENDING', 'BOOKED',
    'CANCELED_BY_STUDENT', 'CANCELED_BY_TEACHER',
    'COMPLETED', 'NO_SHOW'
  )),
  canceled_at TIMESTAMPTZ NULL,
  cancel_reason TEXT NULL,
  completed_at TIMESTAMPTZ NULL,
  no_show_at TIMESTAMPTZ NULL,
  teacher_private_comment TEXT NULL,      -- 선생만 보는 메모
  teacher_comment TEXT NULL,              -- (구 컬럼, 호환용)
  student_comment TEXT NULL,              -- 학생 코멘트
  lesson_title_snapshot TEXT NULL,
  public_access_token_hash TEXT NULL,     -- 게스트 공유 링크
  public_access_token_expires_at TIMESTAMPTZ NULL,
  public_access_created_at TIMESTAMPTZ NULL,
  public_access_revoked_at TIMESTAMPTZ NULL,
  recurring_series_id BIGINT REFERENCES recurring_series(id) NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (student_user_id IS NOT NULL AND guest_student_id IS NULL) OR
    (student_user_id IS NULL AND guest_student_id IS NOT NULL)
  )
);
-- 같은 선생·시각에 PENDING/BOOKED 중복 방지
CREATE UNIQUE INDEX uq_bookings_teacher_start_active ON bookings(teacher_user_id, start_at)
  WHERE status IN ('PENDING', 'BOOKED');
CREATE INDEX idx_bookings_student_start ON bookings(student_user_id, start_at);
CREATE INDEX idx_bookings_teacher_start ON bookings(teacher_user_id, start_at);
CREATE INDEX idx_bookings_guest_student_start ON bookings(guest_student_id, start_at);
```

### 4.7 recurring_series (반복 예약 시리즈)
```sql
CREATE TABLE recurring_series (
  id BIGSERIAL PRIMARY KEY,
  teacher_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  student_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  weekday INT CHECK (weekday BETWEEN 0 AND 6),
  start_time_local TIME NOT NULL,
  duration_min INT NOT NULL,
  total_count INT NOT NULL,
  first_date_local DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.8 guest_students (비회원 예약 · 현재 410 비활성)
```sql
CREATE TABLE guest_students (
  id BIGSERIAL PRIMARY KEY,
  phone_normalized TEXT UNIQUE,
  pin_hash TEXT NOT NULL,                -- 4자리 PIN bcrypt
  contact_name TEXT NULL,
  pin_failed_attempts INT DEFAULT 0 CHECK (pin_failed_attempts >= 0),
  pin_locked_until TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.9 auth_token_revocations (logout 시 토큰 차단)
```sql
CREATE TABLE auth_token_revocations (
  token_id TEXT PRIMARY KEY,             -- JWT jti claim
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL NULL,
  expires_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_auth_token_revocations_expires ON auth_token_revocations(expires_at);
```

### 4.10 admin_patch_notes
```sql
CREATE TABLE admin_patch_notes (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,                   -- max 140
  body TEXT NOT NULL,                    -- max 8000
  created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_admin_patch_notes_created ON admin_patch_notes(created_at DESC, id DESC);
```

### 4.11 audit_logs (관리자 액션 추적)
```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,                  -- 'admin.user.create' 등
  target_type TEXT NULL,
  target_id BIGINT NULL,
  payload JSONB NULL,
  ip_inet INET NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_actor_created ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX idx_audit_action_created ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

### 4.12 pg_cron 잡 (Supabase 측 백그라운드)
```sql
-- 매분: BOOKED + 종료시간 경과 → COMPLETED
SELECT cron.schedule('lh-auto-complete', '* * * * *', $$
  UPDATE bookings
  SET status='COMPLETED', completed_at=COALESCE(completed_at, NOW()), updated_at=NOW()
  WHERE status='BOOKED' AND (start_at + make_interval(mins => duration_min)) <= NOW();
$$);

-- 매일 17:00 UTC (02:00 KST): 365일 지난 게스트 예약 익명화 + 고아 guest_students 삭제
SELECT cron.schedule('lh-guest-retention', '0 17 * * *', $$ ... $$);
```

---

## 5. API 명세 (61 endpoints)

### 인증 응답 헤더
```
Authorization: Bearer <JWT>
```
JWT payload: `{ sub: userId, role, email, jti }` · 만료 7일.

### 5.1 인증 (`/api/v1/auth/*`)

| Method | Path | Body | 응답 |
|---|---|---|---|
| POST | `/register` | `{login_id, password, name, phone, role}` | `{token, user}` |
| POST | `/login` | `{login_id, password}` | `{token, user, must_change_password?}` |
| POST | `/logout` (auth) | — | `{ok:true}` |
| GET | `/me` (auth) | — | `{user}` |
| POST | `/recover/login-id` | `{name, phone}` | `{login_id}` 또는 mask |
| POST | `/recover/password` | `{login_id, name, phone, new_password}` | `{ok:true}` |
| GET | `/social/providers` | — | `{items: [{provider, enabled, setup_required, implemented}]}` |
| POST | `/social/:provider/start` | — | `{start_url}` 또는 503/501 |

`role` 값: `STUDENT` / `TEACHER` (POWER_ADMIN 은 self-register 불가).
**Rate limit**: login/register/recover 는 프로덕션에서 제한.

### 5.2 본인 (`/api/v1/users/me/*`, `/api/v1/students/me/*`)

| Method | Path | Body | 응답 |
|---|---|---|---|
| PATCH | `/users/me/profile` (auth) | `{name?, phone?}` | `{user}` |
| PATCH | `/users/me/password` (auth) | `{current_password, new_password}` | `{ok:true}` (must_change_password 해제) |
| POST | `/students/me/upgrade` (student) | `{login_id, phone, password, name}` | `{token, user}` (TEMP→FULL) |
| GET | `/students/me/teachers/search?q=...` (student) | — | `{items}` |
| PATCH | `/students/me/teacher` (student) | `{teacher_user_id?, teacher_login_id?}` | `{user, teacher}` |
| DELETE | `/students/me/teacher` (student) | — | `{user}` |

### 5.3 선생님 시간표·예외 (`/api/v1/teachers/me/*`)

| Method | Path | Body | 비고 |
|---|---|---|---|
| GET / POST | `/availability[/:id]` | `{weekday, start_time_local, end_time_local, lesson_title?, lesson_note?}` | 주간 반복 |
| PATCH / DELETE | `/availability/:id` | (동일) | |
| GET / POST / DELETE | `/one-time-availability[/:id]` | `{date_local, ...}` | 일회용 |
| GET / POST / DELETE | `/exceptions[/:id]` | `{date_local, start_time_local?, end_time_local?, reason?}` | 시간 NULL = 종일 |

### 5.4 선생님 프로필 + 학생 관리

| Method | Path | Body | 응답 |
|---|---|---|---|
| GET | `/teachers/me/profile` | — | `{item: {lesson_duration_min, timezone, ..., public_slug}}` |
| PATCH | `/teachers/me/profile` | `{display_name?, bio?, student_notice?, student_cancel_day_before_hour?, lesson_duration_min?}` | `{item}` |
| PATCH | `/teachers/me/profile/slug` | `{public_slug: 'jiwon-piano' \| ''}` | `{slug}` |
| GET | `/teachers/me/students` | — | `{items}` |
| PATCH | `/teachers/me/students/assign` | `{student_user_id?, student_login_id?}` | `{user}` (이미 다른 선생 → 409) |
| POST | `/teachers/me/students/temp` | `{name, phone, password}` | `{user, default_password}` |
| PATCH | `/teachers/me/guest-students/:id/reset-pin` | `{pin}` | `{ok:true}` |

### 5.5 슬롯 + 예약 (학생 측)

| Method | Path | Query/Body | 응답 |
|---|---|---|---|
| GET | `/teachers` (auth) | — | `{items}` |
| GET | `/teachers/:teacherId/slots?from=ISO&to=ISO&step_min=60` | — | `{items: [{start_at, end_at, duration_min, is_available, lesson_title?}]}` |
| POST | `/bookings` (student) | `{teacher_user_id, start_at}` | `{item, status='PENDING'}` |
| GET | `/bookings/me` (student) | — | `{items}` |
| POST | `/bookings/:id/cancel` (owner) | `{reason?}` | `{item}` (학생 취소 마감 통과 시 422) |
| POST | `/bookings/recurring` (student) | `{teacher_user_id, weekday, start_time_local, duration_min, total_count, first_date_local}` | `{series, items}` |
| POST | `/bookings/series/:id/cancel` (student) | — | `{count: 미래회차 취소수}` |

### 5.6 예약 관리 (선생님 측)

| Method | Path | Body | 응답 |
|---|---|---|---|
| GET | `/teachers/me/bookings?from=&to=&status=` | — | `{items}` |
| POST | `/teachers/me/bookings` | `{student_user_id, start_at, duration_min, lesson_title?}` | `{item}` (선생이 학생 지정 예약) |
| POST | `/teachers/me/bookings/:id/approve` | — | PENDING → BOOKED |
| POST | `/teachers/me/bookings/:id/complete` | `{teacher_private_comment?, student_comment?}` | BOOKED/COMPLETED 보완 |
| POST | `/teachers/me/bookings/:id/no-show` | — | BOOKED → NO_SHOW |

### 5.7 공개 (인증 불필요)

| Method | Path | 응답 |
|---|---|---|
| GET | `/public/teachers/:slug` | `{teacher: {name, display_name, bio, lesson_duration_min, ...}, stats: {weekly_blocks_active}}` |
| POST | `/public/bookings` | 410 (현재 비활성, 게스트 흐름 보존) |
| POST | `/public/bookings/lookup` | 410 |
| POST | `/public/bookings/:id/cancel` | 410 |
| POST | `/public/bookings/:id/cancel-by-token` | 410 |

### 5.8 POWER_ADMIN

| Method | Path | Body / Query | 응답 |
|---|---|---|---|
| GET | `/admin/summary` | — | `{users: {teacher, student, admin, paused}, bookings: {today, week, pending}}` |
| GET | `/admin/activity` | — | `{items}` |
| GET | `/admin/users?role=&q=&include_inactive=` | — | `{items}` |
| POST | `/admin/users` | `{role, login_id, password, name, phone?}` | `{user}` |
| PATCH | `/admin/users/:id/password` | `{new_password}` | `{item}` (must_change_password TRUE 설정) |
| DELETE | `/admin/users/:id` | — | soft delete + email/phone 무작위 변조 |
| PATCH | `/admin/students/:id/teacher` | `{teacher_user_id?, teacher_login_id?}` (둘 다 비우면 해제) | `{user, teacher}` |
| GET / POST | `/admin/patch-notes` | `{title, body}` (POST) | `{items}` / `{item}` |
| GET | `/admin/policy` | — | `{roles}` (역할별 권한 정의) |
| GET | `/admin/audit-log?action=&actor_email=&limit=50&offset=0` | — | `{items, paging}` |

**Audit hook** (자동 기록): `admin.user.create / .delete / .password_reset / .student.teacher.assign / .clear / .patch_note.create`.

### 5.9 운영

| Method | Path | 응답 |
|---|---|---|
| GET | `/health`, `/api/health`, `/api/v1/health` | `{ok, db: {ok, latency_ms}, uptime_ms, response_ms, now}` |
| GET | `/api/version`, `/api/v1/version` | `{version, build, node_env, service_timezone, now}` |

---

## 6. 핵심 비즈니스 규칙

| 규칙 | 내용 |
|---|---|
| **시간대** | 모든 `*_local` 컬럼은 `teacher_profiles.timezone` 기준 (기본 `Asia/Seoul`). 서버 응답의 `start_at` 은 `TIMESTAMPTZ` |
| **슬롯 계산** | `weekly_availabilities` + `one_time_availabilities` − `availability_exceptions` − 기존 PENDING/BOOKED/COMPLETED(미완료) booking ⋂ `[now, now + booking_window_days]` |
| **`lesson_duration_min`** | 선생님 프로필 단위. 슬롯이 이 단위로 분할 (`step_min` 으로 학생 조회 시 더 작게 가능: 10/15/30/60) |
| **취소 마감 (학생)** | 수업 전날 `student_cancel_day_before_hour:00:00` (선생 timezone 기준) 까지. 통과 시 422 `cancel_cutoff_passed` |
| **취소 마감 (선생)** | 수업 시작 `cancel_cutoff_hours` 전까지 |
| **자동 완료** | `pg_cron` 매분: `BOOKED` 이면서 `start_at + duration_min ≤ NOW()` → `COMPLETED` (completed_at 자동) |
| **노쇼** | 선생이 수동 처리 (`/no-show`). NO_SHOW + no_show_at. 학생별 누적 카운트는 별도 집계 (UI 에서 사용) |
| **반복 예약** | `recurring_series` 생성 + N 개 자식 bookings. 시리즈 일괄 취소 = 미래 회차만 CANCELED_BY_STUDENT |
| **중복 차단** | `(teacher_user_id, start_at)` UNIQUE WHERE status IN (PENDING, BOOKED) |
| **공개 프로필** | `teacher_profiles.public_slug` 설정 시 `/api/v1/public/teachers/:slug` 비로그인 접근 |
| **POWER_ADMIN 보호** | 마지막 활성 PA 삭제 시 409 `cannot_delete_last_power_admin` |
| **Soft delete** | `is_active=FALSE` + email/phone 무작위 변조 (`deleted_u{id}_{ts}_{suffix}`) + 학생 연결 해제 (트랜잭션) |
| **게스트 보존** | 365일 지나면 phone/PIN/access token 익명화. 고아 guest_students 는 삭제 (pg_cron 매일) |
| **첫 로그인 강제 비번** | `must_change_password=TRUE` → 로그인 응답에 플래그 포함 → 클라이언트가 강제 모달 표시 |
| **Rate limit** | login/register/recover 에 IP+path 기반 슬라이딩 윈도우 (프로덕션) |
| **Audit log** | 모든 POWER_ADMIN 변경 액션 자동 기록 (`audit_logs` 테이블) |

---

## 7. 시드 데이터 + 데모 계정

### 7.1 시드 (`db/seeds/001_seed.sql`)
- 3 계정: `teacher@example.com` (TEACHER), `student@example.com` (STUDENT), `poweradmin` (POWER_ADMIN)
- 비밀번호 해시는 알려져 있으나 평문 모름 → 데모 SQL 로 교체 권장

### 7.2 데모 (`scripts/supabase-demo-data.sql`)
| 역할 | 로그인 ID | 비번 | 비고 |
|---|---|---|---|
| POWER_ADMIN | `admin` | `admin123` | 새로 추가, `poweradmin` 은 백업으로 보존 |
| TEACHER | `teacher@example.com` | `teacher123` | display_name='이지원 · 피아노' |
| STUDENT | `student@example.com` | `student123` | assigned_teacher = teacher@example.com |

**시간표**: 월~금 09:00-18:00 / 일회용: 이번 주 토요일 10:00-14:00 (주말 특강) / 예외: 이번 주 일요일 종일 휴무
**예약 4건**: BOOKED 오늘 14:00 / PENDING 내일 10:00 / BOOKED +4일 15:00 / COMPLETED -7일 11:00 (선생·학생 코멘트 포함)
**공개 slug**: `jiwon-piano` → `/t/jiwon-piano`

---

## 8. 미구현 (새 UI 에서 결정)

- 이메일 알림 (Resend 등 API key 필요)
- 결제 (PG 미연결)
- 카카오 OAuth callback (start endpoint 만 있고 토큰교환·사용자매핑 미구현)
- 그룹 수업 (1:N)
- 학생 리뷰/평점
- 채팅·메시지
- Sentry / Vercel Analytics

---

## 9. 환경 사항

- **모든 시간** 은 UTC 로 저장, KST 변환은 응답/표시 시점
- **bcrypt cost**: 10 (모든 비밀번호)
- **JWT**: HS256, 만료 7일, `jti` 로 revoke 추적
- **CORS**: 같은 도메인이라 별도 설정 없음
- **로그**: `console.error` 기반 (Sentry 미연결)
- **테스트 DB**: 통합테스트는 `TRUNCATE` 사용 → 운영 DB 절대 불가, dev 전용

---

## 10. 새 UI 작업 시 핵심 요구

1. **JWT 토큰을 `localStorage` 에 보관** (기존: `lb_token` 키) — 또는 다른 방식이면 모든 호출에 `Authorization: Bearer` 헤더 부착
2. **API base URL** = same origin `/api/v1/...`
3. **로그인 응답의 `must_change_password=true`** 면 강제 비번 변경 화면 표시
4. **타임존**: 사용자에게 표시할 때 `Asia/Seoul` 로 변환
5. **에러 응답**: `{error: 'code', message?}` 형식. 주요 코드:
   - `invalid_credentials`, `cancel_cutoff_passed`, `slot_already_booked`, `slot_already_taken`, `social_login_not_configured`, `social_login_not_implemented`, `cannot_delete_last_power_admin`, `slug_already_taken`, `temp_account_required`, ...
6. **PWA**: manifest, theme-color, apple-touch-icon, service worker — 모바일 홈화면 설치 지원
7. **role-based routing**: 로그인 응답의 `user.role` 에 따라 학생/선생/관리자 진입 화면 분기

---

## 11. 빠른 시작 체크리스트 (새 UI)

- [ ] 새 frontend 프로젝트에서 `same-origin` API base URL 설정
- [ ] JWT 토큰 localStorage 보관 + 모든 fetch 요청 헤더에 Bearer
- [ ] 로그인 → `must_change_password` 분기
- [ ] 학생/선생/관리자 라우팅 분리
- [ ] 슬롯 조회 → 클릭 → POST `/bookings` 흐름
- [ ] 시간표 관리 4종 (주간/일회용/예외/프로필) CRUD UI
- [ ] 예약 관리 (들어온/완료/취소 탭) UI
- [ ] 관리자 사용자 / 패치노트 / audit log UI
- [ ] 공개 프로필 `/t/<slug>` 페이지
- [ ] PWA manifest + service worker
- [ ] Vercel 배포 시 `DATABASE_URL` (port 6543) + `JWT_SECRET` + `NODE_ENV` 환경변수

---

## 12. 부속 문서

- [`docs/deploy-vercel-supabase.md`](deploy-vercel-supabase.md) — 7단계 배포 가이드
- [`docs/kakao-oauth-setup.md`](kakao-oauth-setup.md) — 카카오 로그인 활성화 절차
- [`docs/roadmap.md`](roadmap.md) — Phase 0/1/2/3/4 후속 작업
- [`CHANGELOG.md`](../CHANGELOG.md) — 모든 변경 이력
- [`scripts/supabase-bootstrap.sql`](../scripts/supabase-bootstrap.sql) — 마이그레이션 통합 (멱등)
- [`scripts/supabase-demo-data.sql`](../scripts/supabase-demo-data.sql) — 데모 계정 + 데이터

---

**이 문서는 DB 그대로 활용 + 백엔드 그대로 활용 + UI 만 새로 만드는 시나리오를 가정합니다. 백엔드/DB 도 갈아엎으려면 별도 협의 필요.**
