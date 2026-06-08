# 카카오 간편로그인 활성화 가이드

> 현재 상태: UI 버튼 + 백엔드 endpoint 스켈레톤 완성. **카카오 콘솔 설정 + Vercel 환경변수 + 백엔드 OAuth 구현** 이 남아 있음.

작업 분량: 약 1-2 일 (카카오 콘솔 설정 30분 + 백엔드 구현 반나절 + 테스트)

---

## 📋 진행 순서 한눈에

| 단계 | 주체 | 소요 |
|---|---|---|
| 1. 카카오 개발자 등록 + 앱 생성 | 사용자 | 10분 |
| 2. 플랫폼 / Redirect URI 등록 | 사용자 | 5분 |
| 3. 카카오 로그인 활성화 + 동의항목 설정 | 사용자 | 10분 |
| 4. REST API 키 복사 | 사용자 | 1분 |
| 5. Vercel 환경변수 등록 | 사용자 | 3분 |
| 6. 백엔드 OAuth flow 구현 | Claude | 반나절 |
| 7. 테스트 + 배포 | 함께 | 30분 |

---

## 1️⃣ 카카오 개발자 등록 + 앱 생성

1. https://developers.kakao.com/ 접속 → 우상단 **로그인** (카카오 계정)
2. 처음이면 약관 동의 후 개발자 등록
3. 상단 **내 애플리케이션** → **애플리케이션 추가하기**
4. 입력:
   - **앱 이름**: `LessonHub` (또는 원하는 이름)
   - **사업자명**: 개인이면 본인 이름
   - **카테고리**: 교육
5. 저장

---

## 2️⃣ 플랫폼 등록 + Redirect URI

앱 생성 후 **앱 설정** → **플랫폼**:

### Web 플랫폼 추가
**사이트 도메인**:
```
https://lesson-hub-eta.vercel.app
```
(본인 Vercel 도메인. 커스텀 도메인 있으면 그것도 같이 등록)

### Redirect URI 등록
**제품 설정 → 카카오 로그인 → Redirect URI** 에 다음 추가:
```
https://lesson-hub-eta.vercel.app/api/v1/auth/social/kakao/callback
```

(로컬 개발용도 추가하려면)
```
http://localhost:4000/api/v1/auth/social/kakao/callback
http://localhost:18080/api/v1/auth/social/kakao/callback
```

---

## 3️⃣ 카카오 로그인 활성화 + 동의항목

### 활성화
**제품 설정 → 카카오 로그인** → **활성화 설정 ON**

### 동의항목 (개인정보 보호 동의)
**제품 설정 → 카카오 로그인 → 동의항목**:

| 항목 | 동의 단계 | 사용 목적 |
|---|---|---|
| 닉네임 | **필수 동의** | 사용자 이름으로 표시 |
| 카카오계정(이메일) | **선택 동의** | 로그인 식별자 + 알림 (선택) |
| 프로필 사진 | (사용 안 함) | - |

> ⚠️ 이메일은 **선택 동의** 만 가능 (필수 만들려면 비즈앱 심사 필요). 이메일 미동의 시 닉네임 + 카카오 ID 로 가입 처리하도록 설계.

---

## 4️⃣ REST API 키 복사

**앱 설정 → 앱 키** 에서 **REST API 키** 만 복사. 다른 키는 사용 안 함.

형태 예: `f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6` (32자 hex)

> 보안: 절대 GitHub 에 commit 하지 말 것. Vercel 환경변수에만.

---

## 5️⃣ Vercel 환경변수 등록

Vercel 대시보드 → 프로젝트 → **Settings → Environment Variables**:

| Name | Value | Environments |
|---|---|---|
| `OAUTH_KAKAO_CLIENT_ID` | 4️⃣ 에서 복사한 REST API 키 | Production · Preview · Development |
| `OAUTH_KAKAO_REDIRECT_URI` | `https://lesson-hub-eta.vercel.app/api/v1/auth/social/kakao/callback` | Production · Preview |

(선택 — Client Secret 활성화 시)
| `OAUTH_KAKAO_CLIENT_SECRET` | 카카오 콘솔의 보안 → Client Secret | 동일 |

등록 후 **Redeploy 필요** (환경변수만 바꾸면 자동 반영 안 됨).

이 시점에서 `/api/v1/auth/social/providers` 응답이 다음으로 바뀜:
```json
{"items":[{"provider":"KAKAO","enabled":true,"setup_required":false,"implemented":false}]}
```

`enabled: true` → 5️⃣ 단계 완료. 다만 `implemented: false` → 아직 클릭하면 501 응답. 6️⃣ 필요.

