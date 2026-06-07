# Changelog

이 프로젝트의 주요 변경사항을 기록합니다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 기준이며, 버전은 의미상 정렬되어 있지만 아직 정식 릴리스는 아닙니다.

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

---

## 형식
- **Added**: 새 기능
- **Changed**: 기존 기능 동작/UI 변경
- **Deprecated**: 곧 제거될 기능
- **Removed**: 제거된 기능
- **Fixed**: 버그 수정
- **Security**: 보안 관련 변경
