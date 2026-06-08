# LessonHub - Claude Code 인수인계 메모

## 1) 먼저 볼 문서
1. `README.md`
2. `CODEX.md`
3. `docs/handover-YYYY-MM-DD.md` 중 최신 파일
4. `docs/ai-handover-2026-03-30.md`
5. `docs/ai-collaboration-playbook-2026-04-02.md`

## 2) 프로젝트 기본 사실
- 단일 레포 구조: `frontend/`, `backend/`, `db/`, `docs/`, `api/`
- 백엔드: Node.js + Express + PostgreSQL(Supabase) + JWT
- 프론트: 정적 HTML + Vanilla JS (Vercel 정적 호스팅)
- **인프라: Supabase(DB) + Vercel(서버리스/정적) 전용 — Docker 사용 안 함**
  - 서버리스 진입점: `api/[...path].js`
  - 로컬 전체 실행: `vercel dev` / 백엔드 단독: `node backend/src/index.js`
- 서비스 기준 시간대: `Asia/Seoul`
- 역할: `POWER_ADMIN`, `TEACHER`, `STUDENT`

## 3) 지금 기준 핵심 도메인 규칙
- 학생 예약은 담당 선생님 연결 상태를 전제로 움직이는 흐름이 많다.
- 예약 시간 길이는 `teacher_profiles.lesson_duration_min`를 기준으로 계산된다.
- 슬롯 계산은 시간표 + 단건 가용시간 + 예외 + 기존 예약 + 예약 가능 기간을 함께 본다.
- 비활성 사용자(`users.is_active = FALSE`)는 주요 조회/인증/연결 로직에서 제외된다.
- 파워관리자 삭제는 하드 삭제가 아니라 soft delete다.

## 4) 최근 작업 축
- 로그인 흐름 분리
  - `/frontend/index.html`
  - `/frontend/teacher-login.html`
  - `/frontend/student-login.html`
  - `/frontend/login-flow.js`
- 학생/선생 연결 및 학생 계정 티어
  - `TEMP` -> `FULL` 업그레이드
  - 학생의 담당 선생님 검색/지정/해제
- 파워관리자 콘솔 추가
  - `/frontend/power-admin*.html`
  - `/frontend/power-admin-app.js`
  - `/api/v1/admin/*`
- 파워관리자 패치노트 + soft delete + POWER_ADMIN 계정 보정
  - `db/migrations/014_power_admin_and_timezone.sql`
  - `db/migrations/015_user_soft_deletion.sql`
  - `db/migrations/016_admin_patch_notes_and_power_admin_login_fix.sql`

## 5) 코드 진입점
- 백엔드 엔트리: `backend/src/index.js`
  - 인증/계정
  - 학생-선생 연결
  - 파워관리자 API
  - 시간표/예외/슬롯/예약 API
- 인증 보조: `backend/src/auth.js`
- 프론트 메인 워크스페이스: `frontend/app.html`
- 프론트 메인 로직: `frontend/lesson-booking-app.js`
  - `applyTeacherManagePanel`
  - `applyTeacherSettingsPanel`
  - `renderStudentTeacherAssignmentState`
  - `assignMyTeacher`
  - `clearMyTeacherAssignment`
  - `renderTeacherCalendar`
  - `renderTeacherBookings`
  - `renderTeacherCompletedList`
- 파워관리자 프론트 로직: `frontend/power-admin-app.js`
  - `loadPatchNotes`
  - `createPatchNote`
  - `renderPatchNotes`

## 6) 작업 전 체크포인트
- 루트 워크스페이스를 기준으로 작업한다. `.claude/worktrees/...`는 예전 스냅샷이라 현재 소스 오브 트루스가 아니다.
- **Docker 는 더 이상 사용하지 않는다** (2026-06-08 제거). 로컬 검증은 Supabase dev DB(`DATABASE_URL`) + `node`/`vercel dev` 로 한다. `docker compose` 를 켜두지 말 것.
- 오래된 문서/화면 힌트에 `18080`/`8080` 같은 옛 Docker 포트나 예전 관리자 자격 정보가 남아 있을 수 있다.
  - 운영 자격 정보는 문서에 직접 남기지 않는다.
- 인증/관리자 로직을 건드리면 `is_active`, 학생-선생 연결 해제, POWER_ADMIN 마지막 계정 보호 로직까지 같이 확인한다.
- 슬롯/예약 로직을 건드리면 `Asia/Seoul`, `lesson_duration_min`, 예외/중복 판정을 같이 본다.

## 7) 권장 검증 명령
```bash
# .env 의 DATABASE_URL 을 Supabase dev DB 로 설정한 뒤
npm --prefix backend install
npm --prefix backend run migrate    # db/migrations/* 적용
npm --prefix backend test           # 통합 테스트 (dev DB 의 테이블을 TRUNCATE 함 — 운영 DB 금지)
vercel dev                          # 프론트 + /api 서버리스 로컬 실행
```

## 8) 상태 메모 (2026-06-08 라운드 2)
- 인프라를 **Docker → Supabase/Vercel 전용**으로 전환. Docker 파일(`docker-compose.yml`, `*/Dockerfile`, `frontend/nginx.conf`, `scripts/dev-stack.sh`) 삭제.
- 신규 기능: 첫 로그인 강제 비번변경(021), 노쇼 수동처리(022), 반복예약(023), PWA 아이폰 설치, auth rate limit, audit 확대.
- 백엔드 통합 테스트 **20개 통과** (`npm --prefix backend test`, Supabase dev DB 기준).
- `migrate.js`/`seed.js` 는 레포 루트 `db/` 를 자동 인식하도록 경로 수정됨.
- 신규 마이그레이션은 `scripts/supabase-bootstrap.sql` 에도 반영(001~023).
