(() => {
  // 프로덕션 기본값: 개발자 도구/테스트 계정 힌트는 모두 숨김.
  // 로컬 개발 중 다시 켜고 싶으면 아래 플래그를 true 로 바꾸세요.
  window.LH_RUNTIME_CONFIG = Object.freeze({
    debugToolsEnabled: false,
    showQuickPresetButton: false,
    showHealthCheckButton: false,
    showTokenBox: false,
    showRequestLog: false,
    showTestAccountHints: false,
  });
})();
