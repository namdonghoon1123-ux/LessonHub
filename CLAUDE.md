# LessonHub - Claude Code 인수인계 메모

## 1) 먼저 볼 문서
1. `/Volumes/Extreme_SSD/workspace/README.md`
2. `/Volumes/Extreme_SSD/workspace/CODEX.md`
3. `/Volumes/Extreme_SSD/workspace/docs/handover-YYYY-MM-DD.md` 중 최신 파일
4. `/Volumes/Extreme_SSD/workspace/docs/ai-handover-2026-03-30.md`
5. `/Volumes/Extreme_SSD/workspace/docs/ai-collaboration-playbook-2026-04-02.md`

## 2) 프로젝트 기본 사실
- 단일 레포 구조: `frontend/`, `backend/`, `db/`, `docs/`
- 백엔드: Node.js + Express + PostgreSQL + JWT
- 프론트: 정적 HTML + Vanilla JS
- 도커 포트 기준:
  - 프론트: `http://localhost:18080`
  - 백엔드: `http://localhost:4000`
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
  - `/Volumes/Extreme_SSD/workspace/db/migrations/014_power_admin_and_timezone.sql`
  - `/Volumes/Extreme_SSD/workspace/db/migrations/015_user_soft_deletion.sql`
  - `/Volumes/Extreme_SSD/workspace/db/migrations/016_admin_patch_notes_and_power_admin_login_fix.sql`

## 5) 코드 진입점
- 백엔드 엔트리: `/Volumes/Extreme_SSD/workspace/backend/src/index.js`
  - 인증/계정
  - 학생-선생 연결
  - 파워관리자 API
  - 시간표/예외/슬롯/예약 API
- 인증 보조: `/Volumes/Extreme_SSD/workspace/backend/src/auth.js`
- 프론트 메인 워크스페이스: `/Volumes/Extreme_SSD/workspace/frontend/app.html`
- 프론트 메인 로직: `/Volumes/Extreme_SSD/workspace/frontend/lesson-booking-app.js`
  - `applyTeacherManagePanel`
  - `applyTeacherSettingsPanel`
  - `renderStudentTeacherAssignmentState`
  - `assignMyTeacher`
  - `clearMyTeacherAssignment`
  - `renderTeacherCalendar`
  - `renderTeacherBookings`
  - `renderTeacherCompletedList`
- 파워관리자 프론트 로직: `/Volumes/Extreme_SSD/workspace/frontend/power-admin-app.js`
  - `loadPatchNotes`
  - `createPatchNote`
  - `renderPatchNotes`

## 6) 작업 전 체크포인트
- 루트 워크스페이스를 기준으로 작업한다. `.claude/worktrees/...`는 예전 스냅샷이라 현재 소스 오브 트루스가 아니다.
- macOS 메타파일 `._*`가 섞여 있을 수 있으니 Docker 빌드 이상 시 먼저 의심한다.
- 오래된 문서/화면 힌트에 `8080` 또는 예전 관리자 자격 정보가 남아 있을 수 있다.
  - 현재 기준 포트: `18080`
  - 운영 자격 정보는 문서에 직접 남기지 않는다.
- 인증/관리자 로직을 건드리면 `is_active`, 학생-선생 연결 해제, POWER_ADMIN 마지막 계정 보호 로직까지 같이 확인한다.
- 슬롯/예약 로직을 건드리면 `Asia/Seoul`, `lesson_duration_min`, 예외/중복 판정을 같이 본다.

## 7) 권장 검증 명령
```bash
docker compose up --build -d
docker compose run --rm backend npm test
bash "/Volumes/Extreme_SSD/workspace/scripts/daily-handover.sh"
RUN_SMOKE=1 bash "/Volumes/Extreme_SSD/workspace/scripts/daily-handover.sh"
```

## 8) 오늘 기준 상태 메모
- 현재 워킹트리는 대규모 미커밋 상태다.
  - 핵심 변경 파일: `backend/src/index.js`, `frontend/lesson-booking-app.js`, `frontend/app.html`, `frontend/login-flow.js`
  - 신규 관리자 관련 파일 다수 추가됨
- 오늘 기준 백엔드 테스트는 통과했다.
  - `docker compose run --rm backend npm test`
  - 결과: `15 passed, 0 failed`
