# LessonHub — 구현 가이드 (Next.js + Supabase)

## Overview
LessonHub는 피아노·요가·과외·코칭 같은 **1:1 레슨 예약·운영 MVP**입니다. 학생은 선생님의 가능한 시간을 보고 예약하고, 선생님은 수업 가능 시간과 예외 일정을 관리하며, 파워관리자는 사용자·연결을 운영 콘솔에서 관리합니다. 역할은 `STUDENT / TEACHER / POWER_ADMIN`, 기본 시간대는 `Asia/Seoul`입니다.

서비스 컨셉·역할별 기능·핵심 규칙은 [concept-and-features.md](concept-and-features.md)를, 이 문서는 **기술 스택 + "Coral Blush" 디자인 언어 + 화면 명세**를 다룹니다.

## Tech Stack
- **프론트엔드**: Next.js (App Router) + React + TypeScript
- **백엔드/DB**: Supabase (PostgreSQL + Auth + Row Level Security) — 기존 Supabase 프로젝트를 **초기화 후 재사용**
- **인증**: Supabase Auth (이메일/비밀번호. 카카오 등 소셜은 향후 Auth 프로바이더로 연동)
- **스타일**: 디자인 토큰은 CSS 변수 / Tailwind 토큰으로 매핑 (아래 표가 단일 진실 원천)

> 신규 빌드이므로 화면·API·DB 스키마를 처음부터 구성합니다. 아래 화면 명세를 React 컴포넌트로 구현하고, 데이터는 Supabase에서 가져옵니다.

## Fidelity
**High-fidelity (hifi).** 최종 색상·타이포·간격·라운드·상태색이 모두 확정된 픽셀 단위 명세입니다. 아래 토큰과 측정값을 그대로 적용해 픽셀에 가깝게 구현하세요. (단, 데이터/문구는 예시이므로 실제 데이터로 대체)

---

## Design Tokens

### Colors
| 토큰 | HEX | 용도 |
|---|---|---|
| `bg` | `#FBF3EE` | 앱 배경 (블러시 크림) |
| `surface` | `#FFFFFF` | 카드 · 표면 · 상단 네비 |
| `ink` | `#3B2A29` | 본문 텍스트 (웜 잉크) |
| `sub` | `#7A635E` | 보조 텍스트 |
| `muted` | `#B6A39C` | 약한 텍스트 · 비활성 |
| `line` | `#F0E1D9` | 카드/구획 경계선 |
| `lineSoft` | `#F7ECE5` | 내부 분리선 · 약한 배경 |
| `coral` | `#EC6A4C` | **주색** · 기본 액션 버튼 · 선택 상태 |
| `coralDeep` | `#D9543A` | 강조 텍스트 · 링크 · 시간 숫자 |
| `coralTint` | `#FBE6DD` | 코랄 칩/배지 배경 · today 하이라이트 |
| `coralBorder` | `#F4C3B3` | "예약 가능" 슬롯 테두리 · 점선 |
| `pink` | `#F2899B` | 보조색 · 그라데이션 끝 |
| `pinkTint` | `#FCE9ED` | (보조 배경) |
| `rose` | `#D45C79` | "내 예약 / 확정 / 선생님 역할" |
| `roseTint` | `#F8E2E8` | rose 칩/셀 배경 |
| `roseBorder` | `#EFC4D0` | rose 경계 |
| `success.fg` | `#3E9A6F` | 의미용 그린 — "활성/확정" 텍스트 |
| `success.bg` | `#E7F2EC` | 그린 칩 배경 |

> 그라데이션(로그인 브랜드 패널, 모바일 헤더 액센트): `linear-gradient(150deg, #EC6A4C 0%, #F2899B 100%)`.
> 브랜드는 코랄/핑크가 이끌고, 보라색은 쓰지 않습니다. 그린은 "좋음(활성/확정)" 의미 전달에만 1색으로 사용.

