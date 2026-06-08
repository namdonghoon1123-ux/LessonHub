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
  const findLoginIdForm = document.getElementById('findLoginIdForm');
  const resetPasswordForm = document.getElementById('resetPasswordForm');
  const findLoginIdResult = document.getElementById('findLoginIdResult');
  const resetPasswordResult = document.getElementById('resetPasswordResult');
  const authLayout = document.getElementById('authLayout');
  const authViewTabs = Array.from(document.querySelectorAll('[data-auth-view-tab]'));
  const authViewPanels = Array.from(document.querySelectorAll('[data-auth-view]'));
  const authViewSwitchButtons = Array.from(document.querySelectorAll('[data-switch-auth-view]'));
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
  const AUTH_TAB_RAW = String(URL_PARAMS.get('tab') || '').trim().toLowerCase();
  let activeAuthView = AUTH_TAB_RAW === 'register' ? 'register' : 'login';

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

  function updateAuthViewUrl(view) {
    const next = new URL(window.location.href);
    if (view === 'register') {
      next.searchParams.set('tab', 'register');
    } else {
      next.searchParams.delete('tab');
    }
    window.history.replaceState({}, '', `${next.pathname}${next.search}${next.hash}`);
  }

  function applyAuthView(view, { syncUrl = true } = {}) {
    const nextView = view === 'register' ? 'register' : 'login';
    activeAuthView = nextView;
    authViewPanels.forEach((panel) => {
      const panelView = String(panel.dataset.authView || '').toLowerCase();
      panel.hidden = panelView !== nextView;
    });
    authViewTabs.forEach((tab) => {
      const tabView = String(tab.dataset.authViewTab || '').toLowerCase();
      const active = tabView === nextView;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (authLayout) {
      authLayout.classList.add('single-pane');
    }
    if (syncUrl) {
      updateAuthViewUrl(nextView);
    }
  }

  function attachAuthViewSwitches() {
    authViewTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        applyAuthView(tab.dataset.authViewTab || 'login');
      });
    });
    authViewSwitchButtons.forEach((button) => {
      button.addEventListener('click', () => {
        applyAuthView(button.dataset.switchAuthView || 'login');
      });
    });
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

  function translateApiError(errorCode) {
    const code = String(errorCode || '').trim();
    if (!code) return '';
    if (code.endsWith(' is required') || code.endsWith(' are required')) {
      const fieldsText = code.replace(/ (is required|are required)$/u, '').trim();
      const labels = fieldsText
        .split(',')
        .map((token) => String(token || '').trim())
        .filter(Boolean)
        .map((field) => {
          const labelMap = {
            login_id: '아이디',
            phone: '휴대폰번호',
            password: '비밀번호',
            name: '이름',
            role: '역할',
          };
          return labelMap[field] || field;
        });
      if (labels.length > 0) {
        return `${labels.join(', ')} 항목을 입력해 주세요.`;
      }
    }
    const map = {
      unauthorized: '로그인이 필요합니다.',
      forbidden: '권한이 없습니다.',
      internal_server_error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      invalid_credentials: '아이디 또는 비밀번호가 올바르지 않습니다.',
      account_deactivated: '비활성화된 계정입니다. 관리자에게 문의해 주세요.',
      provider_not_found: '지원하지 않는 간편로그인 공급자입니다.',
      social_login_not_configured: '간편로그인이 아직 설정되지 않았습니다.',
      social_login_not_implemented: '간편로그인은 준비 중입니다. 일반 로그인/회원가입을 이용해 주세요.',
      'login_id and password are required': '아이디와 비밀번호를 입력해 주세요.',
      'login_id, phone, password, name, role are required': '아이디/휴대폰/비밀번호/이름을 모두 입력해 주세요.',
      'login_id already exists': '이미 사용 중인 아이디입니다.',
      'phone already exists': '이미 사용 중인 휴대폰번호입니다.',
      'phone is invalid': '휴대폰번호 형식이 올바르지 않습니다.',
      'login_id must be 3~60 characters': '아이디는 3~60자여야 합니다.',
      'password must be at least 8 characters': '비밀번호는 8자 이상이어야 합니다.',
      'name must be 80 characters or fewer': '이름은 80자 이하여야 합니다.',
      'role must be TEACHER or STUDENT': '회원가입 역할 정보가 올바르지 않습니다.',
      'name, phone are required': '이름과 휴대폰번호를 입력해 주세요.',
      'login_id, name, phone, new_password are required': '아이디/이름/휴대폰번호/새 비밀번호를 입력해 주세요.',
      'new_password must be at least 8 characters': '새 비밀번호는 8자 이상이어야 합니다.',
      recovery_user_not_found: '입력한 정보와 일치하는 계정을 찾을 수 없습니다.',
    };
    return map[code] || '';
  }

  function getErrorMessage(err) {
    if (err?.payload?.error) {
      const localized = translateApiError(err.payload.error);
      if (localized) return localized;
      return String(err.payload.error);
    }
    if (err?.message) return String(err.message);
    return String(err);
  }

  function isSilentSessionRestoreError(err) {
    const code = String(err?.payload?.error || '').trim();
    return code === 'unauthorized' || code === 'account_deactivated';
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

  function normalizePhoneInput(raw) {
    return String(raw || '').replace(/\D/g, '');
  }

  function setHintText(element, text, tone = '') {
    if (!element) return;
    element.textContent = String(text || '');
    if (tone) {
      element.dataset.tone = tone;
    } else {
      delete element.dataset.tone;
    }
  }

  async function loadSocialProviders() {
    if (!socialButtons.length) return;
    const result = await api('/api/v1/auth/social/providers');
    const items = Array.isArray(result?.items) ? result.items : [];
    const byProvider = new Map(items.map((item) => [String(item.provider || '').toUpperCase(), item]));

    let availableCount = 0;
    let configuredCount = 0;
    socialButtons.forEach((button) => {
      const provider = String(button.dataset.socialProvider || '').toUpperCase();
      const providerInfo = byProvider.get(provider);
      const isConfigured = Boolean(providerInfo?.enabled);
      const isImplemented = Boolean(providerInfo?.implemented);
      const isAvailable = isConfigured && isImplemented;
      if (isConfigured) configuredCount += 1;
      if (isAvailable) availableCount += 1;
      setButtonEnabled(button, isAvailable);
      if (isAvailable) {
        button.title = `${provider} 로그인 사용 가능`;
      } else if (isConfigured) {
        button.title = `${provider} 로그인 준비중`;
      } else {
        button.title = `${provider} 로그인 연동 미설정`;
      }
    });

    if (availableCount > 0) {
      setSocialStatusText(`간편로그인 사용 가능: ${availableCount}개 공급자`);
      return;
    }
    if (configuredCount > 0) {
      setSocialStatusText('간편로그인은 연동 설정은 되어 있으나 아직 준비중입니다. 일반 로그인/회원가입을 이용해 주세요.');
      return;
    }
    setSocialStatusText('카카오 간편로그인은 아직 설정되지 않았습니다. 준비 중입니다.');
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
      if (auth && (res.status === 401 || res.status === 403)) {
        setAuth('', null);
      }
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
    if (userRole === 'POWER_ADMIN') return '/power-admin.html';
    return '/index.html';
  }

  function roleLoginPath(userRole) {
    if (userRole === 'TEACHER') return '/teacher-login.html';
    if (userRole === 'STUDENT') return '/student-login.html';
    if (userRole === 'POWER_ADMIN') return '/power-admin.html';
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
      const loginId = String(form.login_id || '').trim().toLowerCase();
      const password = String(form.password || '');
      if (!loginId || !password) {
        throw new Error('아이디와 비밀번호를 입력해 주세요.');
      }
      const result = await api('/api/v1/auth/login', {
        method: 'POST',
        body: { login_id: loginId, password },
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
      const loginId = String(form.login_id || '').trim().toLowerCase();
      const phone = normalizePhoneInput(form.phone);
      const password = String(form.password || '');
      const passwordConfirm = String(form.password_confirm || '');
      const name = String(form.name || '').trim();
      if (!loginId || !phone || !password || !name || !role) {
        throw new Error('아이디, 휴대폰번호, 이름, 비밀번호를 모두 입력해 주세요.');
      }
      if (password !== passwordConfirm) {
        throw new Error('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      }
      const body = {
        login_id: loginId,
        phone,
        password,
        name,
        role,
      };

      if (role === 'TEACHER') {
        const lessonDurationMin = String(form.lesson_duration_min || '').trim();
        const cancelCutoffHours = String(form.cancel_cutoff_hours || '').trim();
        const bookingWindowDays = String(form.booking_window_days || '').trim();
        const studentCancelDayBeforeHour = String(form.student_cancel_day_before_hour || '').trim();
        const studentNotice = String(form.student_notice || '').trim();
        const displayName = String(form.display_name || '').trim();
        const bio = String(form.bio || '').trim();

        if (lessonDurationMin) body.lesson_duration_min = lessonDurationMin;
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

  findLoginIdForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    runAction('아이디 찾기', async () => {
      const form = formObject(findLoginIdForm);
      const name = String(form.name || '').trim();
      const phone = normalizePhoneInput(form.phone);
      if (!name || !phone) {
        throw new Error('이름과 휴대폰번호를 입력해 주세요.');
      }
      const result = await api('/api/v1/auth/recover/login-id', {
        method: 'POST',
        body: {
          name,
          phone,
          role,
        },
      });
      const loginId = String(result?.login_id || '').trim();
      if (!loginId) {
        throw new Error('아이디를 찾을 수 없습니다.');
      }
      setHintText(findLoginIdResult, `가입 아이디: ${loginId}`, 'success');
      if (loginForm?.elements?.login_id) {
        loginForm.elements.login_id.value = loginId;
      }
      applyAuthView('login');
    });
  });

  resetPasswordForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    runAction('비밀번호 재설정', async () => {
      const form = formObject(resetPasswordForm);
      const loginId = String(form.login_id || '').trim().toLowerCase();
      const name = String(form.name || '').trim();
      const phone = normalizePhoneInput(form.phone);
      const newPassword = String(form.new_password || '');
      const newPasswordConfirm = String(form.new_password_confirm || '');
      if (!loginId || !name || !phone || !newPassword) {
        throw new Error('아이디, 이름, 휴대폰번호, 새 비밀번호를 입력해 주세요.');
      }
      if (newPassword !== newPasswordConfirm) {
        throw new Error('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      }
      await api('/api/v1/auth/recover/password', {
        method: 'POST',
        body: {
          login_id: loginId,
          name,
          phone,
          new_password: newPassword,
          role,
        },
      });
      setHintText(resetPasswordResult, '비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해 주세요.', 'success');
      if (loginForm?.elements?.login_id) {
        loginForm.elements.login_id.value = loginId;
      }
      if (loginForm?.elements?.password) {
        loginForm.elements.password.value = '';
      }
      resetPasswordForm.reset();
      applyAuthView('login');
    });
  });

  function bootstrap() {
    attachAuthViewSwitches();
    applyAuthView(activeAuthView, { syncUrl: false });
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
    (async () => {
      try {
        await syncMe();
        if (!state.user?.role) return;
        if (!guardRoleOrRedirect(state.user.role)) return;
        redirectByRole(state.user.role);
      } catch (err) {
        const message = getErrorMessage(err);
        pushLog('세션 복원 FAILED', { message, payload: err?.payload });
        setAuth('', null);
        if (!isSilentSessionRestoreError(err)) {
          window.alert(`세션 복원 실패: ${message}`);
        }
      }
    })();
  }

  bootstrap();
})();
