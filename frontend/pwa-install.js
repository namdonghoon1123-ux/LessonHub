/* LessonHub PWA 설치 도우미
 * - 서비스워커(/sw.js) 등록
 * - 아이폰(iOS Safari): "홈 화면에 추가" 방법 안내 배너 (브라우저가 설치 버튼을 제공하지 않으므로 직접 안내)
 * - 안드로이드/데스크톱 Chrome: beforeinstallprompt 를 잡아 "앱 설치" 버튼 제공
 * 이미 설치(standalone)된 경우, 또는 사용자가 닫은 경우에는 다시 띄우지 않는다.
 */
(function () {
  'use strict';

  var DISMISS_KEY = 'lh_pwa_install_dismissed_v1';

  // 1) 서비스워커 등록 (설치 가능성 + 오프라인 내성)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function (err) {
        console.warn('SW 등록 실패:', err && err.message ? err.message : err);
      });
    });
  }

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function isiOS() {
    var ua = window.navigator.userAgent || '';
    var iOSDevice = /iPad|iPhone|iPod/.test(ua);
    // iPadOS 13+ 는 데스크톱 UA 로 위장 → 터치 가능한 Mac 으로 감지
    var iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return iOSDevice || iPadOS;
  }

  function isSafari() {
    var ua = window.navigator.userAgent || '';
    // iOS 에서 크롬/파이어폭스(CriOS/FxiOS)는 홈화면 추가가 제한적 → Safari 만 대상으로
    return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  }

  function alreadyDismissed() {
    try {
      return window.localStorage.getItem(DISMISS_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function rememberDismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch (e) {
      /* ignore */
    }
  }

  function buildBanner(innerHTML) {
    var bar = document.createElement('div');
    bar.id = 'lhPwaInstallBanner';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', '앱 설치 안내');
    bar.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:16px',
      'transform:translateX(-50%)',
      'z-index:9999',
      'width:calc(100% - 24px)',
      'max-width:440px',
      'background:#fff',
      'border:1px solid #F2C9BD',
      'border-radius:16px',
      'box-shadow:0 10px 30px rgba(236,106,76,0.18)',
      'padding:14px 16px',
      'font-family:Pretendard,-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
      'color:#3A2A24',
      'animation:lhPwaSlideUp .28s ease both',
    ].join(';');
    bar.innerHTML = innerHTML;

    var style = document.createElement('style');
    style.textContent =
      '@keyframes lhPwaSlideUp{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}}' +
      '#lhPwaInstallBanner button{font-family:inherit;cursor:pointer;border-radius:10px;font-size:13px;font-weight:600;padding:8px 14px;border:0}' +
      '#lhPwaInstallBanner .lh-pwa-primary{background:#EC6A4C;color:#fff}' +
      '#lhPwaInstallBanner .lh-pwa-ghost{background:transparent;color:#8A6F66}';
    bar.appendChild(style);
    return bar;
  }

  function showBanner(bar) {
    function mount() {
      document.body.appendChild(bar);
    }
    if (document.body) {
      mount();
    } else {
      window.addEventListener('DOMContentLoaded', mount);
    }
  }

  function wireDismiss(bar) {
    var closeBtn = bar.querySelector('[data-lh-pwa-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        rememberDismiss();
        bar.remove();
      });
    }
  }

  // 2) iOS Safari 안내 배너
  function showIosGuide() {
    var bar = buildBanner(
      '<div style="display:flex;gap:12px;align-items:flex-start">' +
        '<img src="/apple-touch-icon.png" alt="" width="40" height="40" style="border-radius:9px;flex:0 0 auto" />' +
        '<div style="flex:1;min-width:0">' +
        '<strong style="display:block;font-size:14px;margin-bottom:2px">홈 화면에 추가하면 앱처럼 써요</strong>' +
        '<p style="margin:0;font-size:12.5px;line-height:1.5;color:#6E574E">' +
        '아래 <span aria-hidden="true">⬆️</span> <b>공유</b> 버튼을 누른 뒤 <b>“홈 화면에 추가”</b>를 선택하세요.' +
        '</p>' +
        '<div style="margin-top:10px;text-align:right">' +
        '<button type="button" class="lh-pwa-ghost" data-lh-pwa-close>알겠어요</button>' +
        '</div>' +
        '</div>' +
        '</div>'
    );
    showBanner(bar);
    wireDismiss(bar);
  }

  // 3) 안드로이드/데스크톱 설치 버튼
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (isStandalone() || alreadyDismissed()) return;
    var bar = buildBanner(
      '<div style="display:flex;gap:12px;align-items:center">' +
        '<img src="/icon-192.png" alt="" width="40" height="40" style="border-radius:9px;flex:0 0 auto" />' +
        '<div style="flex:1;min-width:0">' +
        '<strong style="display:block;font-size:14px">LessonHub 앱으로 설치</strong>' +
        '<p style="margin:2px 0 0;font-size:12.5px;color:#6E574E">홈 화면에서 한 번에 열 수 있어요.</p>' +
        '</div>' +
        '<button type="button" class="lh-pwa-ghost" data-lh-pwa-close>나중에</button>' +
        '<button type="button" class="lh-pwa-primary" data-lh-pwa-install>설치</button>' +
        '</div>'
    );
    showBanner(bar);
    wireDismiss(bar);
    var installBtn = bar.querySelector('[data-lh-pwa-install]');
    if (installBtn) {
      installBtn.addEventListener('click', function () {
        bar.remove();
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.finally(function () {
          deferredPrompt = null;
        });
      });
    }
  });

  // 진입 시점 판단: 이미 설치/닫음 이면 종료. iOS 면 잠깐 뒤 안내.
  if (isStandalone() || alreadyDismissed()) return;
  if (isiOS() && isSafari()) {
    // 페이지 전환(리다이렉트 셸)에서 깜빡임 방지를 위해 약간 지연
    setTimeout(function () {
      if (!isStandalone() && !alreadyDismissed() && !document.getElementById('lhPwaInstallBanner')) {
        showIosGuide();
      }
    }, 1200);
  }
})();