### Typography — Pretendard
폰트: **Pretendard**. Next.js에서는 `pretendard` npm 패키지 또는 `next/font/local`로 self-host 권장 (CDN보다 안정적).
| 역할 | size / weight | 비고 |
|---|---|---|
| 페이지 타이틀 | 22px / 800, letter-spacing -0.4 | "내 예약", "사용자 관리" 등 |
| 로그인 헤드라인 | 34px / 800, line-height 1.25, ls -0.8 | 브랜드 패널 |
| 섹션/이름 | 20px / 700, ls -0.3 | "이지원 선생님 · 피아노" |
| 카드 제목 | 14.5–15px / 700 | |
| 본문 | 14.5px / 500 | |
| 보조/메타 | 12.5–13px / 400–600 | |
| 마이크로 라벨 | 11–11.5px / 600–700 | 테이블 헤더, 칩 |
| **시간 숫자** | 16–24px / 700–800, `font-variant-numeric: tabular-nums` | 슬롯 시간, 날짜 숫자 |

모든 숫자(시간/날짜/통계)에는 `tabular-nums`를 적용해 정렬을 맞춥니다.

### Radius / Shadow / Spacing
- Border radius: 카드 `13–14px`, 칩/배지 `7–8px`, 버튼 `11–14px`, 인풋 `12px`, 아바타 `50%`, 토글 트랙 `12px`.
- 토글: 트랙 `40×23px`, 노브 `18×18px` 원, on이면 노브 left `20px` + 트랙 `coral`, off면 left `2.5px` + 트랙 `line`.
- 그림자: 대부분 그림자 없이 `1px solid line` 경계선 사용. today 카드 강조만 `box-shadow: 0 0 0 3px coralTint`. 로그인 폼 버튼/카드도 그림자 최소화. (카드 남발·과한 그림자 금지)
- 페이지 패딩: 데스크톱 `22–28px`, 요소 간 gap `6–18px`.
- 상단 네비 높이: `58px`, 좌측 `4px` 코랄→핑크 그라데이션 액센트 바.

### 상태(Status) 색상 매핑
| 의미 | fg / bg |
|---|---|
| 예약 가능 (open) | `coralDeep #D9543A` 텍스트 + `coralBorder #F4C3B3` 1.5px 테두리, 배경 white |
| 내 예약 / 확정 (mine/confirmed) | white 텍스트 on `rose #D45C79` (또는 그린 `#3E9A6F`/`#E7F2EC` 칩) |
| 마감 / 완료 (full/done) | `muted #B6A39C` on `lineSoft #F7ECE5` |
| 휴무 (off) | 대각선 해치: `repeating-linear-gradient(45deg,#F4E8E1,#F4E8E1 5px,#FBF3EE 5px,#FBF3EE 10px)` |
| 취소 / 경고 | `coralDeep` on `coralTint` |
| 활성(admin active) | `#3E9A6F` on `#E7F2EC` · 대기 `#C9512F` on `#FBE6DD` · 일시정지 `#9A8A83` on `#F4ECE7` |

---

## Screens / Views

공통: 상단 네비(`surface` 배경, 하단 `1px line`, 좌측 4px 그라데이션 바). 좌측 로고(`28px` 코랄 라운드 사각 "L" + "LessonHub" 16.5/700), 가운데 탭(활성 탭은 `coralDeep` 텍스트 + `coralTint` 배경 pill, 비활성은 `muted`), 우측 역할 라벨 + 아바타(`coralTint`/`coralDeep`).

