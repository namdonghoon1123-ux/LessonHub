# 레슨 예약 MVP

개인 레슨(피아노/요가 등) 웹 예약 MVP 단일 레포입니다.

현재 단계: **1) 프로젝트 초기화 + 2) 인증(Auth) + 3) 시간표/예외 + 4) 슬롯/예약 API**
- 포함: 프론트/백엔드/DB 기본 구조, 마이그레이션/시드, 스펙 문서
- 포함: 기본 인증 API (`register`, `login`, `logout`, `me`)
- 포함: 선생님 시간표/예외 API
- 포함: 슬롯 조회/예약 생성/예약 취소/예약 목록 API
- 포함: 노쇼(수동) 처리, 반복(정기) 예약, 첫 로그인 강제 비번변경, PWA 설치
- 미구현(제외): 결제, 이메일 알림

## 구조
- `docs/lesson-booking-mvp-spec.md`: 제품/API/데이터 스펙 (슬롯 기반 정책 반영)
- `frontend/`: 정적 UI (Vercel 호스팅, `/api/*` 는 `vercel.json` rewrites + `api/[...path].js` 로 라우팅)
- `backend/`: Node.js(Express) 서비스 + 마이그레이션/시드 실행 스크립트 (`api/[...path].js` 가 Vercel 서버리스로 위임)
- `db/`: SQL 마이그레이션/시드
- `api/[...path].js`: Vercel Serverless 진입점 (catchall)

