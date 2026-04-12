(function () {
  const URL_PARAMS = new URLSearchParams(window.location.search || '');
  const allowedSections = new Set(['overview', 'users', 'links', 'activity', 'notes', 'policy']);
  const sectionFromUrl = String(URL_PARAMS.get('section') || 'overview').toLowerCase();

  const state = {
    token: localStorage.getItem('lb_token') || '',
    user: null,
    section: allowedSections.has(sectionFromUrl) ? sectionFromUrl : 'overview',
    users: [],
    students: [],
    teachers: [],
    activityItems: [],
    patchNotes: [],
    policy: null,
    nonAdminNoticeShown: false,
  };

  const authStatus = document.getElementById('adminAuthStatus');
  const loginPanel = document.getElementById('adminLoginPanel');
  const loginForm = document.getElementById('adminLoginForm');
  const quickFillBtn = document.getElementById('adminQuickFillBtn');
  const quickLoginBtn = document.getElementById('adminQuickLoginBtn');
  const logoutBtn = document.getElementById('adminLogoutBtn');
  const consolePanel = document.getElementById('adminConsolePanel');
  const toastRegion = document.getElementById('adminToastRegion');
  const sectionLinks = Array.from(document.querySelectorAll('[data-admin-section-link]'));
  const overviewSection = document.getElementById('adminOverviewSection');
  const usersSection = document.getElementById('adminUsersSection');
  const linksSection = document.getElementById('adminLinksSection');
  const activitySection = document.getElementById('adminActivitySection');
  const notesSection = document.getElementById('adminNotesSection');
  const policySection = document.getElementById('adminPolicySection');

  const summaryTotalUsers = document.getElementById('summaryTotalUsers');
  const summaryTeacherUsers = document.getElementById('summaryTeacherUsers');
  const summaryStudentUsers = document.getElementById('summaryStudentUsers');
  const summaryPowerAdmins = document.getElementById('summaryPowerAdmins');
  const summaryDeactivatedHint = document.getElementById('summaryDeactivatedHint');
  const summaryPendingBookings = document.getElementById('summaryPendingBookings');
  const summaryBookedBookings = document.getElementById('summaryBookedBookings');
  const summaryCompletedBookings = document.getElementById('summaryCompletedBookings');
  const summaryCanceledBookings = document.getElementById('summaryCanceledBookings');

  const usersRoleFilter = document.getElementById('adminUsersRoleFilter');
  const usersQueryInput = document.getElementById('adminUsersQuery');
  const usersIncludeInactive = document.getElementById('adminUsersIncludeInactive');
  const usersBody = document.getElementById('adminUsersBody');
  const usersRefreshBtn = document.getElementById('adminUsersRefreshBtn');
  const usersSearchBtn = document.getElementById('adminUsersSearchBtn');
  const usersResetBtn = document.getElementById('adminUsersResetBtn');
  const createUserForm = document.getElementById('adminCreateUserForm');

  const assignTeacherForm = document.getElementById('adminAssignTeacherForm');
  const clearTeacherBtn = document.getElementById('adminClearTeacherBtn');
  const studentsBody = document.getElementById('adminStudentsBody');
  const teachersBody = document.getElementById('adminTeachersBody');
  const studentsRefreshBtn = document.getElementById('adminStudentsRefreshBtn');
  const teachersRefreshBtn = document.getElementById('adminTeachersRefreshBtn');
  const summaryRefreshBtn = document.getElementById('adminSummaryRefreshBtn');
  const activityRefreshBtn = document.getElementById('adminActivityRefreshBtn');
  const notesRefreshBtn = document.getElementById('adminNotesRefreshBtn');
  const policyRefreshBtn = document.getElementById('adminPolicyRefreshBtn');
  const activityBody = document.getElementById('adminActivityBody');
  const patchNoteForm = document.getElementById('adminPatchNoteForm');
  const patchNotesList = document.getElementById('adminPatchNotesList');
  const policyCards = document.getElementById('adminPolicyCards');
  const policyTimezoneHint = document.getElementById('adminPolicyTimezoneHint');

  function applyDefaultAdminCredentials(force = false) {
    if (!loginForm?.elements) return;
    const loginInput = loginForm.elements.login_id;
    const passwordInput = loginForm.elements.password;
    if (!loginInput || !passwordInput) return;
    if (force) {
      loginInput.value = '';
      passwordInput.value = '';
    }
  }

  function showToast(message, tone = 'info', durationMs = 2600) {
    if (!toastRegion) return;
    const text = String(message || '').trim();
    if (!text) return;
    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.textContent = text;
    toastRegion.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add('leave');
      window.setTimeout(() => {
        toast.remove();
      }, 260);
    }, durationMs);
  }

  function normalizePhoneInput(value) {
    return String(value || '')
      .replace(/\D/g, '')
      .trim();
  }

  function parseOptionalId(value) {
    const parsed = Number.parseInt(String(value || '').trim(), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  }

  function formatDateTime(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('ko-KR', { hour12: false });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function formObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function setSection(nextSection) {
    const section = allowedSections.has(nextSection) ? nextSection : 'overview';
    state.section = section;
    const next = new URL(window.location.href);
    next.searchParams.set('section', section);
    window.history.replaceState({}, '', `${next.pathname}${next.search}${next.hash}`);

    if (overviewSection) overviewSection.classList.toggle('hidden', section !== 'overview');
    if (usersSection) usersSection.classList.toggle('hidden', section !== 'users');
    if (linksSection) linksSection.classList.toggle('hidden', section !== 'links');
    if (activitySection) activitySection.classList.toggle('hidden', section !== 'activity');
    if (notesSection) notesSection.classList.toggle('hidden', section !== 'notes');
    if (policySection) policySection.classList.toggle('hidden', section !== 'policy');

    sectionLinks.forEach((link) => {
      const linkSection = String(link.dataset.adminSectionLink || '').toLowerCase();
      const isActive = linkSection === section;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function setAuth(token, user) {
    state.token = token || '';
    state.user = user || null;
    if (state.token) {
      localStorage.setItem('lb_token', state.token);
    } else {
      localStorage.removeItem('lb_token');
    }
    renderAuthState();
  }

  function translateErrorCode(code) {
    const text = String(code || '').trim();
    if (!text) return '';
    const map = {
      unauthorized: '로그인이 필요합니다.',
      forbidden: '권한이 없습니다.',
      invalid_credentials: '아이디 또는 비밀번호가 올바르지 않습니다.',
      account_deactivated: '비활성화된 계정입니다.',
      internal_server_error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      'login_id, role, password, name are required': '아이디, 역할, 비밀번호, 이름을 모두 입력해 주세요.',
      'password must be at least 8 characters': '비밀번호는 8자 이상이어야 합니다.',
      'new_password must be at least 8 characters': '새 비밀번호는 8자 이상이어야 합니다.',
      'login_id already exists': '이미 사용 중인 아이디입니다.',
      'phone already exists': '이미 사용 중인 휴대폰번호입니다.',
      'phone is invalid': '휴대폰번호 형식이 올바르지 않습니다.',
      invalid_user_id: '사용자 ID가 올바르지 않습니다.',
      invalid_student_user_id: '학생 ID가 올바르지 않습니다.',
      user_not_found: '사용자를 찾을 수 없습니다.',
      student_not_found: '학생을 찾을 수 없습니다.',
      teacher_not_found: '선생님을 찾을 수 없습니다.',
      user_already_deactivated: '이미 비활성화된 계정입니다.',
      cannot_delete_self: '현재 로그인한 계정은 삭제할 수 없습니다.',
      cannot_delete_last_power_admin: '마지막 파워관리자 계정은 삭제할 수 없습니다.',
    };
    return map[text] || '';
  }

  function errorMessage(err) {
    if (err?.payload?.error) {
      const localized = translateErrorCode(err.payload.error);
      if (localized) return localized;
      return String(err.payload.error);
    }
    if (err?.payload?.message) return String(err.payload.message);
    return String(err?.message || '요청 처리 중 오류가 발생했습니다.');
  }

  async function api(path, { method = 'GET', body, auth = false } = {}) {
    const headers = {};
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (auth) {
      if (!state.token) {
        throw new Error('로그인이 필요합니다.');
      }
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
    state.user = result.user || null;
    renderAuthState();
  }

  function renderAuthState() {
    const sessionReady = Boolean(state.token && state.user);
    document.body.classList.toggle('session-ready', sessionReady);

    if (!state.token) {
      authStatus.textContent = '로그인되지 않았습니다.';
      loginPanel.classList.remove('hidden');
      consolePanel.classList.add('hidden');
      document.body.classList.remove('session-ready');
      return;
    }

    if (!state.user) {
      authStatus.textContent = '세션 확인 중...';
      loginPanel.classList.add('hidden');
      consolePanel.classList.add('hidden');
      return;
    }

    const loginId = state.user.login_id || state.user.email || '-';
    authStatus.textContent = `로그인: ${loginId} (${state.user.role})`;

    if (state.user.role !== 'POWER_ADMIN') {
      authStatus.textContent = `현재 계정(${loginId}, ${state.user.role})은 파워관리자 권한이 없습니다. POWER_ADMIN 계정으로 다시 로그인해 주세요.`;
      loginPanel.classList.remove('hidden');
      consolePanel.classList.add('hidden');
      document.body.classList.add('session-ready');
      if (!state.nonAdminNoticeShown) {
        showToast('POWER_ADMIN 계정으로 로그인해 주세요.', 'error');
        state.nonAdminNoticeShown = true;
      }
      return;
    }

    state.nonAdminNoticeShown = false;
    loginPanel.classList.add('hidden');
    consolePanel.classList.remove('hidden');
  }

  function renderSummary(summary) {
    const users = summary?.users || {};
    const bookings = summary?.bookings || {};
    summaryTotalUsers.textContent = String(users.total_users || 0);
    summaryTeacherUsers.textContent = String(users.teacher_count || 0);
    summaryStudentUsers.textContent = String(users.student_count || 0);
    summaryPowerAdmins.textContent = String(users.power_admin_count || 0);
    if (summaryDeactivatedHint) {
      summaryDeactivatedHint.textContent = `비활성 계정: ${String(users.deactivated_count || 0)}`;
    }
    summaryPendingBookings.textContent = String(bookings.pending_count || 0);
    summaryBookedBookings.textContent = String(bookings.booked_count || 0);
    summaryCompletedBookings.textContent = String(bookings.completed_count || 0);
    summaryCanceledBookings.textContent = String(bookings.canceled_count || 0);
  }

  async function loadSummary() {
    const result = await api('/api/v1/admin/summary', { auth: true });
    renderSummary(result || {});
  }

  function bookingStatusText(status) {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'PENDING') return '예약요청';
    if (normalized === 'BOOKED') return '예약확정';
    if (normalized === 'COMPLETED') return '수업완료';
    if (normalized === 'CANCELED_BY_STUDENT') return '학생취소';
    if (normalized === 'CANCELED_BY_TEACHER') return '선생님취소';
    return normalized || '-';
  }

  function renderActivity(items) {
    if (!activityBody) return;
    const list = Array.isArray(items) ? items : [];
    activityBody.innerHTML = '';
    if (!list.length) {
      activityBody.innerHTML = '<tr><td colspan="4">데이터 없음</td></tr>';
      return;
    }
    for (const item of list) {
      const type = String(item.type || '');
      let typeText = type || '-';
      let targetText = '-';
      let summaryText = '-';

      if (type === 'USER_CREATED') {
        typeText = '계정생성';
        targetText = `USER #${item.user_id || '-'}`;
        summaryText = `${item.role || '-'} / ${item.login_id || '-'}`;
      } else if (type === 'BOOKING_UPDATED') {
        typeText = '예약변경';
        targetText = `BOOKING #${item.booking_id || '-'}`;
        summaryText = `${bookingStatusText(item.status)} / 학생 ${item.student_login_id || '-'} / 선생님 ${item.teacher_login_id || '-'}`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="mono">${escapeHtml(formatDateTime(item.occurred_at || item.created_at || item.updated_at || null))}</td>
        <td>${escapeHtml(typeText)}</td>
        <td>${escapeHtml(targetText)}</td>
        <td>${escapeHtml(summaryText)}</td>
      `;
      activityBody.appendChild(tr);
    }
  }

  async function loadActivity() {
    const result = await api('/api/v1/admin/activity?limit=80', { auth: true });
    state.activityItems = result.items || [];
    renderActivity(state.activityItems);
  }

  function renderPatchNotes(items) {
    if (!patchNotesList) return;
    const list = Array.isArray(items) ? items : [];
    patchNotesList.innerHTML = '';
    if (!list.length) {
      patchNotesList.innerHTML = '<div class="hint">등록된 패치노트가 없습니다.</div>';
      return;
    }
    for (const item of list) {
      const card = document.createElement('article');
      card.className = 'history-card';
      const createdBy = item.created_by_login_id || item.created_by_name || '-';
      card.innerHTML = `
        <div class="history-card-head">
          <div class="history-title">#${item.id} · ${escapeHtml(item.title || '-') }</div>
          <div class="hint mono">${escapeHtml(formatDateTime(item.created_at))}</div>
        </div>
        <div class="history-meta" style="grid-template-columns: 1fr">
          <div><strong>작성자</strong><br />${escapeHtml(String(createdBy))}</div>
          <div><strong>내용</strong><br />${escapeHtml(String(item.body || '')).replace(/\n/g, '<br />')}</div>
        </div>
      `;
      patchNotesList.appendChild(card);
    }
  }

  async function loadPatchNotes() {
    const result = await api('/api/v1/admin/patch-notes?limit=80', { auth: true });
    state.patchNotes = result.items || [];
    renderPatchNotes(state.patchNotes);
  }

  async function createPatchNote() {
    const form = formObject(patchNoteForm);
    const title = String(form.title || '').trim();
    const body = String(form.body || '').trim();
    if (!title || !body) {
      throw new Error('제목과 내용을 입력해 주세요.');
    }
    await api('/api/v1/admin/patch-notes', {
      method: 'POST',
      auth: true,
      body: { title, body },
    });
    patchNoteForm.reset();
    showToast('패치노트가 등록되었습니다.', 'success');
    await loadPatchNotes();
  }

  function renderPolicy(policy) {
    if (!policyCards || !policyTimezoneHint) return;
    const roles = policy?.roles || {};
    policyTimezoneHint.textContent = `서비스 기준 시간대: ${String(policy?.service_timezone || 'Asia/Seoul')} (고정)`;
    policyCards.innerHTML = '';

    const orderedRoles = ['POWER_ADMIN', 'TEACHER', 'STUDENT'];
    for (const roleName of orderedRoles) {
      const abilities = Array.isArray(roles?.[roleName]?.abilities) ? roles[roleName].abilities : [];
      const card = document.createElement('article');
      card.className = 'subpanel';
      const abilitiesHtml = abilities.length
        ? `<ul>${abilities.map((ability) => `<li>${escapeHtml(String(ability))}</li>`).join('')}</ul>`
        : '<div class="hint">권한 정의 없음</div>';
      card.innerHTML = `
        <h4>${escapeHtml(roleName)}</h4>
        ${abilitiesHtml}
      `;
      policyCards.appendChild(card);
    }
  }

  async function loadPolicy() {
    const result = await api('/api/v1/admin/policy', { auth: true });
    state.policy = result || null;
    renderPolicy(state.policy);
  }

  function userRoleBadge(role) {
    const safe = String(role || '').replace(/[^A-Z_]/g, '');
    return `<span class="status-badge status-${safe}">${escapeHtml(String(role || '-'))}</span>`;
  }

  function userActiveBadge(isActive) {
    return isActive
      ? '<span class="status-badge status-TRUE">활성</span>'
      : '<span class="status-badge status-FALSE">비활성</span>';
  }

  function renderUsers(items) {
    usersBody.innerHTML = '';
    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
      usersBody.innerHTML = '<tr><td colspan="10">데이터 없음</td></tr>';
      return;
    }
    for (const row of list) {
      const assignedText =
        row.assigned_teacher_user_id && row.assigned_teacher_login_id
          ? `#${row.assigned_teacher_user_id} (${row.assigned_teacher_login_id})`
          : row.assigned_teacher_user_id
            ? `#${row.assigned_teacher_user_id}`
            : '-';
      const isActive = row.is_active !== false;
      const actionButtons = [];
      if (isActive) {
        actionButtons.push(`<button type="button" data-admin-reset-user="${row.id}">비밀번호 재설정</button>`);
        actionButtons.push(`<button type="button" data-admin-delete-user="${row.id}" class="danger">삭제</button>`);
      } else {
        actionButtons.push('<span class="hint">비활성 계정</span>');
      }
      if (isActive && row.role === 'STUDENT') {
        actionButtons.push(`<button type="button" data-admin-pick-student="${row.id}">학생선택</button>`);
      } else if (isActive && row.role === 'TEACHER') {
        actionButtons.push(`<button type="button" data-admin-pick-teacher="${row.id}">선생님선택</button>`);
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.id}</td>
        <td>${userRoleBadge(row.role)}</td>
        <td>${userActiveBadge(isActive)}</td>
        <td>${escapeHtml(row.login_id || '-')}</td>
        <td>${escapeHtml(row.name || '-')}</td>
        <td>${escapeHtml(row.phone || '-')}</td>
        <td>${escapeHtml(assignedText)}</td>
        <td class="mono">${formatDateTime(row.created_at)}</td>
        <td class="mono">${formatDateTime(row.deactivated_at)}</td>
        <td>${actionButtons.join(' ')}</td>
      `;
      usersBody.appendChild(tr);
    }
  }

  async function loadUsers() {
    const role = String(usersRoleFilter?.value || '').trim();
    const q = String(usersQueryInput?.value || '').trim();
    const includeInactive = Boolean(usersIncludeInactive?.checked);
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (q) params.set('q', q);
    if (includeInactive) params.set('include_inactive', 'true');
    params.set('limit', '120');
    const result = await api(`/api/v1/admin/users?${params.toString()}`, { auth: true });
    state.users = result.items || [];
    renderUsers(state.users);
  }

  async function createUserByAdmin() {
    const form = formObject(createUserForm);
    const loginId = String(form.login_id || '').trim().toLowerCase();
    const role = String(form.role || '').trim().toUpperCase();
    const password = String(form.password || '');
    const name = String(form.name || '').trim();
    const phone = normalizePhoneInput(form.phone);
    await api('/api/v1/admin/users', {
      method: 'POST',
      auth: true,
      body: {
        login_id: loginId,
        role,
        password,
        name,
        phone: phone || undefined,
      },
    });
    createUserForm.reset();
    showToast('계정이 생성되었습니다.', 'success');
    await loadSummary();
    await loadUsers();
    await loadStudents();
    await loadTeachers();
  }

  async function resetUserPassword(userId) {
    const nextPassword = window.prompt('새 비밀번호를 입력하세요. (8자 이상)', '');
    if (nextPassword === null) return;
    const trimmed = String(nextPassword || '').trim();
    if (trimmed.length < 8) {
      showToast('비밀번호는 8자 이상이어야 합니다.', 'error');
      return;
    }
    await api(`/api/v1/admin/users/${userId}/password`, {
      method: 'PATCH',
      auth: true,
      body: {
        new_password: trimmed,
      },
    });
    showToast('비밀번호가 재설정되었습니다.', 'success');
  }

  async function deleteUser(userId) {
    const ok = window.confirm(`사용자 #${userId}를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`);
    if (!ok) return;
    await api(`/api/v1/admin/users/${userId}`, {
      method: 'DELETE',
      auth: true,
    });
    showToast('계정이 삭제되었습니다.', 'success');
    await loadSummary();
    await loadUsers();
    await loadStudents();
    await loadTeachers();
  }

  function setAssignFormStudent(studentId) {
    if (!assignTeacherForm) return;
    assignTeacherForm.elements.student_user_id.value = String(studentId || '');
  }

  function setAssignFormTeacher(teacherId) {
    if (!assignTeacherForm) return;
    assignTeacherForm.elements.teacher_user_id.value = String(teacherId || '');
    assignTeacherForm.elements.teacher_login_id.value = '';
  }

  async function assignTeacherToStudent({ clear = false } = {}) {
    const form = formObject(assignTeacherForm);
    const studentUserId = parseOptionalId(form.student_user_id);
    if (!studentUserId) {
      throw new Error('학생 ID를 입력해 주세요.');
    }
    const teacherUserId = parseOptionalId(form.teacher_user_id);
    const teacherLoginId = String(form.teacher_login_id || '').trim().toLowerCase();
    const body = clear
      ? { teacher_user_id: null }
      : teacherUserId
        ? { teacher_user_id: teacherUserId }
        : teacherLoginId
          ? { teacher_login_id: teacherLoginId }
          : { teacher_user_id: null };

    await api(`/api/v1/admin/students/${studentUserId}/teacher`, {
      method: 'PATCH',
      auth: true,
      body,
    });
    showToast(clear ? '학생-선생 연결이 해제되었습니다.' : '학생-선생 연결이 저장되었습니다.', 'success');
    await loadUsers();
    await loadStudents();
  }

  function renderStudents(items) {
    studentsBody.innerHTML = '';
    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
      studentsBody.innerHTML = '<tr><td colspan="5">데이터 없음</td></tr>';
      return;
    }
    for (const row of list) {
      const assignedText = row.assigned_teacher_user_id
        ? `#${row.assigned_teacher_user_id}${row.assigned_teacher_login_id ? ` (${row.assigned_teacher_login_id})` : ''}`
        : '-';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.id}</td>
        <td>${escapeHtml(row.login_id || '-')}</td>
        <td>${escapeHtml(row.name || '-')}</td>
        <td>${escapeHtml(assignedText)}</td>
        <td><button type="button" data-admin-pick-student="${row.id}">학생 선택</button></td>
      `;
      studentsBody.appendChild(tr);
    }
  }

  function renderTeachers(items) {
    teachersBody.innerHTML = '';
    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
      teachersBody.innerHTML = '<tr><td colspan="4">데이터 없음</td></tr>';
      return;
    }
    for (const row of list) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.id}</td>
        <td>${escapeHtml(row.login_id || '-')}</td>
        <td>${escapeHtml(row.name || '-')}</td>
        <td><button type="button" data-admin-pick-teacher="${row.id}">선생님 선택</button></td>
      `;
      teachersBody.appendChild(tr);
    }
  }

  async function loadStudents() {
    const result = await api('/api/v1/admin/users?role=STUDENT&limit=120', { auth: true });
    state.students = result.items || [];
    renderStudents(state.students);
  }

  async function loadTeachers() {
    const result = await api('/api/v1/admin/users?role=TEACHER&limit=120', { auth: true });
    state.teachers = result.items || [];
    renderTeachers(state.teachers);
  }

  async function logout() {
    try {
      if (state.token) {
        await api('/api/v1/auth/logout', { method: 'POST', auth: true });
      }
    } catch (_) {
      // ignore logout API failure and clear local session anyway
    }
    setAuth('', null);
    showToast('로그아웃되었습니다.', 'success');
  }

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const form = formObject(loginForm);
      const loginId = String(form.login_id || '').trim().toLowerCase();
      const password = String(form.password || '');
      const result = await api('/api/v1/auth/login', {
        method: 'POST',
        body: {
          login_id: loginId,
          password,
        },
      });
      setAuth(result.token, result.user);
      if (result.user?.role !== 'POWER_ADMIN') {
        showToast('POWER_ADMIN 계정으로 로그인해 주세요.', 'error');
        return;
      }
      await loadSummary();
      await loadUsers();
      await loadStudents();
      await loadTeachers();
      await loadActivity();
      await loadPatchNotes();
      await loadPolicy();
      showToast('파워관리자 로그인 성공', 'success');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  quickFillBtn?.addEventListener('click', () => {
    applyDefaultAdminCredentials(true);
    showToast('기본 관리자 계정을 입력했습니다.', 'success');
  });

  quickLoginBtn?.addEventListener('click', () => {
    applyDefaultAdminCredentials(true);
    loginForm?.requestSubmit();
  });

  logoutBtn?.addEventListener('click', async () => {
    await logout();
  });

  usersSearchBtn?.addEventListener('click', async () => {
    try {
      await loadUsers();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  usersResetBtn?.addEventListener('click', async () => {
    if (usersRoleFilter) usersRoleFilter.value = '';
    if (usersQueryInput) usersQueryInput.value = '';
    if (usersIncludeInactive) usersIncludeInactive.checked = false;
    try {
      await loadUsers();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  usersIncludeInactive?.addEventListener('change', async () => {
    try {
      await loadUsers();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  usersRefreshBtn?.addEventListener('click', async () => {
    try {
      await loadUsers();
      showToast('계정 목록을 갱신했습니다.', 'success');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  usersBody?.addEventListener('click', async (event) => {
    try {
      const resetId = parseOptionalId(event.target?.dataset?.adminResetUser);
      if (resetId) {
        await resetUserPassword(resetId);
        return;
      }
      const deleteId = parseOptionalId(event.target?.dataset?.adminDeleteUser);
      if (deleteId) {
        await deleteUser(deleteId);
        return;
      }
      const pickStudentId = parseOptionalId(event.target?.dataset?.adminPickStudent);
      if (pickStudentId) {
        setAssignFormStudent(pickStudentId);
        setSection('links');
        showToast(`학생 #${pickStudentId} 선택됨`, 'success');
        return;
      }
      const pickTeacherId = parseOptionalId(event.target?.dataset?.adminPickTeacher);
      if (pickTeacherId) {
        setAssignFormTeacher(pickTeacherId);
        setSection('links');
        showToast(`선생님 #${pickTeacherId} 선택됨`, 'success');
      }
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  createUserForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await createUserByAdmin();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  assignTeacherForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await assignTeacherToStudent({ clear: false });
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  clearTeacherBtn?.addEventListener('click', async () => {
    try {
      await assignTeacherToStudent({ clear: true });
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  studentsRefreshBtn?.addEventListener('click', async () => {
    try {
      await loadStudents();
      showToast('학생 목록을 갱신했습니다.', 'success');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  teachersRefreshBtn?.addEventListener('click', async () => {
    try {
      await loadTeachers();
      showToast('선생님 목록을 갱신했습니다.', 'success');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  summaryRefreshBtn?.addEventListener('click', async () => {
    try {
      await loadSummary();
      showToast('요약 정보를 갱신했습니다.', 'success');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  activityRefreshBtn?.addEventListener('click', async () => {
    try {
      await loadActivity();
      showToast('운영 로그를 갱신했습니다.', 'success');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  notesRefreshBtn?.addEventListener('click', async () => {
    try {
      await loadPatchNotes();
      showToast('패치노트를 갱신했습니다.', 'success');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  patchNoteForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await createPatchNote();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  policyRefreshBtn?.addEventListener('click', async () => {
    try {
      await loadPolicy();
      showToast('권한 정책을 갱신했습니다.', 'success');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  });

  studentsBody?.addEventListener('click', (event) => {
    const studentId = parseOptionalId(event.target?.dataset?.adminPickStudent);
    if (!studentId) return;
    setAssignFormStudent(studentId);
    showToast(`학생 #${studentId} 선택됨`, 'success');
  });

  teachersBody?.addEventListener('click', (event) => {
    const teacherId = parseOptionalId(event.target?.dataset?.adminPickTeacher);
    if (!teacherId) return;
    setAssignFormTeacher(teacherId);
    showToast(`선생님 #${teacherId} 선택됨`, 'success');
  });

  async function bootstrap() {
    applyDefaultAdminCredentials(false);
    setSection(state.section);
    renderAuthState();
    if (!state.token) return;
    try {
      await syncMe();
      if (state.user?.role !== 'POWER_ADMIN') return;
      await loadSummary();
      await loadUsers();
      await loadStudents();
      await loadTeachers();
      await loadActivity();
      await loadPatchNotes();
      await loadPolicy();
    } catch (err) {
      showToast(errorMessage(err), 'error');
      setAuth('', null);
    }
  }

  bootstrap();
})();