### 1. 로그인 · 진입 (`E_Login`)
- **Purpose**: 이메일/비밀번호 로그인, 회원가입 진입. 개발자용 요소(테스트 계정/토큰/API)는 **노출 금지**.
- **Layout**: 좌우 2분할. 좌측 **브랜드 패널 46%** + 우측 **폼 영역 flex:1**.
  - 좌측 패널: `linear-gradient(150deg,#EC6A4C,#F2899B)`, 흰 텍스트, `padding 44px 40px`, `space-between` 세로 배치. 장식: 반투명 흰 원 2개(우상단 360px, 좌하단 220px, `rgba(255,255,255,.1~.12)`).
    - 상단: 흰 라운드 로고 + "LessonHub"(21/800).
    - 중앙: "레슨 예약,\n이제 한 곳에서\n간단하게."(34/800, lh 1.25) + 설명문(15/`rgba(255,255,255,.9)`, max-width 320).
    - 하단: "피아노 · 요가 · 과외 · 코칭을 위한 1:1 예약 도구"(12.5).
  - 우측 폼: 가운데 정렬, `max-width 360px`. "다시 오신 걸 환영해요"(25/800) + 안내(14/muted). 라벨(13/600/sub) + 인풋(높이 48, radius 12, `1.5px line` 테두리). 비밀번호 라벨 우측에 "비밀번호 찾기"(coralDeep). "로그인" 버튼(full, 높이 50, radius 13, `coral` 배경, 흰 16/700). "또는" 디바이더. "처음이신가요? **회원가입**"(coralDeep).
- **Interactions**: 로그인 → 역할에 따라 학생 캘린더 / 선생님 주간 / 관리자 콘솔로 라우팅. 인풋 focus 시 테두리 `coral`로.

### 2. 학생 · 예약 캘린더 (`E_Student`)
- **Purpose**: 선생님의 주간 가능 슬롯을 보고 예약. "언제 예약 가능한지" 즉시 파악이 최우선.
- **Layout**: 네비(student, 활성=예약하기) → 헤더(선생님 아바타 44 + "이지원 선생님 · 피아노" 20/700 + 안내 + `🕓 Asia/Seoul · KST` 칩, 우측 주간 네비) → **7열 CSS grid (`repeat(7,1fr)`, gap 8)** → 하단 범례 + 취소정책.
  - 각 요일 = 세로 카드(`surface`, radius 13, `1px line`). today는 `coralBorder` + `box-shadow 0 0 0 3px coralTint`.
  - 카드 헤더: 요일(12/600, 일요일은 rose) + 날짜(19/700, today는 coralDeep), today 헤더 배경 `coralTint`.
  - 본문 슬롯 칩(세로 stack, gap 6):
    - **예약 가능**: 시간(13/700 coralDeep) on white, `1.5px coralBorder`, radius 7, `cursor:pointer`.
    - **내 예약**: "{시간} · 내 예약"(12.5/700 흰색) on `rose`, radius 7.
    - **마감**: "{시간} · 마감"(12/muted) on `lineSoft`.
    - **지난 시간**: 시간(12/`#D8C8C0`) + `line-through`.
    - 지난 날짜(컬럼 전체 과거): 가운데 "지난 날짜"(muted). 휴무: 가운데 "휴무".
  - 범례: 예약 가능 / 내 예약 / 마감 / 휴무. 우측 "취소는 수업 **48시간 전**까지 가능합니다".
- **상태**: 슬롯 status = `open | full | mine | past | off`. 클릭 → 예약 확인 모달(시간/선생님/소요시간/취소정책 표시 후 확정).

### 3. 학생 · 내 예약 목록 (`E_MyBookings`)
- **Purpose**: 다가오는/지난 예약 확인, 취소 가능 여부와 마감 정책 이해, 취소.
- **Layout**: 네비(활성=내 예약) → 헤더("내 예약" 22/800 + 우측 "취소는 수업 48시간 전까지" 칩) → 카운트 → **"다가오는 예약"** 섹션 + **"지난 수업"** 섹션. 각 항목은 가로 카드(radius 14, `1px line`).
  - 카드 좌→우: 날짜블록(요일 12/700 + 날짜 21/800) | 세로 구분선 | 시간(22/800 coralDeep) | 선생님·과목 + 취소 안내(12.5) | 상태 칩 | 취소 버튼.
  - **취소 마감 임박(soon)**: 안내문 "⚠ 취소 마감 임박 · 오늘 09:00 마감"(coralDeep/600), 버튼은 "취소 마감" 비활성(`cursor:not-allowed`).
  - **여유(ok)**: "6.13 16:00까지 취소 가능", "예약 취소" 버튼 활성.
  - **완료(done)**: 카드 `opacity .72`, 버튼 없음.
- **데이터**: 예약별 `state: soon|ok|done` + `cancelBy`(취소 마감 문구) 계산.

