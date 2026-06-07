# LessonHub · 로드맵 / 남은 작업

> 최종 갱신: 2026-06-08
> 현재 단계: MVP + Coral Blush 디자인 완료, Vercel/Supabase 배포 준비

---

## ✅ Phase 0 — 완료 (커밋 `f340f92` ~ `315a075`)

### 인프라
- [x] GitHub 새 레포 `namdonghoon1123-ux/LessonHub` 연계 (origin 교체)
- [x] Supabase Postgres 마이그레이션 17개 적용
- [x] `pg_cron` 잡 2건 (`lh-auto-complete`, `lh-guest-retention`)
- [x] Vercel 배포 구성 (`vercel.json`, `api/index.js` Express wrapper, root `package.json`)
- [x] 통합 부트스트랩 SQL (`scripts/supabase-bootstrap.sql`)
- [x] 배포 가이드 (`docs/deploy-vercel-supabase.md`)

### 디자인 (Coral Blush)
- [x] 디자인 토큰 시스템 (`lessonhub-brand.css` — Pretendard, --lh-* 18종)
- [x] 로그인 3 화면 (좌 그라데이션 패널 + 우 폼)
- [x] 학생 캘린더 + 슬롯 칩 4상태 (open/mine/full/past/off)
- [x] 선생님 통계 스트립 4분할 + 알림 2칸
- [x] 관리자 역할 칩 (학생=coral / 선생님=rose / 관리자=green) + 테이블 헤더 lineSoft
- [x] runtime-config 디버그 플래그 모두 false (프로덕션 기본)
- [x] 색상 통합: frontend 전체 비-Coral hex 0건

### 데모 데이터
- [x] `scripts/supabase-demo-data.sql` — admin/admin123 + teacher123/student123 + 시간표/예약 데모

