// Playwright config — frontend E2E
// 기본은 BASE_URL 환경변수 (예: http://localhost:18080 또는 Vercel preview URL).
// 없으면 http://localhost:18080.
const baseURL = process.env.BASE_URL || 'http://localhost:18080';

module.exports = {
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        browserName: 'chromium',
      },
    },
  ],
};
