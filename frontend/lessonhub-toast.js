// LessonHub Toast — alert() 대체용 단일 글로벌 함수.
// 모든 페이지에 <script src="/lessonhub-toast.js"></script> 로딩하면
// window.lhToast(msg, tone) 와 window.alert 오버라이드가 자동 활성화됩니다.
(() => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  function ensureStack() {
    let stack = document.querySelector('.lh-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'lh-toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    return stack;
  }

  function dismiss(el) {
    if (!el || el.classList.contains('lh-toast--leaving')) return;
    el.classList.add('lh-toast--leaving');
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 200);
  }

  function showToast(message, tone) {
    const safeMessage = String(message == null ? '' : message);
    if (!safeMessage) return;
    const t = ['info', 'success', 'warn', 'error'].includes(tone) ? tone : 'info';
    const stack = ensureStack();

    const card = document.createElement('div');
    card.className = `lh-toast lh-toast--${t}`;

    const body = document.createElement('div');
    body.className = 'lh-toast__body';
    body.textContent = safeMessage;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lh-toast__close';
    closeBtn.setAttribute('aria-label', '알림 닫기');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => dismiss(card));

    card.appendChild(body);
    card.appendChild(closeBtn);
    stack.appendChild(card);

    // 자동 사라짐 — error 는 더 오래 유지
    const ttl = t === 'error' ? 6500 : 3500;
    setTimeout(() => dismiss(card), ttl);

    return card;
  }

  window.lhToast = showToast;

  // alert 오버라이드 — 톤 자동 추론 (메시지에 '실패' / '에러' 가 있으면 error)
  const origAlert = window.alert;
  window.alert = function (msg) {
    const text = String(msg == null ? '' : msg);
    let tone = 'info';
    if (/(실패|error|에러|invalid|오류)/i.test(text)) tone = 'error';
    else if (/(성공|완료|적용|saved|success)/i.test(text)) tone = 'success';
    else if (/(주의|경고|warning|cutoff|마감)/i.test(text)) tone = 'warn';
    return showToast(text, tone);
  };

  // 콘솔에서 원래 alert 필요 시
  window.__nativeAlert = origAlert;
})();
