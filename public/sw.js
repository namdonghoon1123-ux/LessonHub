// LessonHub 서비스워커 — 설치형 PWA 요건 충족용(네트워크 우선, HTML 캐싱 안 함).
// 인증·실시간 데이터 앱이라 페이지를 캐시하면 오래된 화면이 보일 수 있어 pass-through만 한다.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // 기본 네트워크 동작에 맡김 (respondWith 호출 안 함 = 브라우저 기본)
});