---

## 6️⃣ 백엔드 OAuth flow 구현 (Claude 가 진행)

다음 endpoint 2개를 backend/src/index.js 에 추가해야 함:

### A. `POST /api/v1/auth/social/KAKAO/start`
- state 값 (CSRF 방지) 생성 → DB 또는 signed JWT 에 임시 저장
- 카카오 인증 URL 생성:
  ```
  https://kauth.kakao.com/oauth/authorize
    ?response_type=code
    &client_id={REST_API_KEY}
    &redirect_uri={REDIRECT_URI}
    &state={state}
    &scope=account_email,profile_nickname
  ```
- 응답: `{ start_url: "..." }` → 프론트가 `window.location.href` 로 리디렉션

### B. `GET /api/v1/auth/social/KAKAO/callback?code=...&state=...`
1. state 검증 (CSRF)
2. `code` → 토큰 교환:
   ```
   POST https://kauth.kakao.com/oauth/token
     grant_type=authorization_code
     client_id={REST_API_KEY}
     redirect_uri={REDIRECT_URI}
     code={code}
   ```
3. 받은 `access_token` 으로 사용자 정보 조회:
   ```
   GET https://kapi.kakao.com/v2/user/me
     Authorization: Bearer {access_token}
   ```
4. 응답에서 `id` (카카오 unique ID) + `kakao_account.profile.nickname` + `kakao_account.email` (있으면) 추출
5. DB 사용자 매핑:
   - `oauth_provider='KAKAO' AND oauth_subject={kakao_id}` 로 기존 사용자 찾기
   - 없으면: 새 사용자 자동 생성 (role=STUDENT, account_tier=FULL, password_hash=무작위)
   - 또는 기존 이메일 매칭 사용자에게 연결
6. 우리 JWT 발급 → 프론트에 redirect (token 쿠키 or URL fragment)

### 필요한 DB 마이그레이션 (`024_oauth_identities.sql`)
```sql
CREATE TABLE IF NOT EXISTS oauth_identities (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('KAKAO', 'GOOGLE', 'NAVER')),
  subject TEXT NOT NULL,
  email TEXT,
  raw_profile JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider, subject)
);
```

### 프론트 변경
- 카카오 버튼 클릭 → 기존 `/api/v1/auth/social/KAKAO/start` POST → `start_url` 로 리디렉션 (이미 구현됨)
- callback 페이지 (`/auth/kakao/callback.html`) → URL 의 token 받아 localStorage 저장 → 적절한 홈으로

---

## 7️⃣ 테스트

배포 후:
1. 학생/선생 로그인 페이지 → 카카오 버튼 클릭
2. 카카오 로그인 페이지로 리디렉션
3. 동의 후 우리 사이트로 돌아옴
4. 로그인 완료 상태 확인

테스트 계정 (개발 단계):
- 카카오 콘솔의 **팀원 관리** 에서 본인 계정 + 테스트할 사람 등록
- 또는 비즈앱 심사 통과해야 일반 사용자 사용 가능

---

## 🛟 트러블슈팅

| 에러 | 원인 / 해결 |
|---|---|
| `KOE004 redirect_uri_mismatch` | 카카오 콘솔의 Redirect URI 와 실제 호출 URI 불일치 → 정확히 일치시키기 (`/` 누락, `http` vs `https` 등) |
| `KOE006 invalid_client` | REST API 키 잘못 입력 → 카카오 콘솔에서 복사 다시 |
| 이메일 안 받아짐 | 동의항목 선택 동의로 설정됨 → 사용자가 동의 안 함. 닉네임 + kakao_id 로 처리하도록 fallback |
| 카카오 페이지에서 "이 앱은 사용할 수 없습니다" | 앱이 비활성화 상태 → 콘솔에서 활성화 확인 |
| callback 까지 왔는데 500 | state 검증 실패 또는 토큰 교환 실패 → Vercel Function Logs 확인 |

---

## 📌 사용자가 지금 해야 할 것 (요약)

1. **1️⃣ ~ 5️⃣ 단계** 진행 (카카오 콘솔 설정 + Vercel 환경변수)
2. `/api/v1/auth/social/providers` 응답에서 `enabled: true` 확인
3. 그러면 Claude 에게 알려주세요 → 6️⃣ 백엔드 OAuth flow 구현 진행

비즈앱 심사가 필요한 경우 (실제 사용자 모집 단계) 까지는:
- 개발자 본인 + 팀원 등록한 카카오 계정만 로그인 가능
- 일반 사용자 모집 시작 전에 비즈앱 신청 → 약 1-2주 심사