### 4. 학생 · 모바일 예약 (`E_Mobile`)
- **Purpose**: 모바일 1순위. 답답하지 않은 큰 터치 타깃.
- **Layout** (375px 폭 기준, iOS 프레임): 헤더(상단 3px 그라데이션 액센트 + 선생님 아바타 40 + 이름/과목) → **가로 요일 스트립**(5일, 선택일은 `coral` 배경 흰 텍스트, radius 12) → 날짜 라벨 → **슬롯 리스트**(세로, 각 행 radius 13 `1.5px` 테두리, 좌측 시간 17/700 + "예약 가능/마감", 우측 `›`. 마감은 `opacity .55`) → 하단 고정 CTA("16:00 예약하기" 높이 52, `coral`, radius 14) + 취소정책.
- **터치 타깃**: 모든 행/버튼 높이 ≥ 44px (CTA 52, 슬롯 행 ~52).

### 5. 선생님 · 주간 운영 (`E_Teacher`)
- **Purpose**: "오늘/이번 주 운영 상태"와 "해야 할 관리 작업"을 한눈에.
- **Layout**: 네비(teacher, 활성=주간 캘린더) → 헤더("이번 주 운영" 20/700 + 월/타임존, 우측 주간 네비) → **통계 스트립**(4분할: 오늘 수업 3건 / 이번 주 예약 9건 / 열어둔 빈 슬롯 12개 / 예외·휴무 1일 — 숫자 22/700, 첫 항목 coralDeep, 세로 구분선) → **알림 2칸**(좌: rose 배경 "최서연 학생 연결 요청 대기" + "확인 →"; 우: "일요일(6.14) 휴무 등록됨") → **시간축 주간 그리드**.
  - 그리드: `grid-template-columns: 52px repeat(7,1fr)`. 좌측 열=시간(11/muted), 상단 행=요일+날짜(today 헤더 `coralTint`).
  - 셀 status: 예약=학생명(11/700 rose on `roseTint`, 좌측 `inset 2px 0 0 rose` 액센트) · 열림=점선 테두리 "열림"(coralBorder dashed) · 완료="완료"(muted) · 휴무=해치 · 미설정=`·`. today 컬럼 배경 `rgba(236,106,76,.04)`.
  - 하단 범례: 예약(학생명)/열림/완료/휴무.

### 6. 선생님 · 시간표 · 예외 관리 (`E_Schedule`)
- **Purpose**: 주간 가능 시간 템플릿 설정 + 특정 날짜 예외/휴무 등록. "주간 템플릿 + 예외 = 학생에게 보이는 슬롯".
- **Layout**: 네비(활성=시간표·예외) → 헤더(설명 포함) → 2분할.
  - 좌측(flex 1.25) **주간 가능 시간**: 요일 7행. 각 행 = 요일명(13.5/600) + **토글**(40×23, on이면 coral) + 시간대 칩들(예 "10:00 – 12:00", coralDeep on coralTint, radius 8) + "+ 시간"(점선 coralBorder). 일요일은 off(휴무 텍스트).
  - 우측(320px) **예외 · 휴무**: "+ 예외 추가"(coral 버튼). 항목 카드(radius 12): 날짜(13.5/700) + 종류 칩(휴무 muted / 휴강 coral / 오픈 green) + 라벨 + 설명.
- **상태**: 토글 → 해당 요일 활성/휴무. 예외 추가 → 날짜·시간·종류(off/close/open) 입력 모달.

### 7. 선생님 · 예약 관리 (`E_Bookings`)
- **Purpose**: 들어온/완료/취소 예약 확인.
- **Layout**: 네비(활성=예약 관리) → 헤더("예약 관리" + 학생 검색) → **탭**(들어온 예약 9 [활성, coral] / 완료된 수업 24 / 취소됨 2) → **테이블**.
  - 테이블 컬럼: `1.6fr 1.2fr 1fr 1fr 1.1fr` = 학생(아바타30+이름) / 날짜·시간 / 과목 / 상태 칩(확정=green, 완료=muted, 취소=coral) / "상세 보기"(coralDeep). 헤더 행 `lineSoft` 배경, 행 분리선 `lineSoft`.
