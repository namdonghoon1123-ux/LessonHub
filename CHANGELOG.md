# Changelog

이 프로젝트의 주요 변경사항을 기록합니다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 기준이며, 버전은 의미상 정렬되어 있지만 아직 정식 릴리스는 아닙니다.

## [Unreleased] · 2026-06-08 (라운드 2 — 기능 확장)

### Added — 기능
- **PWA 아이폰 홈화면 설치**: `sw.js`(서비스워커), `pwa-install.js`(iOS Safari 설치 안내 배너 + 안드로이드 beforeinstallprompt), `apple-touch-icon.png`/`icon-192.png`/`icon-512.png`(브랜드 배경 합성), manifest icons 보강, 진입 페이지 전반 PWA meta 연결
- **첫 로그인 강제 비밀번호 변경**: `users.must_change_password` 컬럼(021). 임시 학생 생성/관리자 비번 초기화 시 TRUE, 본인 변경/정식전환 시 FALSE. 로그인/`/me` 응답에 플래그 노출 + `app.html` 강제 변경 모달
- **노쇼(NO_SHOW) 수동 처리**: `POST /api/v1/teachers/me/bookings/:id/no-show`, `no_show_at` 컬럼(022), 선생님 예약 상세에 노쇼 처리/완료 되돌리기 + 학생별 누적 노쇼 카운트
- **반복(정기) 예약**: `recurring_series` 테이블 + `bookings.recurring_series_id`(023). `POST /api/v1/bookings/recurring`(매주 N회), `POST /api/v1/bookings/series/:id/cancel`(미래 회차 일괄취소). 학생 슬롯 "정기" 버튼 + 내 예약 "정기" 배지/전체취소

### Added — 보안 / 운영
- 인증 엔드포인트(login/register/recover) **rate limit** (프로덕션 전용, `auth.rateLimit` 설정)
- Audit hook 확대: `user.password.change`, `teacher.student.assign`, `teacher.student.temp_create`, `teacher.booking.no_show`, `booking.series.create/cancel`

### Changed — 코드 품질
- 백엔드 리팩토링 1단계: 순수 파싱 헬퍼 8종을 `backend/src/lib/parse.js` 로 분리 (전면 라우터 분리는 후속)
- `getBookableSlotAt` 에 `ignoreBookingWindow` 옵션 추가(정기 예약용)

### Tests
- 백엔드 통합 테스트 17 → **20** (강제 비번변경 / 노쇼 / 반복예약 시나리오 추가)

### Migrated
- `scripts/supabase-bootstrap.sql` 에 021~023 마이그레이션 반영

---

## [Unreleased] · 2026-06-08

### Added — 인프라
- `vercel.json` + `api/[...path].js` (Vercel Serverless catchall)
- `db/migrations/017_pg_cron_schedulers.sql` — `setInterval` → `pg_cron` 이관
- `scripts/supabase-bootstrap.sql` — 마이그레이션 + 시드 통합 단일 SQL
- `scripts/supabase-demo-data.sql` — 데모 계정/시간표/예약 일괄 적용
- `docs/deploy-vercel-supabase.md` — 7단계 배포 가이드
- `.github/workflows/ci.yml` — push 시 JS 문법 + SQL + 백엔드 테스트 자동화

### Added — 디자인 (Coral Blush)
- `lessonhub-brand.css` — Pretendard CDN + 토큰 변수 18종
- `lessonhub-auth.css` — 좌 46% 그라데이션 패널 + 우 폼 (전면 재작성)
- `lesson-booking-app.css` — 80+ 색을 Coral Blush 팔레트로 매핑
- 슬롯 칩 4상태 (open / mine / full / past / off · 휴무 해치)
- 선생님 통계 스트립 4분할 + 알림 2칸
- 관리자 역할 칩 (학생=coral / 선생님=rose / 관리자=green)
- 시간 숫자 tabular-nums

### Added — 기능
- 공개 프로필 페이지 `/t/<slug>` + `/p.html?t=<slug>` (비로그인)
- 선생님 settings 에서 본인 slug 활성화/중단/URL 복사 UI
- Audit log (`audit_logs` 테이블 + `auditLog()` 헬퍼)
  - hook: `admin.user.create / .delete / .password_reset / .student.teacher.assign / .clear`
  - `GET /api/v1/admin/audit-log` (필터·페이징, POWER_ADMIN 만)
- Toast 알림 시스템 (`lessonhub-toast.js` — `window.alert` 자동 오버라이드)
- PWA: `manifest.json` + theme-color + Apple meta + shortcuts
- 강화된 health check: `GET /api/v1/health` (DB ping, uptime, latency)

### Added — 보안 / SEO / UX
- `vercel.json` 응답 헤더 (CSP-lite, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- `.well-known/security.txt` (RFC 9116)
- `robots.txt` + `sitemap.xml`
- 커스텀 404 페이지 (`frontend/404.html` · Coral Blush)
- `.gitignore` 에 `.env.*` 패턴 (secret 누출 방지)

### Added — 문서
- `docs/roadmap.md` — Phase 0/1/2/3/4 분류, 작업량 추정, 우선순위 가이드
- `README.md` — Vercel + Supabase 배포 섹션, 데모 계정 표, 공개 프로필 사용법

### Added — 데모 데이터 (`scripts/supabase-demo-data.sql`)
- `admin` / `admin123` (POWER_ADMIN, `poweradmin` 은 백업 보존)
- `teacher@example.com` / `teacher123` (이지원 · 피아노)
- `student@example.com` / `student123` (최서연)
- 선생 시간표 월~금 09-18시, 토요일 주말 특강, 일요일 휴무
- 예약 4건 (BOOKED 오늘 · PENDING 내일 · BOOKED +4일 · COMPLETED -7일 + 코멘트)
- 패치노트 2건, 공개 slug `jiwon-piano`

### Changed
- `frontend/runtime-config.js` — 디버그 플래그 모두 `false` (프로덕션 기본)
- 로그인 3 화면 (index/student-login/teacher-login) — `auth-shell` 구조 재작성, 기존 form id 모두 보존
- `backend/src/index.js` GET `/api/v1/teachers/me/profile` 응답에 `public_slug` 포함

### Fixed
- 배포 후 `/api/v1/auth/social/providers` 가 404 → Vercel rewrites destination 형식 문제 해결 (`api/index.js` → `api/[...path].js` catchall)

### Migrated
- Origin GitHub repo: `100sayung/myapp` → `namdonghoon1123-ux/LessonHub` (구 origin 은 `legacy` remote 로 보존)

### Added — 마지막 라운드 (커밋 `3f8643b`)
- Backend: `app.set('trust proxy', true)` — Vercel X-Forwarded-For 정확 처리
- Backend: `GET /api/v1/version` — APP_VERSION + commit SHA + node_env 반환
- Backend audit hook: `admin.patch_note.create`
- Playwright E2E 기초 (`tests/` 디렉토리, Vercel 빌드 제외)
  - 5개 테스트: 홈 역할 카드, 로그인 폼 렌더, 탭 전환, 404 폴백
  - GitHub Actions `e2e-test` job — http-server + chromium

---

## 형식
- **Added**: 새 기능
- **Changed**: 기존 기능 동작/UI 변경
- **Deprecated**: 곧 제거될 기능
- **Removed**: 제거된 기능
- **Fixed**: 버그 수정
- **Security**: 보안 관련 변경