### 배포 fix + 사용성/보안/PWA (커밋 `b65dcf3`)
- [x] 404 라우팅 해결 (api/[...path].js Vercel catchall)
- [x] 보안 헤더 (HSTS, CSP-lite, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- [x] Toast 알림 시스템 (`lessonhub-toast.js` + window.alert 자동 오버라이드)
- [x] PWA manifest + theme-color (#EC6A4C) + Apple meta
- [x] robots.txt + sitemap.xml
- [x] 커스텀 404 / 500 페이지 (Coral Blush)
- [x] `.well-known/security.txt`

### 공개 프로필 + Audit log + UI (커밋 `dc76006` ~ `2badf3a`)
- [x] 공개 프로필 페이지 `/t/<slug>` (선생님 마케팅용 외부 공유 URL)
- [x] Audit log 테이블 + 5종 hook + 조회 endpoint
- [x] 강화된 health check (DB ping, latency, uptime)
- [x] 선생님 settings 에서 공개 slug 활성화/중단/URL 복사 UI

### CI / 운영 (커밋 `8e7f5f5`)
- [x] GitHub Actions CI — JS syntax + SQL + JSON 검증 + 백엔드 통합 테스트 (postgres service)
- [x] CHANGELOG.md (Keep a Changelog 형식)

---

## 🟥 Phase 1 — 배포 직후 (1주 안에 마무리)

### 1.1 배포 확인 · 검증
- [ ] Vercel 첫 배포 성공 (Function Logs 에러 0건)
- [ ] DB 연결 확인 (DATABASE_URL · pooler 6543 권장)
- [ ] 시드 비밀번호 변경 SQL 실행
- [ ] 도메인 연결 (Vercel Settings → Domains)

### 1.2 알림 시스템 (이메일)
- [ ] Resend (또는 SendGrid) API 키 발급
- [ ] Supabase Edge Function 으로 booking lifecycle 트리거
- [ ] 학생용: 예약 확인 / 24h 전 리마인더 / 취소 안내
- [ ] 선생용: 새 예약 신청 알림
- [ ] 이메일 템플릿 (Coral Blush 톤)
- **예상**: 2일

### 1.3 비밀번호 변경 UI
- [ ] 첫 로그인 시 강제 비밀번호 변경 화면
- [ ] 학생/선생/관리자 모두 본인 비밀번호 변경 가능 (백엔드 already supports)
- [ ] 학생 settings 페이지에 "비밀번호 변경" 카드 추가
- **예상**: 0.5일

### 1.4 Toast / 인앱 알림 UI
- [ ] `window.alert()` 대신 우상단 fade-in toast
- [ ] 성공/경고/에러 3종 (Coral Blush 톤)
- [ ] `lesson-booking-app.js` 의 모든 alert 호출 치환
- **예상**: 0.5일

### 1.5 보안 헤더
- [ ] `vercel.json` 에 CSP / HSTS / X-Frame-Options 추가
- [ ] Sentry 또는 Vercel 자체 에러 추적 활성화
- **예상**: 0.5일

---

## 🟧 Phase 2 — 한 달 안 (사용자 onboarding 단계)

### 2.1 노쇼 자동 처리
- [ ] pg_cron 잡 추가: 수업 +30분 지났는데 COMPLETED 아니면 NO_SHOW
- [ ] 선생님 화면에서 NO_SHOW 표시 + 학생 카드에 누적 카운트
- `db/migrations/018_no_show_auto_marking.sql`
- **예상**: 0.5일

### 2.2 선생님 공개 프로필 페이지
- [ ] URL: `/t/<teacher-slug>` 형태 (slug 컬럼 추가)
- [ ] 비로그인 사용자도 선생님 소개 + 예약 가능 시간 미리보기
- [ ] 슬롯 미리보기 API (`GET /api/v1/public/teachers/:slug`)
- [ ] OG 이미지 동적 생성 (선택)
- **예상**: 3일 · **마케팅 임팩트 큼**

### 2.3 반복 예약 (정기 등록)
- [ ] DB: `recurring_bookings` 테이블 (master + child bookings)
- [ ] 학생 UI: "매주 화요일 18시, 12회" 등록
- [ ] 선생님 UI: 정기 학생 한눈에 보기
- [ ] 취소 정책: 개별 회차 취소 vs 전체 시리즈 취소
- **예상**: 5일

### 2.4 결제 연동
- [ ] 토스페이먼츠 / 카카오페이 / Stripe 선택
- [ ] 결제 시점: 예약 시 / 수업 완료 후
- [ ] 패키지권 (10회권 / 1개월 무제한)
- [ ] 환불 정책 + 영수증
- [ ] PG 콜백 webhook
- **예상**: 1-2주 · **비즈니스 임팩트 가장 큼**

---

## 🟨 Phase 3 — 있으면 좋은 기능

| 기능 | 예상 | 의존성 / 비고 |
|---|---|---|
| Supabase Auth · Google/Naver 소셜 로그인 | 1-2일 | 코드에 OAuth setup_required 응답 흔적 있음 |
| 학생-선생 채팅 (Supabase Realtime) | 4-5일 | RLS 정책 설계 필요 |
| 수업 자료 첨부 (악보·영상) | 2-3일 | Supabase Storage |
| 학생 리뷰 / 평점 | 2-3일 | 평판 시스템 |
| 그룹 수업 (1:N) | 4-5일 | 슬롯 로직 큰 변경 |
| 관리자 통계 대시보드 (차트) | 2-3일 | Chart.js, 매출/예약수 |
| 모바일 PWA | 1-2일 | manifest + SW |
| 다국어 (한/영) | 3-4일 | i18n |

---

## 🟩 Phase 4 — 운영 안정성

### 4.1 테스트 / 품질
- [ ] Playwright E2E 시나리오 5개 (로그인 → 예약 → 취소 → 완료)
- [ ] 백엔드 통합 테스트 확장 (현재 17 cases → 50+ 목표)
- [ ] CI: GitHub Actions 에서 PR 마다 테스트 자동 실행
- **예상**: 3-4일

### 4.2 모니터링
- [ ] Vercel Analytics + Speed Insights 활성화
- [ ] Sentry 도입 (frontend + backend 에러 추적)
- [ ] Supabase Reports 대시보드 즐겨찾기 (DB 사용량 / API 호출)
- **예상**: 1일

### 4.3 백업 / 복구
- [ ] Supabase 자동 백업 (free tier 7일) 확인
- [ ] 별도 cron 으로 S3 또는 GitHub 에 SQL dump 1주 1회
- [ ] 복구 시나리오 문서화
- **예상**: 1-2일

### 4.4 Rate limiting 확대
- [ ] 현재: 게스트 예약만 (`config/app.config.json`)
- [ ] 추가: 로그인 시도 / 회원가입 / 비밀번호 재설정
- [ ] Vercel KV 또는 Supabase 자체 테이블로 카운터
- **예상**: 1일

### 4.5 Audit log
- [ ] 현재: POWER_ADMIN 일부 액션만 기록
- [ ] 확장: 모든 관리자 변경, 비밀번호 reset, 학생-선생 연결 변경
- [ ] 관리자 콘솔에 audit log 뷰어
- **예상**: 2일

### 4.6 백엔드 리팩토링
- [ ] `backend/src/index.js` 4292줄 → 라우터별 분할
  - `routes/auth.js`, `routes/bookings.js`, `routes/teachers.js`, ...
- [ ] Vercel cold start 단축 (현재 1-3초 → 0.5-1초 목표)
- [ ] 단위 테스트 추가 가능해짐
- **예상**: 3-5일 · **중장기 코드 품질 가장 큼**

---

## 📋 데모 계정 / 로그인 정보 (배포 후)

| 역할 | 로그인 ID | 비밀번호 | 화면 |
|---|---|---|---|
| 파워관리자 | `admin` | `admin123` | `/power-admin.html` |
| 파워관리자 (백업) | `poweradmin` | (시드 해시) | `/power-admin.html` |
| 선생님 | `teacher@example.com` | `teacher123` | `/teacher.html` |
| 학생 | `student@example.com` | `student123` | `/student.html` |

**적용 방법**: Supabase SQL Editor 에 `scripts/supabase-demo-data.sql` 통째로 붙여넣고 Run.

**데모 데이터 포함**:
- 학생 ↔ 선생 연결 (`student@example.com` → `teacher@example.com`)
- 선생 시간표: 월~금 09:00-18:00
- 일회용 가용시간: 이번 주 토요일 10:00-14:00 (주말 특강)
- 예외: 이번 주 일요일 종일 휴무
- 예약 4건: BOOKED (오늘), PENDING (내일), BOOKED (+4일), COMPLETED (-7일 · 코멘트 포함)
- 패치노트 2건 (v0.1.0 디자인 · v0.1.1 인프라)

---

## 🔍 즉시 추천 액션 (지금 다음 단계)

1. **Vercel 배포 마무리** → Function Logs 에서 DB 연결 OK 확인
2. **`scripts/supabase-demo-data.sql` 실행** → 데모 계정 + 시연 데이터 적용
3. **로컬 또는 배포 도메인에서 admin/teacher/student 로 한 번씩 로그인** → 모든 화면 동작 확인
4. **이슈 발견 시 issue 등록** 또는 다음 라운드 작업 결정

---

## 📐 우선순위 결정 가이드

- **단기 사용자 가치**: Phase 1.2 (이메일), Phase 1.4 (Toast)
- **사용자 획득**: Phase 2.2 (공개 프로필)
- **비즈니스 임팩트**: Phase 2.4 (결제)
- **운영 효율**: Phase 2.1 (노쇼), Phase 4.2 (모니터링)
- **코드 품질**: Phase 4.6 (라우터 분리)

지금 사용자가 1명도 없는 상태라면 → Phase 1.1 (배포 확인) + Phase 2.2 (공개 프로필) 부터.
이미 베타 사용자 몇 명 있다면 → Phase 1.2 (이메일) + Phase 1.4 (Toast) 가 더 시급.
