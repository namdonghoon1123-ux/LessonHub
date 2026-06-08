# Vercel + Supabase 배포 가이드

LessonHub 를 Docker 로컬 스택에서 Vercel(호스팅 · 서버리스) + Supabase(PostgreSQL) 로 옮기는 절차.

## 한 줄 요약

- **프론트**: `frontend/` 정적 파일을 Vercel 이 그대로 서빙
- **백엔드**: `backend/src/index.js` (Express 단일 파일) 를 `api/[...path].js` catchall 이 Vercel Serverless Function 으로 호출
- **DB**: Supabase Postgres + 기존 마이그레이션 16개 + `017_pg_cron_schedulers.sql` (백그라운드 작업 이관)

## 0. 사전 준비

- GitHub 레포 : `namdonghoon1123-ux/LessonHub` (이미 연계됨)
- Supabase 계정 + 무료 프로젝트 1개
- Vercel 계정 + GitHub 연결

## 1. Supabase 프로젝트 설정

### 1-1. 프로젝트 생성
1. https://supabase.com/dashboard → New project
2. region: `Northeast Asia (Seoul)` 권장 (Asia/Seoul 서비스 기준 시간대와 매칭)
3. DB 비밀번호 안전한 곳에 보관

### 1-2. 스키마 적용

#### Option A (추천) — 통합 SQL 한 번에 실행
프로젝트에 `scripts/supabase-bootstrap.sql` (마이그레이션 001~017 + 시드 통합본) 이 포함되어 있다. 이 파일 전체를 **Supabase 대시보드 → SQL Editor** 에 붙여넣고 Run.

또는 `psql`:
```bash
export SUPABASE_DB_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
psql "$SUPABASE_DB_URL" -f scripts/supabase-bootstrap.sql
```

#### Option B — 마이그레이션 파일 개별 실행
SQL Editor 에서 `db/migrations/001~017` 을 순서대로 실행, 그 다음 `db/seeds/001_seed.sql`.

또는 `psql` 반복문:
```bash
export SUPABASE_DB_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
for f in db/migrations/*.sql; do psql "$SUPABASE_DB_URL" -f "$f"; done
psql "$SUPABASE_DB_URL" -f db/seeds/001_seed.sql
```

### 1-3. pg_cron 확인
`017_pg_cron_schedulers.sql` 적용 후 다음 쿼리로 등록 확인:
```sql
SELECT jobname, schedule, active FROM cron.job ORDER BY jobid;
-- lh-auto-complete    | * * * * *  | t
-- lh-guest-retention  | 0 17 * * * | t
```

Supabase 무료 플랜에서도 pg_cron 사용 가능. 매분 트리거.

### 1-4. Connection string
Settings → Database → Connection string (URI). **Vercel Serverless 에선 반드시 pooler (port 6543, "transaction" 모드) 사용** — 일반 5432 직접 연결은 cold start 시 연결 누수 위험.

```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

## 2. Vercel 프로젝트 설정

### 2-1. Import
1. https://vercel.com/new → Import `namdonghoon1123-ux/LessonHub`
2. Framework Preset : `Other` (vercel.json 이 자동 인식됨)
3. Root Directory : `.` (그대로)

### 2-2. 환경 변수
Settings → Environment Variables 에 다음 등록 (Production + Preview):

| Key | Value |
|---|---|
| `DATABASE_URL` | 1-4 의 Supabase pooler URI |
| `JWT_SECRET` | 무작위 32바이트 이상 (`openssl rand -hex 32`) |
| `NODE_ENV` | `production` |

선택:
| Key | Value | 용도 |
|---|---|---|
| `OAUTH_GOOGLE_CLIENT_ID` | ... | Google 로그인 활성화 |
| `OAUTH_NAVER_CLIENT_ID` | ... | Naver 로그인 활성화 |
| `APP_CONFIG_FILE` | `backend/config/app.config.json` | (기본값과 동일) |

### 2-3. 배포
Vercel 대시보드에서 `Deploy` 또는 git push → 자동 배포.

배포 후:
- `https://<your-project>.vercel.app/` → 정적 프론트 (현재 index.html)
- `https://<your-project>.vercel.app/api/v1/health` → Express 헬스체크
- `https://<your-project>.vercel.app/api/v1/auth/login` → 로그인 API

## 3. 구조 매핑

> 참고: 과거에는 로컬 Docker 스택을 썼으나 2026-06-08 제거됨. 현재는 아래 Vercel+Supabase 구성만 사용한다.

| 역할 | Vercel + Supabase |
|---|---|
| 정적 프론트 | `frontend/` (Vercel 정적 호스팅, vercel.json outputDirectory) |
| `/api/*` 라우팅 | vercel.json rewrites `/api/:path*` → `api/[...path].js` (Serverless catchall) |
| 백엔드 앱 | `backend/src/index.js` 가 `app` export, `api/[...path].js` 가 함수로 wrap |
| 스케줄러 | Supabase `pg_cron` 잡 2개 (`db/migrations/017_pg_cron_schedulers.sql`) |
| 마이그레이션 | Supabase SQL Editor 에 `scripts/supabase-bootstrap.sql`, 또는 `npm --prefix backend run migrate` (DATABASE_URL) |

## 4. 로컬 개발 (선택)

Vercel 함수도 로컬에서 확인 가능:
```bash
npm i -g vercel
vercel env pull .env.local   # 클라우드 env 를 로컬로 끌어옴
vercel dev                    # http://localhost:3000
```

로컬 백엔드/테스트는 `.env` 의 `DATABASE_URL` 을 Supabase **dev** DB 로 두고 `npm --prefix backend test` / `node backend/src/index.js` 로 실행한다. (Docker 는 사용하지 않음)

## 5. 주의 사항

- **Vercel cold start**: 첫 요청은 1-3초 지연. 사용자 체감 큰 화면(로그인)은 health-check pinger 로 warm up 권장
- **Function 메모리**: 기본 1024MB 면 충분하지만 vercel.json 에 `memory: 512` 로 명시 (비용 ↓)
- **Function 타임아웃**: 30초 (Hobby 플랜 한계). 슬롯 조회/예약 생성은 평균 100-300ms 라 무리 없음
- **Connection pool 누수**: backend/src/db.js 의 `new Pool()` 이 함수 invocation 별로 생성됨 → Supabase pooler URI 사용으로 해결
- **`auth_token_revocations` 테이블**: 자체 JWT 흐름 유지 시 그대로 사용. Supabase Auth 로 이전하면 불필요해짐 (단, 코드 큰 변경 필요)

## 6. 롤백

- DNS/도메인은 그대로 두고 Vercel deploy 만 비활성 → Docker 로 즉시 복귀 가능
- Supabase 데이터는 `pg_dump` 로 백업 → 로컬 Postgres 로 복원 가능
- `legacy` remote (origin/myapp.git) 는 보존되어 있음 — `git push legacy main` 으로 옛 레포 복귀 가능

## 7. 향후 개선

- [ ] Supabase Auth 로 이전 (소셜 로그인 1줄로 활성화)
- [ ] backend/src/index.js (4292줄) 를 라우터 단위로 분할 → Vercel cold start 개선
- [ ] Supabase Storage 로 학생/선생님 프로필 이미지 호스팅
