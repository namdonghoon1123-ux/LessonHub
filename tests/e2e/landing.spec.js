// 랜딩(역할 선택) + 로그인 화면 기본 회귀 테스트.
// 디자인 토큰 변경 후에도 핵심 요소(폼, 버튼, 디버그 노출 금지)가 유지되는지 검증.
const { test, expect } = require('@playwright/test');

test.describe('랜딩 (역할 선택)', () => {
  test('홈에서 3 역할 카드가 모두 표시되고 클릭 가능하다', async ({ page }) => {
    await page.goto('/index.html');

    // 헤드라인
    await expect(page.locator('.auth-shell__brand-headline')).toContainText('레슨 예약');

    // 3 역할 카드
    await expect(page.locator('.role-card', { hasText: '선생님으로 시작' })).toBeVisible();
    await expect(page.locator('.role-card', { hasText: '학생으로 시작' })).toBeVisible();
    await expect(page.locator('.role-card', { hasText: '파워관리자' })).toBeVisible();

    // 테스트 계정 힌트가 노출되면 안 됨 (runtime-config = false)
    const hints = page.locator('[data-test-account-hint]');
    const visibleCount = await hints.evaluateAll((els) => els.filter((el) => !el.hidden).length);
    expect(visibleCount).toBe(0);
  });

  test('선생님 로그인 카드 클릭 → /teacher-login.html 이동', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('.role-card', { hasText: '선생님으로 시작' }).click();
    await expect(page).toHaveURL(/\/teacher-login\.html/);
  });
});

test.describe('로그인 화면', () => {
  test('학생 로그인 폼이 정상 렌더된다', async ({ page }) => {
    await page.goto('/student-login.html');
    await expect(page.locator('h2#roleTitle')).toBeVisible();
    await expect(page.locator('form#loginForm input[name="login_id"]')).toBeVisible();
    await expect(page.locator('form#loginForm input[name="password"]')).toBeVisible();
    await expect(page.locator('form#loginForm button[type="submit"]')).toContainText('로그인');

    // 디버그 패널 hidden (runtime-config false)
    await expect(page.locator('#debugPanel')).toBeHidden();
  });

  test('선생님 로그인 폼이 정상 렌더된다', async ({ page }) => {
    await page.goto('/teacher-login.html');
    await expect(page.locator('h2#roleTitle')).toBeVisible();
    await expect(page.locator('form#loginForm')).toBeVisible();
    await expect(page.locator('.auth-shell__brand-headline')).toContainText('레슨 예약');
  });

  test('로그인/회원가입 탭 전환', async ({ page }) => {
    await page.goto('/student-login.html');
    const loginPane = page.locator('article[data-auth-view="login"]');
    const registerPane = page.locator('article[data-auth-view="register"]');

    await expect(loginPane).toBeVisible();

    // 회원가입 탭 클릭
    await page.locator('button[data-auth-view-tab="register"]').click();
    await expect(registerPane).toBeVisible();
    await expect(page.locator('h3#registerTitle')).toContainText('회원가입');
  });
});

test.describe('공개 프로필 (404 fallback)', () => {
  test('존재하지 않는 slug 로 접속 시 에러 메시지 표시', async ({ page }) => {
    await page.goto('/p.html?t=nonexistent-teacher-xyz-999');
    // API 응답 기다림 (백엔드 연결 안 됐을 수 있어 timeout 짧게)
    await page.waitForTimeout(2000);
    const body = page.locator('#profile-body');
    const text = await body.textContent();
    expect(text || '').toMatch(/(찾을 수 없|문제|오류|불러오는)/);
  });
});

test.describe('보안 / 404', () => {
  test('존재하지 않는 페이지는 커스텀 404 로', async ({ page }) => {
    const resp = await page.goto('/no-such-page-9999.html');
    // Vercel 이 404.html 을 200 으로 서빙하거나 404 status. 둘 다 허용.
    expect([200, 404]).toContain(resp.status());
    await expect(page.locator('body')).toContainText(/(404|찾을 수 없)/);
  });
});