- **상태**: 탭 전환 시 status 필터(`ok|done|cancel`).

### 8. 파워관리자 · 사용자 관리 (`E_Admin`)
- **Purpose**: 운영 콘솔. 밀도 있고 명확하게. 사용자·역할·연결·상태 관리.
- **Layout**: 네비(admin 모드: 대시보드/사용자[활성]/연결/활동 로그/패치노트/정책) → 헤더("사용자 관리" + 카운트, 우측 검색 + "+ 사용자" coral 버튼) → **필터 칩**(전체7[활성]/학생5/선생님2/연결 대기1/일시정지1) → **테이블**.
  - 컬럼: `1.6fr 1fr 1.4fr 1fr 1fr 0.7fr` = 사용자(아바타+이름+가입일) / 역할 칩(학생=coral, 선생님=rose, 관리자=green) / 연결(대기는 coralDeep) / 상태 칩(활성 green/대기 coral/일시정지 muted) / 마지막 활동 / `⋯`.
- **데이터**: 사용자별 `role`, `link`, `state: active|pending|paused`, `last`(마지막 활동), `joined`(가입일).

---

## Interactions & Behavior
- **네비 탭**: 클릭 시 해당 화면으로 이동, 활성 탭 = `coralTint` pill + `coralDeep` 텍스트.
- **슬롯 예약 흐름(학생)**: 슬롯 클릭 → 확인 모달(시간·선생님·소요·취소정책) → 확정 → 캘린더에 "내 예약"(rose)로 표시, "내 예약 목록"에 추가.
- **취소 정책**: 수업 48시간 전까지만 취소 가능. 마감 임박(soon)은 경고색 + 버튼 비활성.
- **선생님 토글/예외**: 토글 즉시 반영(낙관적 업데이트), 예외는 모달로 추가/수정/삭제.
- **호버**: 클릭 가능한 슬롯/버튼/링크는 미세한 밝기 변화 또는 배경 틴트. 슬롯 카드 호버 시 `coral` 강조 가능.
- **반응형**: 데스크톱 7열 그리드 → 모바일은 요일 스트립 + 단일 일자 슬롯 리스트로 전환(화면 4 참고). 터치 타깃 ≥ 44px.
- **빈/로딩/에러 상태**: 슬롯 없음 = "이 날은 예약 가능한 시간이 없어요", 로딩 = 스켈레톤(coralTint/lineSoft), 에러 = coralDeep 안내 배너.

## State Management
- 현재 역할(STUDENT/TEACHER/POWER_ADMIN) + Supabase Auth 세션.
- 선택 주(week range), 선택 일(day) — 학생 캘린더/모바일.
- 슬롯 데이터: 선생님 주간 템플릿 + 예외 + 기존 예약을 합성해 슬롯 상태(`open/full/mine/past/off`)를 계산해 렌더.
- 예약 목록(다가오는/지난), 취소 가능 여부(48h 규칙) 계산.
- 관리자: 사용자 목록 + 필터/검색 상태.

## Assets
- **폰트**: Pretendard (`next/font`로 self-host).
- **아이콘**: 라인 아이콘은 단순 inline SVG(달력/시계/리스트/사용자/톱니 등). 코랄 톤 단색. 별도 이미지 에셋 없음 — 아이콘 컴포넌트로 관리.
- **이미지 없음**: 장식은 CSS 그라데이션/원형 도형으로 처리(로그인 패널). 외부 이미지 의존성 없음.
- 이모지(🕓, ⚠, 👋, 🔍 등)는 보조 표시로만 사용 — 필요 시 아이콘으로 대체 가능.

## 제약(중요)
- 마케팅 랜딩페이지가 아니라 **실사용 예약/운영 도구**. 카드 남발·과한 그라데이션·장식 배경·pill 남용 금지.
- 모든 문구/톤은 자연스러운 한국어 기준.
- 디자인 토큰은 위 표가 단일 진실 원천 — 임의의 색/치수 추가 금지.
