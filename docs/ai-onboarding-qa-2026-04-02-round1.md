# AI 온보딩 Q&A (2026-04-02, Round 1)

## 질문 1. `users` 테이블 실제 컬럼명은 `email`인가 `login_id`인가?

실제 DB 컬럼은 여전히 `email`입니다.

- `001_init.sql`에서 `users.email TEXT NOT NULL UNIQUE`로 시작합니다.
- 이후 마이그레이션들(`011`~`016`)에도 rename은 없고 계속 `email`을 사용합니다.
- 현재 코드에서는 사용자에게 보여주는 개념을 `login_id`로 맞추기 위해 API/직렬화 단계에서 alias처럼 다룹니다.
  - 예: `SELECT email AS login_id`
  - 예: `toPublicUser()`에서 `row.login_id || row.email`

정리하면:
- DB 스키마 이름: `email`
- 앱/UX 용어: `login_id`
- 즉, rename된 게 아니라 "DB는 email, 화면/응답은 login_id" 혼용 구조입니다.

## 질문 2. `app.html` 역할은 정확히 무엇인가?

현재 예약 앱 본체는 사실상 `app.html` 하나입니다.

- `student.html`, `teacher.html`, `student-calendar.html`, `teacher-bookings.html` 같은 페이지들은 실제 화면을 직접 렌더링하지 않습니다.
- 이 파일들은 `app-page-redirect.js`로 `/app.html?mode=...&section=...`로 즉시 리다이렉트하는 얇은 진입 셸입니다.
- 로그인 페이지는 별도입니다.
  - `/teacher-login.html`
  - `/student-login.html`
- 로그인 성공 후에도 바로 `app.html`로 가는 게 아니라 일단 `/teacher.html` 또는 `/student.html`로 이동하고, 그 페이지가 다시 `app.html?...`로 보냅니다.

예시:
- `/teacher.html` -> `/app.html?mode=TEACHER&section=calendar`
- `/student-bookings.html` -> `/app.html?mode=STUDENT&section=bookings`

예외:
- 파워관리자는 `app.html`에 합쳐지지 않았고 별도 페이지 묶음입니다.
  - `/power-admin.html`
  - `/power-admin-users.html`
  - `/power-admin-links.html`
  - `/power-admin-notes.html`

## 질문 3. `TEMP` 학생 계정은 실제로 무엇이 제한되는가?

현재 코드 기준으로 `TEMP` 학생도 예약 자체는 가능합니다.

근거:
- 학생 예약 API `POST /api/v1/bookings`에는 `account_tier` 차단 로직이 없습니다.
- 실제 차단 조건은
  - 로그인된 학생인지
  - 담당 선생님이 연결되어 있는지
  - 예약 대상 선생님이 그 담당 선생님과 일치하는지
  - 슬롯이 실제로 예약 가능한지
  입니다.
- 교사가 임시학생을 만들 때 `assigned_teacher_user_id = 생성한 교사`로 바로 들어가므로, TEMP 학생은 보통 생성 직후부터 해당 교사에게 예약 가능한 상태입니다.

현재 TEMP의 의미는 "제한된 회원"보다는 "교사가 만든 임시 계정"에 가깝습니다.

지금 코드에서 확인되는 차이:
- `can_upgrade_to_full: true`
- 업그레이드 폼 노출
- 프론트 안내 문구상 "결제/다중 선생님 연결/개인화 알림 같은 확장 기능"은 정식 전환 후 사용 예정

즉, 현재는 예약 제한보다 계정 상태/향후 확장 기능 구분에 가깝습니다.

## 질문 4. 담당 교사 없는 학생도 슬롯 조회가 가능한가?

코드상으로는 가능합니다.

사실 관계:
- `GET /api/v1/teachers/:teacherId/slots`는 `optionalAuth`입니다.
- 이 라우트 안에는 `assigned_teacher_user_id` 검증이 없습니다.
- 그래서 인증이 없거나, 담당 교사가 없는 학생이어도 teacher ID만 알면 슬롯 조회 자체는 됩니다.

다만 UI는 다르게 막고 있습니다.

- `GET /api/v1/teachers`는 학생 로그인 상태일 때 담당 교사가 없으면 `items: []`를 반환합니다.
- `app.html` 학생 화면은 담당 교사가 없으면 캘린더/예약 목록을 숨기고 `#studentNeedsTeacherNotice`를 보여줍니다.

즉 현재 구조는 이렇게 이해하는 게 맞습니다.
- 목록/앱 동선: 담당 교사 연결 전제
- 직접 슬롯 조회 API: 공개에 가까움
- 실제 예약 생성: 담당 교사 일치 강제

해석:
- 코드 기준으로는 "예약은 엄격하게 막고, 슬롯 조회는 느슨하게 열어둔 구조"입니다.
- 이건 캘린더 공유 링크, 초대 링크, 향후 공개 조회를 염두에 둔 설계로 보이지만, 엄격한 정책이 필요하면 슬롯 조회 단계에도 학생-교사 연결 검증을 추가해야 합니다.

## 질문 5. `one_time_availabilities`와 `weekly_availabilities`는 어떻게 겹치나?

현재 동작은 "일회성 블럭이 우선권을 가지는 오버레이"에 가깝습니다.

### 예약 가능 여부 단건 판정 (`getBookableSlotAt`)
- `weekly_slots`와 `one_time_slots`를 모두 후보 윈도우로 모읍니다.
- 같은 시작 시각 요청이 두 윈도우에 모두 들어가면 `source_priority DESC`로 고르기 때문에
  - `weekly = 1`
  - `one_time = 2`
  이라서 일회성이 우선합니다.
- 여기서는 사실상 해당 시점의 `lesson_title` 같은 메타데이터가 일회성 쪽으로 덮입니다.

### 슬롯 목록 조회 (`GET /teachers/:teacherId/slots`)
- weekly / one-time 윈도우를 각각 실제 슬롯들로 expand합니다.
- 그다음 `DISTINCT ON (start_at)`로 중복 시작 시각을 제거하는데, 정렬이 `source_priority DESC`라서 같은 시작 시각이면 one-time이 이깁니다.
- 다만 dedupe 기준이 `start_at`이므로, 겹치지 않는 다른 시작 시각 슬롯은 weekly 쪽도 남을 수 있습니다.

정리하면:
- one-time이 "해당 날짜 전체를 완전히 대체"하는 구조는 아닙니다.
- 같은 start slot이 겹치면 one-time이 우선합니다.
- 겹치지 않는 weekly 슬롯은 그대로 남습니다.
- 이후 availability exception이 있으면 weekly든 one-time이든 다시 제외됩니다.
