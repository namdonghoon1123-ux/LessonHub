(() => {
  const role = String(document.body.dataset.loginRole || '').toUpperCase();
  const ROLE_INFO = {
    TEACHER: {
      label: '선생님',
      homePath: '/teacher.html',
      loginPath: '/teacher-login.html',
      defaultLoginId: 'teacher@example.com',
      registerButtonLabel: '선생님 회원가입',
    },
    STUDENT: {
      label: '학생',
      homePath: '/student.html',
      loginPath: '/student-login.html',
      defaultLoginId: 'student@example.com',
      registerButtonLabel: '학생 회원가입',
    },
  };

  const info = ROLE_INFO[role];
  if (!info) return;

  const runtimeConfig =
    window.LH_RUNTIME_CONFIG && typeof window.LH_RUNTIME_CONFIG === 'object' ? window.LH_RUNTIME_CONFIG : {};

  function readFlag(name, fallback = true) {
    const value = runtimeConfig[name];
    return typeof value === 'boolean' ? value : fallback;
  }

  const DEBUG_TOOLS_ENABLED = readFlag('debugToolsEnabled', true);
  const SHOW_QUICK_PRESET = DEBUG_TOOLS_ENABLED && readFlag('showQuickPresetButton', true);
  const SHOW_HEALTH_CHECK = DEBUG_TOOLS_ENABLED && readFlag('showHealthCheckButton', true);
  const SHOW_TOKEN_BOX = DEBUG_TOOLS_ENABLED && readFlag('showTokenBox', true);
  const SHOW_REQUEST_LOG = DEBUG_TOOLS_ENABLED && readFlag('showRequestLog', true);
  const SHOW_TEST_ACCOUNT_HINTS = readFlag('showTestAccountHints', true);

  const state = {
    token: localStorage.getItem('lb_token') || '',
    user: null,
  };

  const authStatus = document.getElementById('authStatus');
  const debugPanel = document.getElementById('debugPanel');
  const tokenBox = document.getElementById('tokenBox');
  const tokenBoxRow = document.getElementById('tokenBoxRow');
  const logEl = document.getElementById('log');
  const presetBtn = document.getElementById('presetBtn');
  const healthBtn = document.getElementById('healthBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginRouteHint = document.getElementById('loginRouteHint');
  const roleTitle = document.getElementById('roleTitle');
  const registerTitle = document.getElementById('registerTitle');
  const registerRoleBadge = document.getElementById('registerRoleBadge');
  const registerBtn = document.getElementById('registerBtn');
  const socialStatus = document.getElementById('socialStatus');
  const socialButtons = Array.from(document.querySelectorAll('[data-social-provider]'));
  const testAccountHints = Array.from(document.querySelectorAll('[data-test-account-hint]'));

  const URL_PARAMS = new URLSearchParams(window.location.search || '');
  const RETURN_TO_RAW = String(URL_PARAMS.get('return_to') || '').trim();

  function resolveReturnToPath(raw) {
    if (!raw) return '';
    try {
      const parsed = new URL(raw, window.location.origin);
      if (parsed.origin !== window.location.origin) return '';
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch (_) {
      return '';
    }
  }

  const RETURN_TO_PATH = resolveReturnToPath(RETURN_TO_RAW);

  function setElementVisible(element, visible) {
    if (!element) return;
    element.hidden = !visible;
  }

  function applyDebugUiVisibility() {
    setElementVisible(presetBtn, SHOW_QUICK_PRESET);
    setElementVisible(healthBtn, SHOW_HEALTH_CHECK);
    setElementVisible(tokenBoxRow, SHOW_TOKEN_BOX);
    setElementVisible(logEl, SHOW_REQUEST_LOG);
    testAccountHints.forEach((hint) => setElementVisible(hint, SHOW_TEST_ACCOUNT_HINTS));
    const hasDebugPanelContent = SHOW_TOKEN_BOX || SHOW_REQUEST_LOG || SHOW_TEST_ACCOUNT_HINTS;
    setElementVisible(debugPanel, hasDebugPanelContent);
  }

  function pushLog(title, payload) {
    if (!SHOW_REQUEST_LOG || !logEl) return;
    const line = `[${new Date().toLocaleTimeString('ko-KR', { hour12: false })}] ${title}\n${JSON.stringify(payload, null, 2)}\n\n`;
    logEl.textContent = line + logEl.textContent;
  }

  function getErrorMessage(err) {
    if (err?.payload?.error) return String(err.payload.error);
    if (err?.message) return String(err.message);
    return String(err);
  }

  async function runAction(label, fn) {
    try {
      await fn();
    } catch (err) {
      const message = getErrorMessage(err);
      pushLog(`${label} FAILED`, { message, payload: err?.payload });
      window.alert(`${label} 실패: ${message}`);
    }
  }

  function formObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function setButtonEnabled(button, enabled) {
    if (!button) return;
    button.disabled = !enabled;
    button.style.opacity = enabled ? '1' : '0.58';
    button.style.cursor = enabled ? 'pointer' : 'not-allowed';
  }

  function setSocialStatusText(text) {
    if (!socialStatus) return;
    socialStatus.textContent = String(text || '');
  }

  async function loadSocialProviders() {
    if (!socialButtons.length) return;
    const result = await api('/api/v1/auth/social/providers');
    const items = Array.isArray(result?.items) ? result.items : [];
    const byProvider = new Map(items.map((item) => [String(item.provider || '').toUpperCase(), item]));

    let enabledCount = 0;
    socialButtons.forEach((button) => {
      const provider = String(button.dataset.socialProvider || '').toUpperCase();
      const providerInfo = byProvider.get(provider);
      const enabled = Boolean(providerInfo?.enabled);
      if (enabled) enabledCount += 1;
      setButtonEnabled(button, enabled);
      button.title = enabled ? `${provider} 로그인 연동 사용 가능` : `${provider} 로그인 연동 미설정`;
    });

    if (enabledCount > 0) {
      setSocialStatusText(`간편로그인 사용 가능: ${enabledCount}개 공급자`);
      return;
    }
    setSocialStatusText('간편로그인은 아직 설정되지 않았습니다. (Google/Naver 준비중)');
  }

  function attachSocialButtons() {
    if (!socialButtons.length) return;
    socialButtons.forEach((button) => {
      const provider = String(button.dataset.socialProvider || '').toLowerCase();
      button.addEventListener('click', () => {
        if (!provider) return;
        runAction(`${provider.toUpperCase()} 간편로그인`, async () => {
          const result = await api(`/api/v1/auth/social/${provider}/start`, { method: 'POST' });
          if (result?.start_url) {
            window.location.href = String(result.start_url);
            return;
          }
          throw new Error('social_login_not_implemented');
        });
      });
    });
  }

  function renderAuth() {
    if (tokenBox) tokenBox.value = SHOW_TOKEN_BOX ? state.token || '' : '';
    if (state.user) {
      authStatus.textContent = `로그인: ${state.user.email || state.user.login_id} (${state.user.role})`;
    } else if (state.token) {
      authStatus.textContent = '토큰은 있으나 사용자 정보는 미확인 상태입니다.';
    } else {
      authStatus.textContent = '로그인되지 않았습니다.';
    }
  }

  function setAuth(token, user) {
    state.token = token || '';
    state.user = user || null;
    if (state.token) {
      localStorage.setItem('lb_token', state.token);
    } else {
      localStorage.removeItem('lb_token');
    }
    renderAuth();
  }

  async function api(path, options = {}) {
    const { method = 'GET', body, auth = false } = options;
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      if (!state.token) throw new Error('로그인 토큰이 없습니다.');
      headers.Authorization = `Bearer ${state.token}`;
    }

    const res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const raw = await res.text();
    let payload = { raw };
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch (_) {
        payload = { raw };
      }
    }

    pushLog(`${method} ${path} -> ${res.status}`, payload);
    if (!res.ok) {
      const err = new Error(`${method} ${path} failed (${res.status})`);
      err.payload = payload;
      throw err;
    }
    return payload;
  }

  async function syncMe() {
    if (!state.token) {
      setAuth('', null);
      return;
    }
    const result = await api('/api/v1/auth/me', { auth: true });
    state.user = result.user;
    renderAuth();
  }

  function roleHomePath(userRole) {
    if (userRole === 'TEACHER') return '/teacher.html';
    if (userRole === 'STUDENT') return '/student.html';
    return '/index.html';
  }

  function roleLoginPath(userRole) {
    if (userRole === 'TEACHER') return '/teacher-login.html';
    if (userRole === 'STUDENT') return '/student-login.html';
    return '/index.html';
  }

  function redirectByRole(userRole) {
    if (RETURN_TO_PATH) {
      window.location.href = RETURN_TO_PATH;
      return;
    }
    window.location.href = roleHomePath(userRole);
  }

  function guardRoleOrRedirect(userRole) {
    if (!userRole || userRole === role) return true;
    const actualLabel = ROLE_INFO[userRole]?.label || userRole;
    window.alert(`${info.label} 로그인 페이지입니다. ${actualLabel} 로그인 페이지로 이동합니다.`);
    window.location.href = roleLoginPath(userRole);
    return false;
  }

  if (presetBtn) {
    presetBtn.addEventListener('click', () => {
      if (!SHOW_QUICK_PRESET) return;
      loginForm.elements.login_id.value = info.defaultLoginId;
      loginForm.elements.password.value = '';
    });
  }

  if (healthBtn) {
    healthBtn.addEventListener('click', () => {
      if (!SHOW_HEALTH_CHECK) return;
      runAction('헬스체크', async () => {
        await api('/api/health');
      });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      runAction('로그아웃', async () => {
        if (state.token) {
          await api('/api/v1/auth/logout', { method: 'POST', auth: true });
        }
        setAuth('', null);
      });
    });
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    runAction('로그인', async () => {
      const form = formObject(loginForm);
      const result = await api('/api/v1/auth/login', {
        method: 'POST',
        body: { login_id: form.login_id, password: form.password },
      });
      setAuth(result.token, result.user);
      if (!guardRoleOrRedirect(result.user?.role)) return;
      redirectByRole(result.user?.role);
    });
  });

  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    runAction('회원가입', async () => {
      const form = formObject(registerForm);
      const body = {
        login_id: form.login_id,
        phone: form.phone,
        password: form.password,
        name: form.name,
        role,
      };

      if (role === 'TEACHER') {
        const lessonDurationMin = String(form.lesson_duration_min || '').trim();
        const timezone = String(form.timezone || '').trim();
        const cancelCutoffHours = String(form.cancel_cutoff_hours || '').trim();
        const bookingWindowDays = String(form.booking_window_days || '').trim();
        const studentCancelDayBeforeHour = String(form.student_cancel_day_before_hour || '').trim();
        const studentNotice = String(form.student_notice || '').trim();
        const displayName = String(form.display_name || '').trim();
        const bio = String(form.bio || '').trim();

        if (lessonDurationMin) body.lesson_duration_min = lessonDurationMin;
        if (timezone) body.timezone = timezone;
        if (cancelCutoffHours) body.cancel_cutoff_hours = cancelCutoffHours;
        if (bookingWindowDays) body.booking_window_days = bookingWindowDays;
        if (studentCancelDayBeforeHour) body.student_cancel_day_before_hour = studentCancelDayBeforeHour;
        if (studentNotice) body.student_notice = studentNotice;
        if (displayName) body.display_name = displayName;
        if (bio) body.bio = bio;
      }

      const result = await api('/api/v1/auth/register', {
        method: 'POST',
        body,
      });
      setAuth(result.token, result.user);
      if (!guardRoleOrRedirect(result.user?.role)) return;
      redirectByRole(result.user?.role);
    });
  });

  function bootstrap() {
    applyDebugUiVisibility();
    if (roleTitle) roleTitle.textContent = `${info.label} 로그인`;
    if (registerTitle) registerTitle.textContent = `${info.label} 회원가입`;
    if (registerRoleBadge) registerRoleBadge.textContent = `역할 고정: ${role}`;
    if (registerBtn) registerBtn.textContent = info.registerButtonLabel;
    if (loginRouteHint && RETURN_TO_PATH) {
      loginRouteHint.textContent = '로그인 후 원래 요청한 화면으로 이동합니다.';
    }
    loginForm.elements.login_id.value = SHOW_QUICK_PRESET ? info.defaultLoginId : '';
    loginForm.elements.password.value = '';
    attachSocialButtons();
    renderAuth();

    runAction('간편로그인 상태 확인', async () => {
      await loadSocialProviders();
    });

    if (!state.token) return;
    runAction('세션 복원', async () => {
      await syncMe();
      if (!state.user?.role) return;
      if (!guardRoleOrRedirect(state.user.role)) return;
      redirectByRole(state.user.role);
    });
  }

  bootstrap();
})();
