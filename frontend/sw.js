/* LessonHub Service Worker
 * 목적: 아이폰/안드로이드 "홈 화면에 추가"(PWA 설치) 지원 + 가벼운 오프라인 내성.
 * 안전 원칙:
 *  - /api/ 요청과 비-GET 요청은 절대 캐시/가로채지 않는다 (항상 네트워크).
 *  - 페이지 이동(navigate)은 network-first (최신 우선, 실패 시 캐시/오프라인 폴백).
 *  - 정적 자원(css/js/img/font)은 stale-while-revalidate.
 *  - 캐시 이름에 버전을 박아, 배포 시 activate 단계에서 옛 캐시를 정리한다.
 */
const CACHE_VERSION = 'lh-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// 설치 직후 활성화되도록 (사용자가 다음 방문에서 바로 새 SW 사용)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache
        .addAll(['/index.html', '/lessonhub-brand.css', '/manifest.json', '/lessonhub-logo.png'])
        .catch(() => undefined)
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

function isStaticAsset(url) {
  return /\.(?:css|js|png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|otf)$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // GET 외에는 손대지 않는다 (POST/PATCH/DELETE 등은 항상 네트워크)
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 동일 출처가 아니거나 API 호출이면 가로채지 않는다
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // 페이지 이동: network-first → 실패 시 캐시 → 최후엔 오프라인 index
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          return fresh;
        } catch (err) {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          return (
            fallback ||
            new Response('<h1>오프라인</h1><p>네트워크 연결을 확인해 주세요.</p>', {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
              status: 503,
            })
          );
        }
      })()
    );
    return;
  }

  // 정적 자원: stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((resp) => {
            if (resp && resp.ok) cache.put(request, resp.clone());
            return resp;
          })
          .catch(() => undefined);
        return cached || (await network) || new Response('', { status: 504 });
      })()
    );
  }
});