## 사전 요구사항
- Node.js 20+
- Supabase 프로젝트 (운영과 분리된 **dev DB** 권장 — 로컬 테스트가 테이블을 초기화함)
- (선택) [Vercel CLI](https://vercel.com/docs/cli) — 로컬에서 프론트+서버리스 API 를 한 번에 띄울 때

> 이 프로젝트는 **Supabase(PostgreSQL) + Vercel(정적 호스팅·서버리스)** 전용입니다. Docker 는 사용하지 않습니다.

## 1) 환경 파일 생성
```bash
cp .env.example .env
```
- `.env` 의 `DATABASE_URL` 에 Supabase dev DB connection string(URI) 을 넣습니다.
  (Supabase 대시보드 → Settings → Database → Connection string)
- `JWT_SECRET` 도 임의의 값으로 채웁니다.

## 2) 의존성 설치 + 스키마 적용
```bash
npm --prefix backend install
npm --prefix backend run migrate   # db/migrations/* 적용 (DATABASE_URL 사용)
npm --prefix backend run seed      # db/seeds/* 적용 (선택)
```
- 또는 Supabase SQL Editor 에 `scripts/supabase-bootstrap.sql` 을 통째로 붙여넣어 한 번에 적용할 수도 있습니다.

## 3) 로컬 실행
- **전체 앱(프론트 + /api 서버리스)**: 프로덕션과 동일하게 동작
  ```bash
  vercel dev          # 기본 http://localhost:3000 (frontend + api/[...path].js)
  ```
- **백엔드만** (API 단독 확인용)
  ```bash
  node backend/src/index.js   # http://localhost:4000 (PORT 환경변수)
  ```

## 4) 동작 확인 (`vercel dev` 기준, 포트는 환경에 따라 다름)
- 로그인: `/index.html`
- 학생 통합 대시보드: `/student.html`
- 선생님 통합 대시보드: `/teacher.html`
- 선생님 캘린더/시간표/예약 관리: `/teacher-calendar.html` · `/teacher-manage.html` · `/teacher-bookings.html`
- 사용자 설명서: `/guide.html`
- 헬스체크: `/api/v1/health`

## 선생님 불가 일정(휴무/차단) 설정 방법
- 캘린더 방식(권장)
  1. `/teacher-calendar.html` 접속
  2. 상단 `생성 모드`를 `불가 시간/휴무`로 변경
  3. 캘린더에서 날짜/시간을 15분 단위로 드래그
  4. 뜨는 모달에서 날짜, 시간(또는 `종일 차단`), 사유를 입력 후 저장
  5. 저장 즉시 선생님 캘린더에 `불가`로 표시되고 학생 슬롯에서 제외
- 기존 폼 방식
  - `/teacher-manage.html`의 `예외(Exceptions)` 섹션에서 날짜/시간/사유를 직접 등록/삭제

## 5) 백엔드 통합 테스트
```bash
npm --prefix backend test
```
- `DATABASE_URL` 이 가리키는 DB 에 대해 실행됩니다.
- ⚠️ 테스트는 예약/시간표 관련 테이블을 초기화(`TRUNCATE ... RESTART IDENTITY`)합니다.
  **반드시 버려도 되는 dev DB** 를 사용하세요 (운영 DB 금지).

## 인증 API (MVP)
- `POST /api/v1/auth/register`
  - body: `{"email":"new@example.com","password":"<set-locally>","name":"새 사용자","role":"STUDENT"}`
- `POST /api/v1/auth/login`
  - body: `{"email":"teacher@example.com","password":"<set-locally>"}`
- `POST /api/v1/auth/logout` (`Authorization: Bearer <token>` 필요)
- `GET /api/v1/auth/me` (`Authorization: Bearer <token>` 필요)

## 선생님 시간표 API (MVP)
- `GET /api/v1/teachers/me/availability` (teacher)
- `POST /api/v1/teachers/me/availability` (teacher)
- `PATCH /api/v1/teachers/me/availability/:id` (teacher)
- `DELETE /api/v1/teachers/me/availability/:id` (teacher)

## 선생님 예외 API (MVP)
- `GET /api/v1/teachers/me/exceptions` (teacher)
- `POST /api/v1/teachers/me/exceptions` (teacher)
- `DELETE /api/v1/teachers/me/exceptions/:id` (teacher)

## 선생님/슬롯 API (MVP)
- `GET /api/v1/teachers` (authenticated)
- `GET /api/v1/teachers/:teacherId/slots?from=...&to=...` (authenticated)

## 예약 API (MVP)
- `POST /api/v1/bookings` (student)
  - body: `{"teacher_user_id":1,"start_at":"2026-02-20T10:00:00+09:00"}`
- `GET /api/v1/bookings/me` (student)
- `GET /api/v1/teachers/me/bookings` (teacher)
- `POST /api/v1/teachers/me/bookings/:id/approve` (teacher)
- `POST /api/v1/teachers/me/bookings/:id/complete` (teacher)
- `POST /api/v1/teachers/me/bookings/:id/no-show` (teacher) — 지난 수업을 노쇼로 표시 (완료처리로 되돌리기 가능)
- `POST /api/v1/bookings/:id/cancel` (student owner or teacher owner)

## 반복(정기) 예약 API
- `POST /api/v1/bookings/recurring` (student)
  - body: `{"teacher_user_id":1,"start_at":"2026-06-15T01:00:00Z","count":12}`
  - 매주 같은 요일/시각으로 count 회 생성. 예약 불가 회차는 `skipped` 로 반환.
- `POST /api/v1/bookings/series/:id/cancel` (student owner or teacher owner) — 미래 회차 일괄 취소

## 계정 / 보안
- `PATCH /api/v1/users/me/password` (본인) — 8자 이상, 변경 시 `must_change_password` 해제
- 임시 학생/관리자 초기화 비밀번호는 첫 로그인 시 변경 강제 (`must_change_password`)
- 로그인/회원가입/비밀번호 복구는 프로덕션에서 IP 기준 rate limit 적용

시드 사용자
- `teacher@example.com` (TEACHER)
- `student@example.com` (STUDENT)
- `poweradmin` (POWER_ADMIN)
- 비밀번호는 로컬 개발 환경에서 직접 설정하거나 확인한다.

## 데모 계정 (Vercel 배포 후 즉시 사용 가능)

`scripts/supabase-demo-data.sql` 를 Supabase SQL Editor 에 붙여넣으면 다음 계정이 활성화됩니다:

| 역할 | 로그인 ID | 비밀번호 | 진입 화면 |
|---|---|---|---|
| 파워관리자 | `admin` | `admin123` | `/power-admin.html` |
| 선생님 | `teacher@example.com` | `teacher123` | `/teacher.html` |
| 학생 | `student@example.com` | `student123` | `/student.html` |

데모 데이터 포함:
- 선생님 시간표 월~금 09-18시 + 토요일 주말 특강
- 일요일 종일 휴무 예외
- 예약 4건 (BOOKED 오늘 · PENDING 내일 · BOOKED +4일 · COMPLETED -7일 + 코멘트)
- 패치노트 2건
- 선생님 공개 프로필 slug: `/t/jiwon-piano`

## 공개 프로필 페이지 (마케팅용)

비로그인 사용자도 선생님 소개를 볼 수 있는 외부 공유 가능 URL:

- `https://<your-domain>/t/<slug>` (예: `/t/jiwon-piano`)
- 또는 `/p.html?t=<slug>`

선생님이 SNS, 블로그, 명함 등에 공유 가능. API: `GET /api/v1/public/teachers/:slug` (인증 불필요).
slug 설정/변경: `PATCH /api/v1/teachers/me/profile/slug` (선생 본인만).

## 운영 (Audit log)

POWER_ADMIN 액션은 `audit_logs` 테이블에 자동 기록됩니다.

- 추적되는 액션: `admin.user.create`, `admin.user.delete`, `admin.user.password_reset`, `admin.student.teacher.assign`, `admin.student.teacher.clear`
- 조회: `GET /api/v1/admin/audit-log?action=...&actor_email=...&limit=50&offset=0` (POWER_ADMIN 만)

## 배포 (Vercel + Supabase)

이 프로젝트는 **Vercel(호스팅·서버리스) + Supabase(PostgreSQL)** 전용입니다.

- 프론트(`frontend/`): Vercel 정적 호스팅
- 백엔드(`backend/src/index.js`): `api/[...path].js` catchall 이 Vercel Serverless Function 으로 실행
- DB: Supabase Postgres, 마이그레이션 23개 + 시드 (`scripts/supabase-bootstrap.sql` 한 방에 적용)
- 스케줄러(자동완료/게스트정리 2건): `db/migrations/017_pg_cron_schedulers.sql` 이 Supabase `pg_cron` 잡으로 변환

빠른 시작:
1. Supabase 프로젝트 생성 → SQL Editor 에 `scripts/supabase-bootstrap.sql` 통째로 붙여넣고 Run
2. Vercel 에서 이 레포 import → 환경변수 `DATABASE_URL`(Supabase pooler URI, port 6543) · `JWT_SECRET` · `NODE_ENV=production` 등록
3. Deploy

상세 가이드: [`docs/deploy-vercel-supabase.md`](docs/deploy-vercel-supabase.md)

## 참고
- 인증은 JWT 기반 무상태(Stateless) 액세스 토큰 방식입니다.
- 프론트는 로그인 role에 따라 선생님/학생 화면이 분리됩니다.
- PWA: 아이폰 Safari 에서 공유 → "홈 화면에 추가" 로 앱처럼 설치 가능 (HTTPS 배포 필요).
- 학생 화면은 월간 캘린더 기반으로 슬롯을 조회하고 바로 예약/취소할 수 있습니다.
- 디자인 언어: **Coral Blush** (코랄·핑크 주연 + 의미용 그린 1색, Pretendard 폰트). 토큰 정의: [`frontend/lessonhub-brand.css`](frontend/lessonhub-brand.css).
- 알림: `window.alert()` 대신 우상단 toast (`frontend/lessonhub-toast.js` 자동 오버라이드).
- 향후 작업 로드맵: [`docs/roadmap.md`](docs/roadmap.md)
- 헬스체크: `GET /api/v1/health` (DB ping 포함, `uptime_ms` + `db.latency_ms` 반환)

## AI 협업 문서 운영
- Gemini 메모: `GEMINI.md`
- Codex 메모: `CODEX.md`
- Claude Code 메모: `CLAUDE.md`
- 일일 인수인계: `docs/handover-YYYY-MM-DD.md`
- 서비스/AI 구조 요약: `docs/ai-handover-2026-03-30.md`
- AI 협업 운영안: `docs/ai-collaboration-playbook-2026-04-02.md`
- UI 리디자인 기록: `docs/ui-redesign-2026-02-24.md`
- UI/UX QA 체크리스트: `docs/ui-qa-checklist-2026-03-23.md`
- Gemini 디자인 검수 주의사항: `docs/gemini-design-review-notes-2026-03-23.md`
- AI 앱 제작 회고(Notion/블로그 초안): `docs/notion-ai-app-build-case-study-2026-03-23.md`
- AI 앱 제작 회고(Notion/블로그 완성본): `docs/notion-blog-full-nondev-ai-app-2026-03-23.md`

매일 인수인계 스냅샷 생성:
```bash
bash scripts/daily-handover.sh
```

스모크 테스트까지 포함해 기록:
```bash
RUN_SMOKE=1 bash scripts/daily-handover.sh
```
