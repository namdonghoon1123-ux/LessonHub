      const URL_PARAMS = new URLSearchParams(window.location.search);
      const invitedStartAtRaw = String(URL_PARAMS.get('start_at') || '').trim();
      const invitedStartAtDate = invitedStartAtRaw ? new Date(invitedStartAtRaw) : null;
      const forcedManagePanelRaw = String(URL_PARAMS.get('manage_panel') || '').toLowerCase();
      const forcedSettingsPanelRaw = String(URL_PARAMS.get('settings_panel') || '').toLowerCase();
      const forcedTeacherCalendarViewRaw = String(URL_PARAMS.get('teacher_calendar') || '').toLowerCase();
      const forcedOperationsPanelRaw = String(
        URL_PARAMS.get('operations_panel') || (String(URL_PARAMS.get('section') || '').toLowerCase() === 'completed' ? 'completed' : '')
      ).toLowerCase();
      const state = {
        token: localStorage.getItem('lb_token') || '',
        user: null,
        teachers: [],
        selectedTeacherId: '',
        monthCursor: (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        teacherWeekCursor: (() => {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
        selectedDateKey: '',
        slotsByDate: {},
        availableOnly: false,
        studentGridStepMin: 60,
        teacherGridStepMin: 60,
        studentCalendarView: 'week',
        teacherCalendarView: forcedTeacherCalendarViewRaw === 'month' ? 'month' : 'week',
        teacherProfile: null,
        teacherDrag: null,
        teacherDragEndedAt: 0,
        invitedTeacherId: parseOptionalId(URL_PARAMS.get('teacher')) || null,
        invitedStartAtIso:
          invitedStartAtDate && !Number.isNaN(invitedStartAtDate.getTime())
            ? invitedStartAtDate.toISOString()
            : '',
        holidaysByDate: {},
        loadedHolidayYears: {},
        studentTeacherSearchResults: [],
        studentBookings: [],
        teacherAvailability: [],
        teacherOneTimeAvailability: [],
        teacherExceptions: [],
        teacherBookings: [],
        teacherActiveBookings: [],
        teacherCompletedBookings: [],
        teacherStudents: [],
        teacherCreateDraft: null,
        teacherExceptionDraft: null,
        teacherCreateType: 'availability',
        modalReopenGuardUntil: 0,
        teacherCreateSubmitting: false,
        teacherExceptionSubmitting: false,
        teacherManagePanel: ['availability', 'exception'].includes(forcedManagePanelRaw)
          ? forcedManagePanelRaw
          : 'availability',
        teacherSettingsPanel: ['profile', 'account', 'students'].includes(forcedSettingsPanelRaw)
          ? forcedSettingsPanelRaw
          : 'profile',
        teacherOperationsPanel: forcedOperationsPanelRaw === 'completed' ? 'completed' : 'bookings',
        teacherBookingsFilter: {
          keyword: '',
          status: 'all',
          fromDate: '',
          toDate: '',
          pageSize: 20,
          page: 1,
        },
        teacherCompletedFilter: {
          keyword: '',
          fromDate: '',
          toDate: '',
          pageSize: 20,
          page: 1,
        },
        teacherTouch: {
          timerId: null,
          started: false,
          startMeta: null,
          startTarget: null,
          startX: 0,
          startY: 0,
          moved: false,
          lastOpenAt: 0,
          rangeAnchor: null,
        },
      };
      const PAGE_PATH = String(window.location.pathname || '/').toLowerCase();
      const forcedModeRaw = String(URL_PARAMS.get('mode') || '').toUpperCase();
      const forcedSectionRaw = String(URL_PARAMS.get('section') || '').toLowerCase();
      const PAGE_MODE =
        forcedModeRaw === 'STUDENT' || forcedModeRaw === 'TEACHER'
          ? forcedModeRaw
          : PAGE_PATH.includes('/student')
            ? 'STUDENT'
            : 'TEACHER';
      function resolvePageSection(mode, requestedSection, pagePath) {
        if (mode === 'TEACHER') {
          const normalized = requestedSection === 'bookings' || requestedSection === 'completed' ? 'operations' : requestedSection;
          if (
            normalized === 'calendar' ||
            normalized === 'manage' ||
            normalized === 'operations' ||
            normalized === 'settings' ||
            normalized === 'all'
          ) {
            return normalized;
          }
          if (pagePath.includes('-calendar')) return 'calendar';
          if (pagePath.includes('-bookings') || pagePath.includes('-completed')) return 'operations';
          if (pagePath.includes('-manage')) return 'manage';
          if (pagePath.includes('-settings')) return 'settings';
          return 'all';
        }

        const normalized = requestedSection === 'operations' || requestedSection === 'completed' ? 'bookings' : requestedSection;
        if (normalized === 'calendar' || normalized === 'bookings' || normalized === 'settings' || normalized === 'all') {
          return normalized;
        }
        if (pagePath.includes('-calendar')) return 'calendar';
        if (pagePath.includes('-bookings')) return 'bookings';
        if (pagePath.includes('-settings')) return 'settings';
        return 'all';
      }

      const PAGE_SECTION = resolvePageSection(PAGE_MODE, forcedSectionRaw, PAGE_PATH);
      document.body.classList.toggle('mode-teacher', PAGE_MODE === 'TEACHER');
      document.body.classList.toggle('mode-student', PAGE_MODE === 'STUDENT');

      const authStatus = document.getElementById('authStatus');
      const rolePill = document.getElementById('rolePill');
      const toastRegion = document.getElementById('toastRegion');
      const teacherView = document.getElementById('teacherView');
      const studentView = document.getElementById('studentView');
      const teacherSelect = document.getElementById('teacherSelect');
      const monthLabel = document.getElementById('monthLabel');
      const prevMonthBtn = document.getElementById('prevMonthBtn');
      const nextMonthBtn = document.getElementById('nextMonthBtn');
      const studentWeekViewBtn = document.getElementById('studentWeekViewBtn');
      const studentMonthViewBtn = document.getElementById('studentMonthViewBtn');
      const studentGridStep = document.getElementById('studentGridStep');
      const calendarGrid = document.getElementById('calendarGrid');
      const selectedDateLabel = document.getElementById('selectedDateLabel');
      const daySlotSummary = document.getElementById('daySlotSummary');
      const daySlotsList = document.getElementById('daySlotsList');
      const myBookingsBody = document.getElementById('myBookingsBody');
      const availabilityBody = document.getElementById('availabilityBody');
      const exceptionBody = document.getElementById('exceptionBody');
      const teacherBookingsList = document.getElementById('teacherBookingsList');
      const teacherCompletedList = document.getElementById('teacherCompletedList');
      const teacherCompletedLessonFilter = document.getElementById('teacherCompletedLessonFilter');
      const teacherManagePanelSelect = document.getElementById('teacherManagePanelSelect');
      const teacherSettingsPanelSelect = document.getElementById('teacherSettingsPanelSelect');
      const teacherOperationsBookingsTab = document.getElementById('teacherOperationsBookingsTab');
      const teacherOperationsCompletedTab = document.getElementById('teacherOperationsCompletedTab');
      const teacherBookingsKeywordFilter = document.getElementById('teacherBookingsKeywordFilter');
      const teacherBookingsStatusFilter = document.getElementById('teacherBookingsStatusFilter');
      const teacherBookingsFromDate = document.getElementById('teacherBookingsFromDate');
      const teacherBookingsToDate = document.getElementById('teacherBookingsToDate');
      const teacherBookingsPageSize = document.getElementById('teacherBookingsPageSize');
      const teacherBookingsFilterBtn = document.getElementById('teacherBookingsFilterBtn');
      const teacherBookingsResetBtn = document.getElementById('teacherBookingsResetBtn');
      const teacherBookingsPrevBtn = document.getElementById('teacherBookingsPrevBtn');
      const teacherBookingsNextBtn = document.getElementById('teacherBookingsNextBtn');
      const teacherBookingsPageInfo = document.getElementById('teacherBookingsPageInfo');
      const teacherCompletedKeywordFilter = document.getElementById('teacherCompletedKeywordFilter');
      const teacherCompletedFromDate = document.getElementById('teacherCompletedFromDate');
      const teacherCompletedToDate = document.getElementById('teacherCompletedToDate');
      const teacherCompletedPageSize = document.getElementById('teacherCompletedPageSize');
      const teacherCompletedFilterBtn = document.getElementById('teacherCompletedFilterBtn');
      const teacherCompletedResetBtn = document.getElementById('teacherCompletedResetBtn');
      const teacherCompletedPrevBtn = document.getElementById('teacherCompletedPrevBtn');
      const teacherCompletedNextBtn = document.getElementById('teacherCompletedNextBtn');
      const teacherCompletedPageInfo = document.getElementById('teacherCompletedPageInfo');

      const studentTotalSlots = document.getElementById('studentTotalSlots');
      const studentOpenSlots = document.getElementById('studentOpenSlots');
      const studentActiveBookings = document.getElementById('studentActiveBookings');
      const studentTeacherMeta = document.getElementById('studentTeacherMeta');
      const studentPolicyWindow = document.getElementById('studentPolicyWindow');
      const studentPolicyCutoff = document.getElementById('studentPolicyCutoff');
      const studentTeacherNotice = document.getElementById('studentTeacherNotice');
      const studentTeacherAssignHint = document.getElementById('studentTeacherAssignHint');
      const studentTeacherLookupInput = document.getElementById('studentTeacherLookupInput');
      const studentTeacherAssignBtn = document.getElementById('studentTeacherAssignBtn');
      const studentTeacherSearchBtn = document.getElementById('studentTeacherSearchBtn');
      const studentTeacherAssignSelectedBtn = document.getElementById('studentTeacherAssignSelectedBtn');
      const studentTeacherInviteAssignBtn = document.getElementById('studentTeacherInviteAssignBtn');
      const studentTeacherClearBtn = document.getElementById('studentTeacherClearBtn');
      const studentTeacherSearchSelect = document.getElementById('studentTeacherSearchSelect');
      const studentNeedsTeacherNotice = document.getElementById('studentNeedsTeacherNotice');
      const studentLoginStatus = document.getElementById('studentLoginStatus');
      const studentAccountTierBadge = document.getElementById('studentAccountTierBadge');
      const studentUpgradeForm = document.getElementById('studentUpgradeForm');
      const studentUpgradeHint = document.getElementById('studentUpgradeHint');

      const teacherAvailCount = document.getElementById('teacherAvailCount');
      const teacherExceptionCount = document.getElementById('teacherExceptionCount');
      const teacherActiveBookingCount = document.getElementById('teacherActiveBookingCount');
      const teacherLoginStatus = document.getElementById('teacherLoginStatus');
      const teacherWeekLabel = document.getElementById('teacherWeekLabel');
      const teacherWeekViewBtn = document.getElementById('teacherWeekViewBtn');
      const teacherMonthViewBtn = document.getElementById('teacherMonthViewBtn');
      const teacherCalendarGrid = document.getElementById('teacherCalendarGrid');
      const teacherCellDetailCard = document.getElementById('teacherCellDetailCard');
      const teacherCellDetailTitle = document.getElementById('teacherCellDetailTitle');
      const teacherCellDetailBody = document.getElementById('teacherCellDetailBody');
      const teacherCellDetailActions = document.getElementById('teacherCellDetailActions');
      const teacherCellDetailClearBtn = document.getElementById('teacherCellDetailClearBtn');
      const teacherOpenSlotList = document.getElementById('teacherOpenSlotList');
      const teacherOpenSlotTitle = document.getElementById('teacherOpenSlotTitle');
      const teacherOpenSlotHint = document.getElementById('teacherOpenSlotHint');
      const lessonCatalogList = document.getElementById('lessonCatalogList');
      const teacherGridStep = document.getElementById('teacherGridStep');
      const teacherInviteBtn = document.getElementById('teacherInviteBtn');
      const teacherCreateType = document.getElementById('teacherCreateType');
      const teacherDragHint = document.getElementById('teacherDragHint');
      const teacherTouchGuide = document.getElementById('teacherTouchGuide');
      const teacherClearTouchSelectionBtn = document.getElementById('teacherClearTouchSelectionBtn');
      const teacherJumpMorningBtn = document.getElementById('teacherJumpMorningBtn');
      const teacherJumpAfternoonBtn = document.getElementById('teacherJumpAfternoonBtn');
      const teacherJumpEveningBtn = document.getElementById('teacherJumpEveningBtn');
      const teacherCreateModal = document.getElementById('teacherCreateModal');
      const teacherCreateForm = document.getElementById('teacherCreateForm');
      const teacherCreateSaveBtn = document.getElementById('teacherCreateSaveBtn');
      const teacherExceptionModal = document.getElementById('teacherExceptionModal');
      const teacherExceptionQuickForm = document.getElementById('teacherExceptionQuickForm');
      const teacherExceptionSaveBtn = document.getElementById('teacherExceptionSaveBtn');
      const teacherTempStudentForm = document.getElementById('teacherTempStudentForm');
      const teacherAssignStudentForm = document.getElementById('teacherAssignStudentForm');
      const teacherTempStudentCreds = document.getElementById('teacherTempStudentCreds');
      const teacherStudentsBody = document.getElementById('teacherStudentsBody');

      const loginForm = document.getElementById('loginForm');
      const registerForm = document.getElementById('registerForm');
      const studentProfileForm = document.getElementById('studentProfileForm');
      const studentPasswordForm = document.getElementById('studentPasswordForm');
      const teacherAccountForm = document.getElementById('teacherAccountForm');
      const teacherPasswordForm = document.getElementById('teacherPasswordForm');
      const availabilityForm = document.getElementById('availabilityForm');
      const exceptionForm = document.getElementById('exceptionForm');
      const teacherProfileForm = document.getElementById('teacherProfileForm');
      const availableOnlyToggle = document.getElementById('availableOnlyToggle');
      const sectionLinks = Array.from(document.querySelectorAll('[data-nav-section]'));
      const TIME_ALIGNMENT_MIN = 30;

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

      function pushLog(title, payload) {
        void title;
        void payload;
      }

      function translateApiError(errorCode, payload = {}) {
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
          too_many_requests: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
          invalid_request: '요청값이 올바르지 않습니다.',
          invalid_id: 'ID 형식이 올바르지 않습니다.',
          not_found: '요청한 데이터를 찾을 수 없습니다.',
          invalid_datetime: '날짜/시간 형식이 올바르지 않습니다.',
          invalid_teacher_id: '선생님 ID 형식이 올바르지 않습니다.',
          invalid_booking_id: '예약 ID 형식이 올바르지 않습니다.',
          teacher_not_found: '선생님 정보를 찾을 수 없습니다.',
          student_not_found: '학생 정보를 찾을 수 없습니다.',
          user_not_found: '사용자 정보를 찾을 수 없습니다.',
          slot_not_available: '예약 가능한 시간이 아닙니다.',
          slot_already_booked: '이미 예약된 시간입니다.',
          start_at_in_past: '지난 시간은 예약할 수 없습니다.',
          start_at_exceeds_booking_window: '예약 가능 기간을 벗어난 시간입니다.',
          duration_min_mismatch: '선택한 수업 블럭 길이와 요청 길이가 다릅니다.',
          booking_not_found: '예약을 찾을 수 없습니다.',
          booking_not_pending: '승인 대기 예약만 승인할 수 있습니다.',
          booking_not_active: '취소 가능한 예약 상태가 아닙니다.',
          booking_not_completable: '완료 처리할 수 없는 예약입니다.',
          cancel_cutoff_passed: '취소 가능 시간이 지나 취소할 수 없습니다.',
          guest_booking_disabled: '비회원 예약 기능이 비활성화되었습니다. 학생 계정으로 로그인해 주세요.',
          guest_student_booking_disabled: '비회원 학생 예약 기능이 비활성화되었습니다. 회원 학생 이메일로 예약해 주세요.',
          guest_feature_disabled: '비회원 관련 기능이 비활성화되었습니다.',
          cancel_reason: '취소 사유를 입력해 주세요.',
          exception_conflict: '이미 등록된 예외 시간과 겹칩니다.',
          availability_conflict: '이미 등록된 수업 블럭과 시간이 겹칩니다.',
          availability_duplicate: '같은 시간표가 이미 존재합니다.',
          one_time_availability_conflict: '이미 등록된 일회성 블럭과 시간이 겹칩니다.',
          one_time_availability_duplicate: '같은 일회성 블럭이 이미 존재합니다.',
          exception_duplicate: '같은 예외 블럭이 이미 존재합니다.',
          time_must_align_to_30_min: '시간은 30분 단위(00분/30분)로만 입력할 수 있습니다.',
          teacher_private_comment: '선생님 메모를 입력해 주세요.',
          student_comment: '학생 전달 코멘트를 입력해 주세요.',
          at_least_one_comment_is_required: '수정할 코멘트를 하나 이상 입력해 주세요.',
          'cancel_reason is required': '취소 사유를 입력해 주세요.',
          'teacher_private_comment is required': '선생님 메모를 입력해 주세요.',
          'student_comment is required': '학생 전달 코멘트를 입력해 주세요.',
          'teacher_user_id must be a positive integer': '선생님 ID는 양의 정수여야 합니다.',
          'email already exists': '이미 사용 중인 아이디입니다.',
          'login_id already exists': '이미 사용 중인 아이디입니다.',
          'phone already exists': '이미 사용 중인 휴대폰번호입니다.',
          'email and password are required': '아이디와 비밀번호를 입력해 주세요.',
          'login_id and password are required': '아이디와 비밀번호를 입력해 주세요.',
          'login_id, phone, password, name, role are required': '아이디/휴대폰/비밀번호/이름/역할을 모두 입력해 주세요.',
          'login_id must be 3~60 characters': '아이디는 3~60자여야 합니다.',
          'at least one of name, phone is required': '이름 또는 휴대폰번호를 입력해 주세요.',
          'name is required': '이름을 입력해 주세요.',
          'name must be 80 characters or fewer': '이름은 80자 이하여야 합니다.',
          'current_password and new_password are required': '현재 비밀번호와 새 비밀번호를 입력해 주세요.',
          invalid_current_password: '현재 비밀번호가 올바르지 않습니다.',
          'new_password must be at least 8 characters': '새 비밀번호는 8자 이상이어야 합니다.',
          'phone is invalid': '휴대폰번호 형식이 올바르지 않습니다.',
          'teacher_user_id or teacher_login_id is required': '연결할 선생님 ID 또는 로그인 ID를 입력해 주세요.',
          student_teacher_not_assigned: '담당 선생님을 먼저 연결해 주세요.',
          teacher_not_assigned_to_student: '연결된 담당 선생님에게만 예약할 수 있습니다.',
          teacher_ambiguous: '검색 결과가 여러 명입니다. 목록에서 선생님을 선택해 주세요.',
          student_ambiguous: '동일한 이름의 학생이 여러 명입니다. 학생 ID 또는 로그인ID로 지정해 주세요.',
          'student_user_id or student_email is required': '회원 학생 정보(학생 ID/이메일)를 입력해 주세요.',
          'student_user_id, student_login_id, or student_name is required':
            '학생 ID, 로그인ID 또는 이름 중 하나를 입력해 주세요.',
          'student_user_id, student_login_id, student_name, or student_query is required':
            '학생 ID, 로그인ID, 이름 또는 검색어를 입력해 주세요.',
          'teacher_user_id, teacher_login_id, teacher_name, or teacher_query is required':
            '선생님 ID, 로그인ID, 이름 또는 검색어를 입력해 주세요.',
          recovery_user_not_found: '입력 정보와 일치하는 계정을 찾을 수 없습니다.',
          'name, phone are required': '이름과 휴대폰번호를 입력해 주세요.',
          'login_id, name, phone, new_password are required':
            '아이디, 이름, 휴대폰번호, 새 비밀번호를 입력해 주세요.',
          'new_password must be at least 8 characters': '새 비밀번호는 8자 이상이어야 합니다.',
          'start_at is required (ISO datetime)': '예약 시작시간이 필요합니다.',
          'display_name must be 80 characters or fewer': '표시 이름은 80자 이하여야 합니다.',
          'bio must be 2000 characters or fewer': '프로필 소개는 2000자 이하여야 합니다.',
          'student_cancel_day_before_hour must be 0~23': '학생 취소 마감 시각은 0~23 사이여야 합니다.',
          'student_notice must be 4000 characters or fewer': '학생 공지사항은 4000자 이하여야 합니다.',
          'temporary password must be at least 8 characters': '임시 비밀번호는 8자 이상이어야 합니다.',
          'login_id, phone, password, name are required': '아이디/휴대폰/비밀번호/이름을 모두 입력해 주세요.',
          'password must be at least 8 characters': '비밀번호는 8자 이상이어야 합니다.',
          'duration_min must be 10~180 and divisible by 5': '수업 길이(duration)는 10~180분, 5분 단위여야 합니다.',
          already_full_account: '이미 정식 계정입니다.',
        };
        return map[code] || '';
      }

      function getErrorMessage(err) {
        if (err?.payload?.error) {
          const localized = translateApiError(err.payload.error, err.payload);
          if (localized) return localized;
          return String(err.payload.error);
        }
        if (err?.message) return String(err.message);
        return String(err);
      }

      async function runAction(label, fn) {
        try {
          await fn();
        } catch (err) {
          const message = getErrorMessage(err);
          pushLog(`${label} FAILED`, { message, payload: err?.payload });
          showToast(`${label} 실패: ${message}`, 'error', 3600);
        }
      }

      function formObject(form) {
        return Object.fromEntries(new FormData(form).entries());
      }

      function parseRequiredId(value, label) {
        const parsed = Number.parseInt(String(value || ''), 10);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          throw new Error(`${label}는 양의 정수여야 합니다.`);
        }
        return parsed;
      }

      function parseOptionalId(value) {
        const parsed = Number.parseInt(String(value || ''), 10);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          return null;
        }
        return parsed;
      }

      function formatDateTime(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return String(iso);
        return d.toLocaleString('ko-KR', { hour12: false });
      }

      function formatTime(iso) {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
      }

      function escapeHtml(value) {
        return String(value || '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');
      }

      function decodeURIComponentSafe(value) {
        const text = String(value || '');
        try {
          return decodeURIComponent(text);
        } catch (_) {
          return text;
        }
      }

      function statusText(status) {
        const map = {
          PENDING: '승인대기',
          BOOKED: '예약확정',
          CANCELED_BY_STUDENT: '학생취소',
          CANCELED_BY_TEACHER: '선생님취소',
          COMPLETED: '완료',
          NO_SHOW: '노쇼',
        };
        return map[status] || status || '-';
      }

      function statusBadge(status) {
        const safe = String(status || 'UNKNOWN').replace(/[^A-Z_]/g, '');
        return `<span class="status-badge status-${safe}">${statusText(status)}</span>`;
      }

      function toDateKeyFromDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }

      function toDateKeyFromIso(iso) {
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? '' : toDateKeyFromDate(d);
      }

      function normalizeFilterText(value) {
        return String(value || '').trim().toLowerCase();
      }

      function matchesDateRange(iso, fromDate, toDate) {
        const dateKey = toDateKeyFromIso(iso);
        if (!dateKey) return false;
        if (fromDate && dateKey < fromDate) return false;
        if (toDate && dateKey > toDate) return false;
        return true;
      }

      function matchesStudentKeyword(row, keyword) {
        const needle = normalizeFilterText(keyword);
        if (!needle) return true;
        const studentName = normalizeFilterText(row.student_name);
        const studentEmail = normalizeFilterText(row.student_email);
        const studentId = normalizeFilterText(row.student_user_id);
        return studentName.includes(needle) || studentEmail.includes(needle) || studentId.includes(needle);
      }

      function paginateItems(items, pageSize, page) {
        const safePageSize = Math.max(1, Number.parseInt(String(pageSize || 20), 10) || 20);
        const totalItems = Array.isArray(items) ? items.length : 0;
        const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
        const currentPage = Math.min(Math.max(1, Number.parseInt(String(page || 1), 10) || 1), totalPages);
        const start = (currentPage - 1) * safePageSize;
        const end = start + safePageSize;
        return {
          items: (items || []).slice(start, end),
          currentPage,
          totalPages,
          totalItems,
          pageSize: safePageSize,
        };
      }

      function updatePageInfo(pageInfoEl, prevBtn, nextBtn, page) {
        if (pageInfoEl) {
          pageInfoEl.textContent = `총 ${page.totalItems}건 · ${page.currentPage}/${page.totalPages} 페이지 · 페이지당 ${page.pageSize}건`;
        }
        if (prevBtn) prevBtn.disabled = page.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = page.currentPage >= page.totalPages;
      }

      function syncTeacherBookingsFilterInputs() {
        if (teacherBookingsKeywordFilter) teacherBookingsKeywordFilter.value = state.teacherBookingsFilter.keyword;
        if (teacherBookingsStatusFilter) teacherBookingsStatusFilter.value = state.teacherBookingsFilter.status;
        if (teacherBookingsFromDate) teacherBookingsFromDate.value = state.teacherBookingsFilter.fromDate;
        if (teacherBookingsToDate) teacherBookingsToDate.value = state.teacherBookingsFilter.toDate;
        if (teacherBookingsPageSize) teacherBookingsPageSize.value = String(state.teacherBookingsFilter.pageSize);
      }

      function syncTeacherCompletedFilterInputs() {
        if (teacherCompletedKeywordFilter) teacherCompletedKeywordFilter.value = state.teacherCompletedFilter.keyword;
        if (teacherCompletedFromDate) teacherCompletedFromDate.value = state.teacherCompletedFilter.fromDate;
        if (teacherCompletedToDate) teacherCompletedToDate.value = state.teacherCompletedFilter.toDate;
        if (teacherCompletedPageSize) teacherCompletedPageSize.value = String(state.teacherCompletedFilter.pageSize);
      }

      function updateManagePanelUrl(panel) {
        if (PAGE_MODE !== 'TEACHER') return;
        if (!(PAGE_SECTION === 'manage' || PAGE_SECTION === 'all')) return;
        const next = new URL(window.location.href);
        if (panel && panel !== 'availability') {
          next.searchParams.set('manage_panel', panel);
        } else {
          next.searchParams.delete('manage_panel');
        }
        window.history.replaceState({}, '', `${next.pathname}${next.search}${next.hash}`);
      }

      function updateSettingsPanelUrl(panel) {
        if (PAGE_MODE !== 'TEACHER') return;
        if (!(PAGE_SECTION === 'settings' || PAGE_SECTION === 'all')) return;
        const next = new URL(window.location.href);
        if (panel && panel !== 'profile') {
          next.searchParams.set('settings_panel', panel);
        } else {
          next.searchParams.delete('settings_panel');
        }
        window.history.replaceState({}, '', `${next.pathname}${next.search}${next.hash}`);
      }

      function updateOperationsPanelUrl(panel) {
        if (PAGE_MODE !== 'TEACHER') return;
        if (!(PAGE_SECTION === 'operations' || PAGE_SECTION === 'all')) return;
        const next = new URL(window.location.href);
        if (panel === 'completed') {
          next.searchParams.set('operations_panel', 'completed');
        } else {
          next.searchParams.delete('operations_panel');
        }
        window.history.replaceState({}, '', `${next.pathname}${next.search}${next.hash}`);
      }

      function applyTeacherManagePanel() {
        const allowed = ['availability', 'exception'];
        const selected = allowed.includes(state.teacherManagePanel) ? state.teacherManagePanel : 'availability';
        state.teacherManagePanel = selected;
        if (teacherManagePanelSelect) {
          teacherManagePanelSelect.value = selected;
        }
        const panels = Array.from(document.querySelectorAll('[data-manage-panel]'));
        panels.forEach((panel) => {
          const panelType = String(panel.dataset.managePanel || '').toLowerCase();
          const visible = panelType === selected;
          panel.classList.toggle('hidden', !visible);
        });
        updateManagePanelUrl(selected);
      }

      function applyTeacherSettingsPanel() {
        const allowed = ['profile', 'account', 'students'];
        const selected = allowed.includes(state.teacherSettingsPanel) ? state.teacherSettingsPanel : 'profile';
        state.teacherSettingsPanel = selected;
        if (teacherSettingsPanelSelect) {
          teacherSettingsPanelSelect.value = selected;
        }
        const panels = Array.from(document.querySelectorAll('[data-teacher-settings-panel]'));
        panels.forEach((panel) => {
          const panelType = String(panel.dataset.teacherSettingsPanel || '').toLowerCase();
          panel.classList.toggle('hidden', panelType !== selected);
        });
        updateSettingsPanelUrl(selected);
      }

      function applyTeacherOperationsPanel() {
        const selected = state.teacherOperationsPanel === 'completed' ? 'completed' : 'bookings';
        state.teacherOperationsPanel = selected;
        teacherOperationsBookingsTab?.classList.toggle('primary', selected === 'bookings');
        teacherOperationsCompletedTab?.classList.toggle('primary', selected === 'completed');
        const bookingsSection = document.getElementById('teacherBookingsSection');
        const completedSection = document.getElementById('teacherCompletedSection');
        if (bookingsSection) {
          bookingsSection.classList.toggle('hidden', selected !== 'bookings');
        }
        if (completedSection) {
          completedSection.classList.toggle('hidden', selected !== 'completed');
        }
        updateOperationsPanelUrl(selected);
      }

      function parseDateKey(key) {
        return new Date(`${key}T00:00:00`);
      }

      function formatDateKeyLabel(dateKey) {
        const d = parseDateKey(dateKey);
        if (Number.isNaN(d.getTime())) return dateKey;
        return d.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          weekday: 'short',
        });
      }

      const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

      function weekdayLabel(value) {
        const index = Number.parseInt(String(value || ''), 10);
        if (!Number.isInteger(index) || index < 0 || index > 6) return '-';
        return `${WEEKDAY_LABELS[index]}요일`;
      }

      function startOfWeek(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - d.getDay());
        return d;
      }

      function weekRange(cursorDate) {
        const from = startOfWeek(cursorDate);
        const to = new Date(from);
        to.setDate(to.getDate() + 7);
        return { from, to };
      }

      function startOfMonth(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(1);
        return d;
      }

      function monthGridRange(cursorDate) {
        const first = startOfMonth(cursorDate);
        const from = startOfWeek(first);
        const to = new Date(from);
        to.setDate(to.getDate() + 42);
        return { from, to };
      }

      function formatMonthLabel(cursorDate) {
        const d = startOfMonth(cursorDate);
        return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
      }

      function currentStudentCalendarRange() {
        if (state.studentCalendarView === 'month') {
          return monthGridRange(state.monthCursor);
        }
        return weekRange(state.monthCursor);
      }

      async function ensureHolidayCacheForYear(year) {
        const key = String(year);
        if (state.loadedHolidayYears[key]) return;
        state.loadedHolidayYears[key] = 'loading';
        try {
          const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
          if (!res.ok) {
            throw new Error(`holiday api failed: ${res.status}`);
          }
          const items = await res.json();
          for (const row of items || []) {
            const dateKey = String(row?.date || '').trim();
            if (!dateKey) continue;
            state.holidaysByDate[dateKey] = String(row?.localName || row?.name || '공휴일');
          }
          state.loadedHolidayYears[key] = 'loaded';
        } catch (err) {
          state.loadedHolidayYears[key] = 'failed';
          pushLog('공휴일 로드 실패', { year, message: err?.message || String(err) });
        }
      }

      async function ensureHolidayCacheForRange(from, to) {
        const startYear = from.getFullYear();
        const endYear = to.getFullYear();
        for (let year = startYear; year <= endYear; year += 1) {
          await ensureHolidayCacheForYear(year);
        }
      }

      function formatWeekLabel(cursorDate) {
        const start = startOfWeek(cursorDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
      }

      function applyStudentCalendarViewUi() {
        if (studentWeekViewBtn) {
          studentWeekViewBtn.classList.toggle('primary', state.studentCalendarView === 'week');
        }
        if (studentMonthViewBtn) {
          studentMonthViewBtn.classList.toggle('primary', state.studentCalendarView === 'month');
        }
        if (prevMonthBtn) {
          prevMonthBtn.textContent = state.studentCalendarView === 'month' ? '이전 달' : '이전 주';
        }
        if (nextMonthBtn) {
          nextMonthBtn.textContent = state.studentCalendarView === 'month' ? '다음 달' : '다음 주';
        }
      }

      function currentTeacherCalendarRange() {
        if (state.teacherCalendarView === 'month') {
          return monthGridRange(state.teacherWeekCursor);
        }
        return weekRange(state.teacherWeekCursor);
      }

      function applyTeacherCalendarViewUi() {
        if (teacherWeekViewBtn) {
          teacherWeekViewBtn.classList.toggle('primary', state.teacherCalendarView === 'week');
        }
        if (teacherMonthViewBtn) {
          teacherMonthViewBtn.classList.toggle('primary', state.teacherCalendarView === 'month');
        }
        const isMonth = state.teacherCalendarView === 'month';
        const prevBtn = document.getElementById('teacherPrevWeekBtn');
        const nextBtn = document.getElementById('teacherNextWeekBtn');
        const todayBtn = document.getElementById('teacherTodayBtn');
        if (prevBtn) prevBtn.textContent = isMonth ? '이전 달' : '이전 주';
        if (nextBtn) nextBtn.textContent = isMonth ? '다음 달' : '다음 주';
        if (todayBtn) todayBtn.textContent = isMonth ? '이번 달' : '이번 주';
      }

      function isCompactTeacherTouchLayout() {
        return window.matchMedia('(max-width: 760px)').matches || window.matchMedia('(pointer: coarse)').matches;
      }

      function shouldUseTeacherTapRangeSelection() {
        return PAGE_MODE === 'TEACHER' && state.teacherCalendarView === 'week' && isCompactTeacherTouchLayout();
      }

      function timeLabelFromMinutes(totalMinutes) {
        const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
        const minutes = String(totalMinutes % 60).padStart(2, '0');
        return `${hours}:${minutes}`;
      }

      function minutesFromTimeLocal(timeText) {
        const [hh, mm] = String(timeText || '')
          .slice(0, 5)
          .split(':')
          .map((v) => Number(v));
        if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
        if (hh === 24 && mm === 0) return 24 * 60;
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
        return hh * 60 + mm;
      }

      function buildHalfHourTimeOptions(kind = 'start') {
        const options = [];
        const firstMinute = kind === 'end' ? TIME_ALIGNMENT_MIN : 0;
        const lastMinute = kind === 'end' ? 24 * 60 : 24 * 60 - TIME_ALIGNMENT_MIN;
        for (let minute = firstMinute; minute <= lastMinute; minute += TIME_ALIGNMENT_MIN) {
          options.push(timeLabelFromMinutes(minute));
        }
        return options;
      }

      function initializeHalfHourSelect(select) {
        if (!select) return;
        const kind = String(select.dataset.halfHourSelect || 'start').toLowerCase() === 'end' ? 'end' : 'start';
        const allowEmpty = String(select.dataset.allowEmpty || '').toLowerCase() === 'true';
        const options = buildHalfHourTimeOptions(kind);
        const preferredValue = String(select.value || select.dataset.defaultTime || '').trim();
        select.innerHTML = '';
        if (allowEmpty) {
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = '선택';
          select.appendChild(placeholder);
        }
        for (const value of options) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          select.appendChild(option);
        }
        if (preferredValue && options.includes(preferredValue)) {
          select.value = preferredValue;
          return;
        }
        if (allowEmpty) {
          select.value = '';
          return;
        }
        if (options.length) {
          select.value = options[0];
        }
      }

      function initializeHalfHourSelects() {
        document.querySelectorAll('select[data-half-hour-select]').forEach((select) => {
          initializeHalfHourSelect(select);
        });
      }

      function getTeacherGridStepMinutes() {
        return Math.max(10, Number.parseInt(teacherGridStep?.value || state.teacherGridStepMin, 10) || 60);
      }

      function addMinutesToLocalTime(timeText, addMinutes) {
        const start = minutesFromTimeLocal(timeText);
        if (start === null) return null;
        const end = start + addMinutes;
        if (end <= 0 || end > 24 * 60) return null;
        return timeLabelFromMinutes(end);
      }

      function isAlignedToMinutes(totalMinutes, stepMinutes = TIME_ALIGNMENT_MIN) {
        if (!Number.isInteger(totalMinutes) || !Number.isInteger(stepMinutes) || stepMinutes <= 0) {
          return false;
        }
        return totalMinutes % stepMinutes === 0;
      }

      function ensureTimeRangeAligned(startTime, endTime, label = '시간') {
        const startMinute = minutesFromTimeLocal(startTime);
        const endMinute = minutesFromTimeLocal(endTime);
        if (startMinute === null || endMinute === null || startMinute >= endMinute) {
          throw new Error(`${label}의 시작/종료를 올바르게 입력해 주세요.`);
        }
        if (!isAlignedToMinutes(startMinute) || !isAlignedToMinutes(endMinute)) {
          throw new Error(`${label}은 30분 단위(00분/30분)로만 입력할 수 있습니다.`);
        }
        return { startMinute, endMinute };
      }

      function buildCalendarInviteUrl(teacherUserId) {
        return `${window.location.origin}/student-calendar.html?teacher=${encodeURIComponent(String(teacherUserId))}`;
      }

      function buildLessonInviteUrl(teacherUserId, startAtIso) {
        const params = new URLSearchParams({
          teacher: String(teacherUserId),
          start_at: String(startAtIso),
        });
        return `${window.location.origin}/student-calendar.html?${params.toString()}`;
      }

      async function copyLessonInviteUrlByStartAt(startAtIso) {
        if (!state.user?.id) {
          throw new Error('로그인 사용자 정보를 확인할 수 없습니다.');
        }
        const lessonUrl = buildLessonInviteUrl(state.user.id, startAtIso);
        await navigator.clipboard.writeText(lessonUrl);
        return lessonUrl;
      }

      function buildCurrentAppPath() {
        return `${window.location.pathname}${window.location.search}${window.location.hash}`;
      }

      function redirectToLoginPage() {
        const params = new URLSearchParams({
          return_to: buildCurrentAppPath(),
        });
        window.location.href = `/index.html?${params.toString()}`;
      }

      function renderTeacherProfileForm() {
        if (!teacherProfileForm) return;
        const profile = state.teacherProfile || {};
        const cancelHour = Number.parseInt(profile.student_cancel_day_before_hour, 10);
        teacherProfileForm.elements.display_name.value = String(profile.display_name || '');
        teacherProfileForm.elements.bio.value = String(profile.bio || '');
        teacherProfileForm.elements.student_cancel_day_before_hour.value = Number.isInteger(cancelHour)
          ? String(cancelHour)
          : '21';
        teacherProfileForm.elements.student_notice.value = String(profile.student_notice || '');
      }

      function renderLessonCatalog() {
        if (!lessonCatalogList || PAGE_MODE !== 'TEACHER') return;
        const grouped = new Map();
        for (const slots of Object.values(state.slotsByDate || {})) {
          for (const slot of slots || []) {
            if (!slot.is_available) continue;
            const title = String(slot.lesson_title || '').trim() || '일반 수업';
            if (!grouped.has(title)) {
              grouped.set(title, []);
            }
            grouped.get(title).push(slot);
          }
        }

        const items = Array.from(grouped.entries())
          .map(([title, slots]) => ({
            title,
            slots: slots.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
          }))
          .sort((a, b) => a.title.localeCompare(b.title, 'ko'));

        if (!items.length) {
          lessonCatalogList.innerHTML = '<div class="hint">오픈된 레슨 항목이 없습니다.</div>';
          return;
        }

        lessonCatalogList.innerHTML = '';
        for (const item of items) {
          const firstSlot = item.slots[0];
          const row = document.createElement('div');
          row.className = 'slot-row';
          row.innerHTML = `
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <div class="hint mono">오픈 슬롯 ${item.slots.length}개 · 다음 수업 ${formatDateTime(firstSlot.start_at)}</div>
            </div>
            <div class="actions">
              <button type="button" data-copy-lesson-catalog-start-at="${escapeHtml(firstSlot.start_at)}">링크 복사</button>
            </div>
          `;
          lessonCatalogList.appendChild(row);
        }
      }

      function renderTeacherOpenSlotList() {
        if (!teacherOpenSlotList || PAGE_MODE !== 'TEACHER') return;
        const isMonthView = state.teacherCalendarView === 'month';
        if (teacherOpenSlotTitle) {
          teacherOpenSlotTitle.textContent = isMonthView ? '이번 달 오픈 슬롯 (링크/대리예약)' : '이번 주 오픈 슬롯 (링크/대리예약)';
        }
        if (teacherOpenSlotHint) {
          teacherOpenSlotHint.textContent = isMonthView
            ? '캘린더 링크는 월간 공유 기준이며, 레슨 링크는 특정 시간 1건 공유용입니다.'
            : '캘린더 링크는 전체 주간 시간표 공유용, 레슨 링크는 특정 시간 1건 공유용입니다.';
        }
        const { from, to } = currentTeacherCalendarRange();
        const days = [];
        const cursor = new Date(from);
        const monthAnchor = startOfMonth(state.teacherWeekCursor);
        const monthYear = monthAnchor.getFullYear();
        const monthIndex = monthAnchor.getMonth();
        while (cursor < to) {
          if (!isMonthView || (cursor.getFullYear() === monthYear && cursor.getMonth() === monthIndex)) {
            days.push(new Date(cursor));
          }
          cursor.setDate(cursor.getDate() + 1);
        }
        const openSlots = [];
        for (const day of days) {
          const dateKey = toDateKeyFromDate(day);
          const slots = (state.slotsByDate[dateKey] || [])
            .filter((slot) => slot.is_available)
            .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
          for (const slot of slots) {
            openSlots.push(slot);
          }
        }

        if (!openSlots.length) {
          teacherOpenSlotList.innerHTML = isMonthView
            ? '<div class="hint">이번 달에 학생에게 열려 있는 슬롯이 없습니다.</div>'
            : '<div class="hint">이번 주에 학생에게 열려 있는 슬롯이 없습니다.</div>';
          renderLessonCatalog();
          return;
        }

        teacherOpenSlotList.innerHTML = '';
        for (const slot of openSlots) {
          const row = document.createElement('div');
          row.className = 'slot-row';
          const title = String(slot.lesson_title || '').trim() || '수업';
          const durationMin = Number.parseInt(slot.duration_min, 10) || state.teacherGridStepMin || 30;
          row.innerHTML = `
            <div>
              <strong>${escapeHtml(title)}</strong>
              <div class="hint mono">${formatDateTime(slot.start_at)} ~ ${formatDateTime(slot.end_at)}</div>
            </div>
            <div class="actions">
              <button type="button" data-copy-lesson-link-start-at="${escapeHtml(slot.start_at)}" title="이 시간의 예약 링크 복사">링크 복사</button>
              <button type="button" data-book-slot-on-behalf="${escapeHtml(slot.start_at)}" data-book-slot-duration="${durationMin}">대리 예약</button>
            </div>
          `;
          teacherOpenSlotList.appendChild(row);
        }
        renderLessonCatalog();
      }

      function hideTeacherCellDetail() {
        if (!teacherCellDetailCard) return;
        teacherCellDetailCard.classList.add('hidden');
        if (teacherCellDetailTitle) {
          teacherCellDetailTitle.textContent = '선택한 시간 상세';
        }
        if (teacherCellDetailBody) {
          teacherCellDetailBody.innerHTML = '캘린더에서 오픈/예약/완료 칸을 누르면 상세가 표시됩니다.';
        }
        if (teacherCellDetailActions) {
          teacherCellDetailActions.innerHTML = '';
        }
      }

      function showTeacherCellDetail({ title, bodyHtml, actions = [] }) {
        if (!teacherCellDetailCard) return;
        if (teacherCellDetailTitle) {
          teacherCellDetailTitle.textContent = String(title || '선택한 시간 상세');
        }
        if (teacherCellDetailBody) {
          teacherCellDetailBody.innerHTML = bodyHtml || '';
        }
        if (teacherCellDetailActions) {
          teacherCellDetailActions.innerHTML = '';
          for (const action of actions) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = String(action?.label || '실행');
            if (action?.tone) {
              button.classList.add(action.tone);
            }
            button.addEventListener('click', () => {
              runAction(String(action?.label || '상세 액션'), async () => {
                await action.run();
              });
            });
            teacherCellDetailActions.appendChild(button);
          }
        }
        teacherCellDetailCard.classList.remove('hidden');
      }

      function findTeacherBookingById(bookingId) {
        const numericId = parseOptionalId(bookingId);
        if (!numericId) return null;
        return (state.teacherBookings || []).find((row) => Number(row.id) === numericId) || null;
      }

      function getSlotByDateKeyAndStartMinute(dateKey, startMinute) {
        const minute = Number.parseInt(startMinute, 10);
        if (!dateKey || !Number.isInteger(minute)) return null;
        const slots = getSlotsForDateKey(dateKey);
        return (
          slots.find((slot) => {
            const start = new Date(slot.start_at);
            if (Number.isNaN(start.getTime())) return false;
            return start.getHours() * 60 + start.getMinutes() === minute;
          }) || null
        );
      }

      function fillAvailabilityFormById(availabilityId) {
        const id = parseOptionalId(availabilityId);
        if (!id || !availabilityForm) return false;
        const row = (state.teacherAvailability || []).find((it) => Number(it.id) === id);
        if (!row) return false;
        availabilityForm.elements.id.value = String(row.id);
        availabilityForm.elements.weekday.value = String(row.weekday);
        availabilityForm.elements.start_time_local.value = String(row.start_time_local).slice(0, 5);
        availabilityForm.elements.end_time_local.value = String(row.end_time_local).slice(0, 5);
        availabilityForm.elements.is_active.value = row.is_active ? 'true' : 'false';
        availabilityForm.elements.lesson_title.value = String(row.lesson_title || '');
        availabilityForm.elements.lesson_note.value = String(row.lesson_note || '');
        availabilityForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }

      function fillExceptionFormById(exceptionId) {
        const id = parseOptionalId(exceptionId);
        if (!id || !exceptionForm) return false;
        const row = (state.teacherExceptions || []).find((it) => Number(it.id) === id);
        if (!row) return false;
        exceptionForm.elements.id.value = String(row.id);
        exceptionForm.elements.date_local.value = String(row.date_local || '');
        exceptionForm.elements.start_time_local.value = String(row.start_time_local || '').slice(0, 5);
        exceptionForm.elements.end_time_local.value = String(row.end_time_local || '').slice(0, 5);
        exceptionForm.elements.reason.value = String(row.reason || '');
        exceptionForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }

      function buildTeacherBookingDetailBody(booking) {
        const studentName = booking.student_email || booking.student_name || booking.student_user_id || '-';
        const studentComment = escapeHtml(String(booking.student_comment || booking.teacher_comment || ''));
        const teacherMemo = escapeHtml(String(booking.teacher_private_comment || ''));
        return `
          <div><strong>상태</strong>: ${statusBadge(booking.status)}</div>
          <div><strong>학생</strong>: ${escapeHtml(String(studentName))}</div>
          <div><strong>시간</strong>: <span class="mono">${formatDateTime(booking.start_at)} ~ ${formatDateTime(booking.end_at)}</span></div>
          <div><strong>학생 전달 코멘트</strong>: ${studentComment || '-'}</div>
          <div><strong>선생님 메모</strong>: ${teacherMemo || '-'}</div>
        `;
      }

      function openTeacherBookingDetail(bookingId) {
        const booking = findTeacherBookingById(bookingId);
        if (!booking) {
          showToast('예약 상세 정보를 찾을 수 없습니다.', 'error');
          return;
        }

        const actions = [];
        if (booking.status === 'PENDING') {
          actions.push({
            label: '예약 승인',
            tone: 'primary',
            run: async () => {
              await approveBooking(booking.id);
              await loadTeacherBookings();
              await loadSlotsForCurrentMonth();
              openTeacherBookingDetail(booking.id);
            },
          });
        }
        if (['PENDING', 'BOOKED'].includes(String(booking.status || ''))) {
          actions.push({
            label: '예약 취소',
            tone: 'danger',
            run: async () => {
              const ok = window.confirm('이 예약을 취소할까요?');
              if (!ok) return;
              await cancelBooking(booking.id);
              await loadTeacherBookings();
              await loadSlotsForCurrentMonth();
              openTeacherBookingDetail(booking.id);
            },
          });
          actions.push({
            label: '수업 완료 처리',
            run: async () => {
              const studentComment = promptRequiredText('학생에게 전달할 코멘트를 입력해 주세요. (필수)');
              if (studentComment === null) return;
              const teacherPrivateComment = promptRequiredText('선생님 내부 메모를 입력해 주세요. (필수)');
              if (teacherPrivateComment === null) return;
              await completeBooking(booking.id, {
                teacherPrivateComment,
                studentComment,
              });
              await loadTeacherBookings();
              await loadSlotsForCurrentMonth();
              openTeacherBookingDetail(booking.id);
            },
          });
        }
        if (booking.status === 'COMPLETED') {
          actions.push({
            label: '학생 코멘트 수정',
            run: async () => {
              const current = String(booking.student_comment || booking.teacher_comment || '');
              const next = promptRequiredText('학생에게 전달할 코멘트를 입력해 주세요. (필수)', current);
              if (next === null) return;
              await completeBooking(booking.id, { studentComment: next });
              await loadTeacherBookings();
              openTeacherBookingDetail(booking.id);
            },
          });
          actions.push({
            label: '선생님 메모 수정',
            run: async () => {
              const current = String(booking.teacher_private_comment || '');
              const next = promptRequiredText('선생님 내부 메모를 입력해 주세요. (필수)', current);
              if (next === null) return;
              await completeBooking(booking.id, { teacherPrivateComment: next });
              await loadTeacherBookings();
              openTeacherBookingDetail(booking.id);
            },
          });
        }

        showTeacherCellDetail({
          title: `예약 상세 #${booking.id}`,
          bodyHtml: buildTeacherBookingDetailBody(booking),
          actions,
        });
      }

      function openTeacherWindowDetail({ dateKey, startMinute, windowId, source }) {
        const slot = getSlotByDateKeyAndStartMinute(dateKey, startMinute);
        const availabilityId = parseOptionalId(windowId);
        const isOneTime = String(source || '').toLowerCase() === 'one_time';
        const title = isOneTime ? '단일 오픈 상세' : '주간 오픈 상세';
        const lessonTitle = String(slot?.lesson_title || '').trim() || '수업';
        const bodyHtml = `
          <div><strong>유형</strong>: ${isOneTime ? '단일 오픈' : '주간 시간표'}</div>
          <div><strong>날짜</strong>: ${escapeHtml(formatDateKeyLabel(dateKey || ''))}</div>
          <div><strong>시간</strong>: <span class="mono">${slot ? `${formatDateTime(slot.start_at)} ~ ${formatDateTime(slot.end_at)}` : `${timeLabelFromMinutes(Number(startMinute) || 0)} 시작`}</span></div>
          <div><strong>수업명</strong>: ${escapeHtml(lessonTitle)}</div>
          <div><strong>예약 가능 여부</strong>: ${slot?.is_available ? '예약 가능' : '이미 예약됨/마감'}</div>
        `;

        const actions = [];
        if (slot?.start_at) {
          actions.push({
            label: '레슨 링크 복사',
            run: async () => {
              const lessonUrl = await copyLessonInviteUrlByStartAt(slot.start_at);
              pushLog('레슨 링크 생성', { lesson_url: lessonUrl, start_at: slot.start_at });
              showToast('레슨 링크를 복사했습니다.', 'success');
            },
          });
          if (slot.is_available) {
            actions.push({
              label: '대리 예약 등록',
              tone: 'primary',
              run: async () => {
                const durationMin = Number.parseInt(slot.duration_min, 10) || state.teacherGridStepMin || 30;
                await createBookingOnBehalf(slot.start_at, durationMin);
                await loadTeacherBookings();
                await loadSlotsForCurrentMonth();
                openTeacherWindowDetail({ dateKey, startMinute, windowId, source });
              },
            });
          }
        }
        if (!isOneTime && availabilityId) {
          actions.push({
            label: '시간표 폼으로 불러오기',
            run: async () => {
              const ok = fillAvailabilityFormById(availabilityId);
              if (!ok) {
                showToast('시간표 원본을 찾을 수 없습니다.', 'error');
              }
            },
          });
        }

        showTeacherCellDetail({
          title,
          bodyHtml,
          actions,
        });
      }

      function openTeacherExceptionDetail(exceptionId) {
        const id = parseOptionalId(exceptionId);
        if (!id) return;
        const row = (state.teacherExceptions || []).find((it) => Number(it.id) === id);
        if (!row) {
          showToast('불가 일정 정보를 찾을 수 없습니다.', 'error');
          return;
        }
        const bodyHtml = `
          <div><strong>날짜</strong>: ${escapeHtml(String(row.date_local || ''))}</div>
          <div><strong>시간</strong>: <span class="mono">${escapeHtml(String(row.start_time_local || ''))} ~ ${escapeHtml(String(row.end_time_local || ''))}</span></div>
          <div><strong>사유</strong>: ${escapeHtml(String(row.reason || '불가 일정'))}</div>
        `;
        showTeacherCellDetail({
          title: `불가 일정 상세 #${row.id}`,
          bodyHtml,
          actions: [
            {
              label: '불가 일정 폼으로 불러오기',
              run: async () => {
                const ok = fillExceptionFormById(row.id);
                if (!ok) {
                  showToast('불가 일정 원본을 찾을 수 없습니다.', 'error');
                }
              },
            },
          ],
        });
      }

      function openTeacherCellDetailsFromCell(cell, { dateKey, minute } = {}) {
        if (!cell) return false;
        const bookingId = parseOptionalId(cell.getAttribute('data-cell-booking-id'));
        if (bookingId) {
          openTeacherBookingDetail(bookingId);
          return true;
        }

        const exceptionId = parseOptionalId(cell.getAttribute('data-cell-exception-id'));
        if (exceptionId) {
          openTeacherExceptionDetail(exceptionId);
          return true;
        }

        const windowId = parseOptionalId(cell.getAttribute('data-cell-window-id'));
        if (windowId) {
          const windowSource = String(cell.getAttribute('data-cell-window-source') || '').trim();
          const windowStartMinute = Number.parseInt(cell.getAttribute('data-cell-window-start-minute') || '', 10);
          openTeacherWindowDetail({
            dateKey: String(dateKey || cell.getAttribute('data-date-key') || '').trim(),
            startMinute: Number.isInteger(windowStartMinute)
              ? windowStartMinute
              : Number.isInteger(minute)
                ? minute
              : Number.parseInt(cell.getAttribute('data-minute') || '', 10),
            windowId,
            source: windowSource,
          });
          return true;
        }

        return false;
      }

      function clearTeacherTouchState() {
        if (state.teacherTouch.timerId) {
          window.clearTimeout(state.teacherTouch.timerId);
          state.teacherTouch.timerId = null;
        }
        state.teacherTouch.started = false;
        state.teacherTouch.startMeta = null;
        state.teacherTouch.startTarget = null;
        state.teacherTouch.startX = 0;
        state.teacherTouch.startY = 0;
        state.teacherTouch.moved = false;
      }

      function updateTeacherTouchGuide() {
        if (!teacherTouchGuide) return;
        if (state.teacherCalendarView !== 'week') {
          teacherTouchGuide.textContent = '월 캘린더에서는 날짜를 눌러 해당 주를 열 수 있습니다.';
        } else if (!shouldUseTeacherTapRangeSelection()) {
          teacherTouchGuide.textContent = '빈 칸을 드래그하면 수업 범위를 빠르게 만들 수 있습니다.';
        } else if (state.teacherTouch.rangeAnchor) {
          teacherTouchGuide.textContent = `${formatDateKeyLabel(state.teacherTouch.rangeAnchor.dateKey)} ${timeLabelFromMinutes(state.teacherTouch.rangeAnchor.minute)}부터 선택됨. 같은 날 종료 시간을 다시 눌러 주세요.`;
        } else {
          teacherTouchGuide.textContent = '모바일에서는 빈 칸을 한 번 눌러 시작시간을, 다시 눌러 종료시간을 고를 수 있습니다.';
        }
        if (teacherClearTouchSelectionBtn) {
          teacherClearTouchSelectionBtn.disabled = !state.teacherTouch.rangeAnchor;
        }
      }

      function clearTeacherTouchRange({ rerender = false } = {}) {
        state.teacherTouch.rangeAnchor = null;
        if (rerender && PAGE_MODE === 'TEACHER') {
          renderTeacherCalendar();
          return;
        }
        teacherCalendarGrid?.querySelector('.week-cell.touch-anchor')?.classList.remove('touch-anchor');
        updateTeacherTouchGuide();
      }

      function buildTeacherCreatePreview(dateKey, startMinute, endMinuteExclusive, step = getTeacherGridStepMinutes()) {
        if (!dateKey || !Number.isInteger(startMinute) || !Number.isInteger(endMinuteExclusive)) {
          return null;
        }
        const safeEndMinuteExclusive = Math.min(24 * 60, endMinuteExclusive);
        if (safeEndMinuteExclusive <= startMinute) {
          return null;
        }
        return {
          mode: 'create',
          dateKey,
          weekday: parseDateKey(dateKey).getDay(),
          startMinute,
          endMinute: Math.max(startMinute, safeEndMinuteExclusive - step),
          endMinuteExclusive: safeEndMinuteExclusive,
          durationMin: safeEndMinuteExclusive - startMinute,
        };
      }

      function scrollTeacherCalendarToMinute(targetMinute) {
        if (!teacherCalendarGrid || state.teacherCalendarView !== 'week') return;
        const row = teacherCalendarGrid.querySelector(`[data-time-minute="${targetMinute}"]`);
        if (!row) return;
        const top = row.offsetTop - 36;
        teacherCalendarGrid.scrollTo({
          top: Math.max(0, top),
          behavior: 'smooth',
        });
      }

      function handleTeacherTapSelection({ dateKey, minute, cell }) {
        if (!dateKey || !Number.isInteger(minute)) return;
        if (openTeacherCellDetailsFromCell(cell, { dateKey, minute })) {
          clearTeacherTouchRange();
          return;
        }
        if (!shouldUseTeacherTapRangeSelection()) {
          openTeacherCreateFromCell({ dateKey, minute, cell });
          return;
        }

        const anchor = state.teacherTouch.rangeAnchor;
        if (!anchor || anchor.dateKey !== dateKey) {
          state.teacherTouch.rangeAnchor = { dateKey, minute };
          renderTeacherCalendar();
          showToast('시작 시간이 선택되었습니다. 같은 날 종료 시간을 한 번 더 눌러 주세요.', 'info', 2200);
          return;
        }

        const step = getTeacherGridStepMinutes();
        const preview = buildTeacherCreatePreview(
          dateKey,
          Math.min(anchor.minute, minute),
          Math.max(anchor.minute, minute) + step,
          step
        );
        state.teacherTouch.rangeAnchor = null;
        renderTeacherCalendar();
        if (!preview) {
          showToast('선택한 시간 범위를 다시 확인해 주세요.', 'error');
          return;
        }
        if (state.teacherCreateType === 'exception') {
          openTeacherExceptionModal(preview);
        } else {
          openTeacherCreateModal(preview);
        }
      }

      function setTeacherCreateSubmitting(submitting) {
        state.teacherCreateSubmitting = Boolean(submitting);
        if (teacherCreateSaveBtn) {
          teacherCreateSaveBtn.disabled = state.teacherCreateSubmitting;
          teacherCreateSaveBtn.textContent = state.teacherCreateSubmitting ? '저장 중...' : '일정 저장';
        }
      }

      function setTeacherExceptionSubmitting(submitting) {
        state.teacherExceptionSubmitting = Boolean(submitting);
        if (teacherExceptionSaveBtn) {
          teacherExceptionSaveBtn.disabled = state.teacherExceptionSubmitting;
          teacherExceptionSaveBtn.textContent = state.teacherExceptionSubmitting ? '저장 중...' : '불가 일정 저장';
        }
      }

      function getCellMetaFromEventTarget(target) {
        const cell = target?.closest?.('td.week-cell');
        if (!cell) return null;
        const dateKey = cell.getAttribute('data-date-key');
        const minute = Number.parseInt(cell.getAttribute('data-minute') || '', 10);
        if (!dateKey || !Number.isInteger(minute)) return null;
        return { cell, dateKey, minute };
      }

      function getCellMetaFromPoint(clientX, clientY) {
        const target = document.elementFromPoint(clientX, clientY);
        return getCellMetaFromEventTarget(target);
      }

      function getTeacherDragPreview(drag = state.teacherDrag) {
        if (!drag) return null;

        if (drag.mode === 'create') {
          if (drag.dateKey !== drag.currentDateKey) return null;
          const startMinute = Math.min(drag.startMinute, drag.currentMinute);
          const endMinute = Math.max(drag.startMinute, drag.currentMinute);
          const endMinuteExclusive = endMinute + drag.step;
          if (endMinuteExclusive > 24 * 60) return null;
          return {
            mode: 'create',
            dateKey: drag.dateKey,
            weekday: parseDateKey(drag.dateKey).getDay(),
            startMinute,
            endMinute,
            endMinuteExclusive,
            durationMin: endMinuteExclusive - startMinute,
          };
        }

        if (drag.mode === 'move') {
          const startMinute = drag.currentMinute;
          const endMinuteExclusive = startMinute + drag.originalDuration;
          if (endMinuteExclusive > 24 * 60 || startMinute < 0) return null;
          return {
            mode: 'move',
            availabilityId: drag.availabilityId,
            dateKey: drag.currentDateKey,
            weekday: parseDateKey(drag.currentDateKey).getDay(),
            startMinute,
            endMinute: endMinuteExclusive - drag.step,
            endMinuteExclusive,
            durationMin: drag.originalDuration,
            originalWeekday: drag.originalWeekday,
            originalStartMinute: drag.originalStartMinute,
            originalEndMinuteExclusive: drag.originalEndMinuteExclusive,
            isActive: drag.isActive,
          };
        }

        if (drag.mode === 'resize') {
          if (drag.dateKey !== drag.currentDateKey) return null;
          const rawEndExclusive = drag.currentMinute + drag.step;
          const endMinuteExclusive = Math.max(drag.startMinute + drag.step, rawEndExclusive);
          if (endMinuteExclusive > 24 * 60) return null;
          return {
            mode: 'resize',
            availabilityId: drag.availabilityId,
            dateKey: drag.dateKey,
            weekday: drag.originalWeekday,
            startMinute: drag.startMinute,
            endMinute: endMinuteExclusive - drag.step,
            endMinuteExclusive,
            durationMin: endMinuteExclusive - drag.startMinute,
            originalWeekday: drag.originalWeekday,
            originalStartMinute: drag.originalStartMinute,
            originalEndMinuteExclusive: drag.originalEndMinuteExclusive,
            isActive: drag.isActive,
          };
        }

        return null;
      }

      function renderTeacherDragHint(preview) {
        if (!preview || !state.teacherDrag) {
          teacherDragHint.classList.add('hidden');
          return;
        }
        const modeText = preview.mode === 'create' ? '생성' : preview.mode === 'move' ? '이동' : '길이조절';
        const startText = timeLabelFromMinutes(preview.startMinute);
        const endText = timeLabelFromMinutes(preview.endMinuteExclusive);
        teacherDragHint.textContent = `${modeText} ${startText}-${endText} (${preview.durationMin}분)`;
        const x = Math.min(window.innerWidth - 170, Math.max(8, (state.teacherDrag.pointerX || 20) + 14));
        const y = Math.min(window.innerHeight - 40, Math.max(8, (state.teacherDrag.pointerY || 20) + 14));
        teacherDragHint.style.left = `${x}px`;
        teacherDragHint.style.top = `${y}px`;
        teacherDragHint.classList.remove('hidden');
      }

      function applyPageSection(role) {
        const setVisible = (id, visible) => {
          const el = document.getElementById(id);
          if (el) {
            el.classList.toggle('hidden', !visible);
          }
        };

        if (role === 'STUDENT') {
          const hasAssignedTeacher = Boolean(parseOptionalId(state.user?.assigned_teacher_user_id));
          const showCalendar = PAGE_SECTION === 'all' || PAGE_SECTION === 'calendar';
          const showBookings = PAGE_SECTION === 'all' || PAGE_SECTION === 'bookings';
          const showSettings = PAGE_SECTION === 'all' || PAGE_SECTION === 'settings';
          const shouldShowTeacherRequiredNotice =
            !hasAssignedTeacher && (showCalendar || showBookings || PAGE_SECTION === 'all');
          setVisible('studentCalendarSection', showCalendar && hasAssignedTeacher);
          setVisible('studentBookingsSection', showBookings && hasAssignedTeacher);
          setVisible('studentSettingsSection', showSettings);
          if (studentNeedsTeacherNotice) {
            studentNeedsTeacherNotice.classList.toggle('hidden', !shouldShowTeacherRequiredNotice);
          }
        }

        if (role === 'TEACHER') {
          const showCalendar = PAGE_SECTION === 'all' || PAGE_SECTION === 'calendar';
          const showManage = PAGE_SECTION === 'all' || PAGE_SECTION === 'manage';
          const showOperations = PAGE_SECTION === 'all' || PAGE_SECTION === 'operations';
          const showSettings = PAGE_SECTION === 'all' || PAGE_SECTION === 'settings';
          setVisible('teacherCalendarSection', showCalendar);
          setVisible('teacherManageSection', showManage);
          setVisible('teacherOperationsSection', showOperations);
          setVisible('teacherSettingsSection', showSettings);
          if (showManage) {
            applyTeacherManagePanel();
          }
          if (showOperations) {
            applyTeacherOperationsPanel();
          }
          if (showSettings) {
            applyTeacherSettingsPanel();
          }
        }

        for (const link of sectionLinks) {
          const isActive = String(link.dataset.navSection || '') === PAGE_SECTION;
          link.classList.toggle('active', isActive);
          if (isActive) {
            link.setAttribute('aria-current', 'page');
          } else {
            link.removeAttribute('aria-current');
          }
        }
      }

      function applyTopNavState() {
        const navLinks = Array.from(document.querySelectorAll('.top-links a'));
        const currentPath = String(window.location.pathname || '/').toLowerCase();
        const userRole = String(state.user?.role || '').toUpperCase();
        for (const link of navLinks) {
          const linkType = String(link.dataset.topLink || '').toLowerCase();
          const hideRoleTabs = (userRole === 'TEACHER' || userRole === 'STUDENT') && (linkType === 'student' || linkType === 'teacher');
          link.classList.toggle('hidden', hideRoleTabs);
          if (hideRoleTabs) {
            link.classList.remove('is-active');
            link.removeAttribute('aria-current');
            continue;
          }
          let hrefPath = '';
          try {
            hrefPath = new URL(link.href, window.location.origin).pathname.toLowerCase();
          } catch (_) {
            hrefPath = '';
          }
          const active = hrefPath && (hrefPath === currentPath || (hrefPath === '/index.html' && currentPath === '/'));
          link.classList.toggle('is-active', Boolean(active));
          if (active) {
            link.setAttribute('aria-current', 'page');
          } else {
            link.removeAttribute('aria-current');
          }
        }
      }

      function renderAuth() {
        const loginId = state.user?.login_id || state.user?.email || '-';
        if (state.user) {
          const phone = state.user.phone ? ` / ${state.user.phone}` : '';
          authStatus.textContent = `로그인: ${loginId}${phone} (${state.user.role})`;
          rolePill.textContent = state.user.role === 'TEACHER' ? '선생님 모드' : '학생 모드';
          rolePill.classList.remove('hidden');
        } else if (state.token) {
          authStatus.textContent = '토큰은 있으나 사용자 정보는 미확인 상태입니다.';
          rolePill.classList.add('hidden');
        } else {
          authStatus.textContent = '로그인되지 않았습니다.';
          rolePill.classList.add('hidden');
        }
        document.body.classList.toggle('session-ready', Boolean(state.user));
        if (studentLoginStatus) {
          studentLoginStatus.textContent = `현재 로그인: ${loginId}${state.user?.role ? ` (${state.user.role})` : ''}`;
        }
        if (teacherLoginStatus) {
          teacherLoginStatus.textContent = `현재 로그인: ${loginId}${state.user?.role ? ` (${state.user.role})` : ''}`;
        }

        const role = state.user?.role;
        if (PAGE_MODE === 'TEACHER') {
          teacherView.classList.toggle('hidden', role !== 'TEACHER');
          studentView.classList.add('hidden');
          if (role === 'TEACHER') {
            applyPageSection('TEACHER');
          } else {
            hideTeacherCellDetail();
          }
        } else {
          teacherView.classList.add('hidden');
          studentView.classList.remove('hidden');
          applyPageSection('STUDENT');
          hideTeacherCellDetail();
        }
        renderAccountForms();
        renderStudentTeacherAssignmentState();
        renderStudentAccountTier();
        applyTopNavState();
      }

      function renderAccountForms() {
        const user = state.user || {};
        if (studentProfileForm) {
          studentProfileForm.elements.name.value = String(user.name || '');
          studentProfileForm.elements.phone.value = String(user.phone || '');
        }
        if (studentUpgradeForm) {
          studentUpgradeForm.elements.name.value = String(user.name || '');
          studentUpgradeForm.elements.phone.value = String(user.phone || '');
          if (!studentUpgradeForm.elements.login_id.value) {
            studentUpgradeForm.elements.login_id.value = String(user.login_id || '');
          }
        }
        if (teacherAccountForm) {
          teacherAccountForm.elements.name.value = String(user.name || '');
          teacherAccountForm.elements.phone.value = String(user.phone || '');
        }
      }

      function renderStudentAccountTier() {
        if (!studentAccountTierBadge) return;
        const user = state.user || null;
        if (!user || user.role !== 'STUDENT') {
          studentAccountTierBadge.textContent = '계정 유형: -';
          if (studentUpgradeForm) studentUpgradeForm.classList.add('hidden');
          return;
        }
        const tier = String(user.account_tier || 'FULL').toUpperCase();
        const createdByTeacher = parseOptionalId(user.temp_created_by_teacher_user_id);
        if (tier === 'TEMP') {
          studentAccountTierBadge.textContent = createdByTeacher
            ? `계정 유형: 임시 계정 (생성 선생님 #${createdByTeacher})`
            : '계정 유형: 임시 계정';
          if (studentUpgradeHint) {
            studentUpgradeHint.textContent =
              '정식 전환 후 결제/다중 선생님 연결/개인화 알림 같은 확장 기능을 사용할 수 있습니다.';
          }
          if (studentUpgradeForm) studentUpgradeForm.classList.remove('hidden');
          return;
        }

        studentAccountTierBadge.textContent = '계정 유형: 정식 계정';
        if (studentUpgradeHint) {
          studentUpgradeHint.textContent = '이미 정식 계정입니다.';
        }
        if (studentUpgradeForm) studentUpgradeForm.classList.add('hidden');
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
          if (auth && res.status === 401) {
            setAuth('', null);
            redirectToLoginPage();
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

      async function saveMyProfile(formEl) {
        if (!formEl) return;
        const form = formObject(formEl);
        const result = await api('/api/v1/users/me/profile', {
          method: 'PATCH',
          auth: true,
          body: {
            name: String(form.name || '').trim(),
            phone: String(form.phone || '').trim(),
          },
        });
        if (result?.user) {
          state.user = result.user;
          renderAuth();
        } else {
          await syncMe();
        }
      }

      async function changeMyPassword(formEl) {
        if (!formEl) return;
        const form = formObject(formEl);
        await api('/api/v1/users/me/password', {
          method: 'PATCH',
          auth: true,
          body: {
            current_password: String(form.current_password || ''),
            new_password: String(form.new_password || ''),
          },
        });
        formEl.reset();
      }

      function renderTeachers(items) {
        teacherSelect.innerHTML = '';
        if (!items.length) {
          teacherSelect.innerHTML = '<option value="">(연결된 선생님 없음)</option>';
          state.selectedTeacherId = '';
          teacherSelect.disabled = true;
          renderStudentMeta();
          renderStudentTeacherAssignmentState();
          return;
        }

        for (const teacher of items) {
          const opt = document.createElement('option');
          opt.value = String(teacher.id);
          opt.textContent = `${teacher.name} (#${teacher.id})`;
          teacherSelect.appendChild(opt);
        }

        if (
          PAGE_MODE === 'TEACHER' &&
          state.user?.role === 'TEACHER' &&
          items.some((it) => String(it.id) === String(state.user.id))
        ) {
          state.selectedTeacherId = String(state.user.id);
        } else if (
          state.invitedTeacherId &&
          items.some((it) => String(it.id) === String(state.invitedTeacherId))
        ) {
          state.selectedTeacherId = String(state.invitedTeacherId);
          state.invitedTeacherId = null;
        } else if (!state.selectedTeacherId || !items.some((it) => String(it.id) === String(state.selectedTeacherId))) {
          state.selectedTeacherId = String(items[0].id);
        }
        teacherSelect.value = state.selectedTeacherId;
        teacherSelect.disabled = false;
        renderStudentMeta();
        renderStudentTeacherAssignmentState();
      }

      function renderStudentTeacherSearchResults(items) {
        if (!studentTeacherSearchSelect) return;
        studentTeacherSearchSelect.innerHTML = '';
        if (!Array.isArray(items) || !items.length) {
          const empty = document.createElement('option');
          empty.value = '';
          empty.textContent = '검색 결과가 없습니다.';
          studentTeacherSearchSelect.appendChild(empty);
          studentTeacherSearchSelect.disabled = true;
          renderStudentTeacherAssignmentState();
          return;
        }
        for (const teacher of items) {
          const option = document.createElement('option');
          option.value = String(teacher.id);
          option.textContent = `${teacher.name} (#${teacher.id}, ${teacher.login_id})`;
          studentTeacherSearchSelect.appendChild(option);
        }
        studentTeacherSearchSelect.disabled = false;
        renderStudentTeacherAssignmentState();
      }

      function renderStudentTeacherAssignmentState() {
        if (!studentTeacherAssignHint || state.user?.role !== 'STUDENT') return;
        const assignedTeacherId = parseOptionalId(state.user?.assigned_teacher_user_id);
        const hasInviteTeacher = parseOptionalId(state.invitedTeacherId);
        if (studentTeacherInviteAssignBtn) {
          studentTeacherInviteAssignBtn.classList.toggle('hidden', !hasInviteTeacher);
        }
        if (studentTeacherAssignSelectedBtn) {
          const hasResults = Array.isArray(state.studentTeacherSearchResults) && state.studentTeacherSearchResults.length > 0;
          studentTeacherAssignSelectedBtn.disabled = !hasResults;
        }
        if (assignedTeacherId) {
          studentTeacherAssignHint.textContent =
            `담당 선생님 연결됨: #${assignedTeacherId} (변경하려면 ID/아이디/이름으로 검색 후 다시 연결하세요)`;
          if (studentTeacherClearBtn) studentTeacherClearBtn.disabled = false;
          if (teacherSelect) teacherSelect.disabled = true;
        } else {
          studentTeacherAssignHint.textContent = hasInviteTeacher
            ? `초대된 선생님(#${hasInviteTeacher})이 있습니다. "초대 선생님 연결" 또는 검색으로 연결해 주세요.`
            : '선생님 ID/아이디/이름으로 검색 후 담당 선생님을 연결해 주세요.';
          if (studentTeacherClearBtn) studentTeacherClearBtn.disabled = true;
          if (teacherSelect) teacherSelect.disabled = true;
          if (studentTeacherLookupInput && hasInviteTeacher) {
            studentTeacherLookupInput.value = String(hasInviteTeacher);
          }
        }
      }

      function renderStudentMeta() {
        const teacher = state.teachers.find((t) => String(t.id) === String(state.selectedTeacherId));
        if (!teacher) {
          studentTeacherMeta.textContent = '담당 선생님을 연결해 주세요';
          studentPolicyWindow.textContent = '예약 가능 범위: -';
          studentPolicyCutoff.textContent = '취소 마감: -';
          if (studentTeacherNotice) {
            studentTeacherNotice.textContent = '담당 선생님을 연결하면 공지사항이 표시됩니다.';
          }
          return;
        }

        studentTeacherMeta.textContent = `담당: ${teacher.name} (한국시간 기준)`;
        studentPolicyWindow.textContent = `예약 가능 범위: 오늘부터 ${teacher.booking_window_days}일`;
        const cancelHour = Number.parseInt(teacher.student_cancel_day_before_hour, 10);
        studentPolicyCutoff.textContent = Number.isInteger(cancelHour)
          ? `학생 취소 마감: 수업 전날 ${String(cancelHour).padStart(2, '0')}:00`
          : '학생 취소 마감: 수업 전날 21:00';
        if (studentTeacherNotice) {
          const notice = String(teacher.student_notice || '').trim();
          studentTeacherNotice.textContent = notice || '등록된 공지사항이 없습니다.';
        }
      }

      async function loadTeachers() {
        const result = await api('/api/v1/teachers', { auth: true });
        state.teachers = result.items || [];
        renderTeachers(state.teachers);
      }

      async function searchTeachersForAssignment() {
        if (state.user?.role !== 'STUDENT') return;
        const queryText = String(studentTeacherLookupInput?.value || '').trim();
        const result = await api(`/api/v1/students/me/teachers/search?q=${encodeURIComponent(queryText)}`, { auth: true });
        state.studentTeacherSearchResults = result.items || [];
        renderStudentTeacherSearchResults(state.studentTeacherSearchResults);
        if (state.studentTeacherSearchResults.length === 1 && studentTeacherSearchSelect) {
          studentTeacherSearchSelect.value = String(state.studentTeacherSearchResults[0].id);
        }
      }

      async function assignMyTeacher(options = {}) {
        if (state.user?.role !== 'STUDENT') {
          throw new Error('학생 계정만 담당 선생님을 연결할 수 있습니다.');
        }
        const selectedTeacherId = parseOptionalId(options.teacherUserId || studentTeacherSearchSelect?.value || '');
        const lookup = String(studentTeacherLookupInput?.value || '').trim();
        if (!selectedTeacherId && !lookup) {
          throw new Error('선생님 ID, 아이디, 이름 중 하나를 입력해 주세요.');
        }
        const teacherUserId = parseOptionalId(lookup);
        const body = selectedTeacherId
          ? { teacher_user_id: selectedTeacherId }
          : teacherUserId
            ? { teacher_user_id: teacherUserId }
            : lookup.includes('@')
              ? { teacher_login_id: lookup.toLowerCase() }
              : { teacher_query: lookup.toLowerCase() };
        let result;
        try {
          result = await api('/api/v1/students/me/teacher', {
            method: 'PATCH',
            auth: true,
            body,
          });
        } catch (err) {
          if (err?.payload?.error === 'teacher_ambiguous' && Array.isArray(err?.payload?.candidates)) {
            state.studentTeacherSearchResults = err.payload.candidates;
            renderStudentTeacherSearchResults(state.studentTeacherSearchResults);
          }
          throw err;
        }
        if (result?.user) {
          state.user = result.user;
          renderAuth();
        } else {
          await syncMe();
        }
        if (studentTeacherLookupInput) {
          studentTeacherLookupInput.value = '';
        }
        state.studentTeacherSearchResults = [];
        renderStudentTeacherSearchResults(state.studentTeacherSearchResults);
        state.selectedDateKey = '';
        await loadTeachers();
        await loadSlotsForCurrentMonth();
      }

      async function assignInvitedTeacher() {
        const invitedTeacherId = parseOptionalId(state.invitedTeacherId);
        if (!invitedTeacherId) {
          throw new Error('초대된 선생님 정보가 없습니다.');
        }
        await assignMyTeacher({ teacherUserId: invitedTeacherId });
      }

      async function assignStudentToMeByTeacher() {
        if (state.user?.role !== 'TEACHER') {
          throw new Error('선생님 계정만 사용할 수 있습니다.');
        }
        const lookup = String(teacherAssignStudentForm?.elements?.lookup?.value || '').trim();
        if (!lookup) {
          throw new Error('학생 ID, 로그인ID 또는 이름을 입력해 주세요.');
        }
        const studentUserId = parseOptionalId(lookup);
        const body = studentUserId ? { student_user_id: studentUserId } : { student_query: lookup.toLowerCase() };
        const result = await api('/api/v1/teachers/me/students/assign', {
          method: 'PATCH',
          auth: true,
          body,
        });
        const studentName = String(result?.student?.name || '-');
        const studentLoginId = String(result?.student?.login_id || '-');
        if (teacherTempStudentCreds) {
          teacherTempStudentCreds.textContent = `학생 연결 완료: ${studentName} (${studentLoginId})`;
        }
        if (teacherAssignStudentForm) {
          teacherAssignStudentForm.reset();
        }
        await loadTeacherStudents();
      }

      async function clearMyTeacherAssignment() {
        if (state.user?.role !== 'STUDENT') return;
        const result = await api('/api/v1/students/me/teacher', {
          method: 'DELETE',
          auth: true,
        });
        if (result?.user) {
          state.user = result.user;
          renderAuth();
        } else {
          await syncMe();
        }
        state.selectedTeacherId = '';
        state.selectedDateKey = '';
        state.slotsByDate = {};
        state.studentTeacherSearchResults = [];
        renderStudentTeacherSearchResults(state.studentTeacherSearchResults);
        renderCalendar();
        renderDaySlots();
        renderStudentStats();
        await loadTeachers();
      }

      function renderTeacherStudents(items) {
        if (!teacherStudentsBody) return;
        const list = Array.isArray(items) ? items : [];
        if (!list.length) {
          teacherStudentsBody.innerHTML = '<tr><td colspan="5" class="muted">등록된 학생이 없습니다.</td></tr>';
          return;
        }

        teacherStudentsBody.innerHTML = list
          .map((student) => {
            const tier = String(student.account_tier || 'FULL').toUpperCase();
            const tierLabel = tier === 'TEMP' ? '임시' : '정식';
            return `
              <tr>
                <td>${student.id}</td>
                <td>${escapeHtml(student.login_id || student.email || '-')}</td>
                <td>${escapeHtml(student.name || '-')}</td>
                <td>${tierLabel}</td>
                <td>${formatDateTime(student.created_at)}</td>
              </tr>
            `;
          })
          .join('');
      }

      async function loadTeacherStudents() {
        if (state.user?.role !== 'TEACHER') return;
        const result = await api('/api/v1/teachers/me/students', { auth: true });
        state.teacherStudents = result.items || [];
        renderTeacherStudents(state.teacherStudents);
      }

      async function createTemporaryStudentByTeacher() {
        if (!teacherTempStudentForm) return;
        const form = formObject(teacherTempStudentForm);
        const body = {
          name: String(form.name || '').trim(),
        };
        const loginId = String(form.login_id || '').trim();
        const phone = String(form.phone || '').trim();
        const password = String(form.password || '').trim();
        if (loginId) body.login_id = loginId;
        if (phone) body.phone = phone;
        if (password) body.password = password;

        const result = await api('/api/v1/teachers/me/students/temp', {
          method: 'POST',
          auth: true,
          body,
        });

        if (teacherTempStudentCreds) {
          const creds = result?.temporary_credentials || {};
          const createdUser = result?.user || {};
          teacherTempStudentCreds.textContent =
            `임시 학생 생성 완료 | ID: ${createdUser.id || '-'} | ` +
            `로그인: ${creds.login_id || '-'} | 초기 비밀번호: ${creds.password || '-'}`;
        }
        teacherTempStudentForm.reset();
        await loadTeacherStudents();
      }

      async function upgradeMyStudentAccount() {
        if (!studentUpgradeForm || state.user?.role !== 'STUDENT') return;
        const form = formObject(studentUpgradeForm);
        const result = await api('/api/v1/students/me/upgrade', {
          method: 'POST',
          auth: true,
          body: {
            login_id: String(form.login_id || '').trim(),
            phone: String(form.phone || '').trim(),
            password: String(form.password || ''),
            name: String(form.name || '').trim(),
          },
        });

        if (result?.token) {
          setAuth(result.token, result.user || state.user);
        } else if (result?.user) {
          state.user = result.user;
          renderAuth();
        } else {
          await syncMe();
        }
        studentUpgradeForm.elements.password.value = '';
      }

      function getSlotsForDateKey(dateKey) {
        return state.slotsByDate[dateKey] || [];
      }

      function pickDefaultSelectedDate() {
        if (state.selectedDateKey && getSlotsForDateKey(state.selectedDateKey).length) return;

        const keys = Object.keys(state.slotsByDate).sort();
        const firstWithOpen = keys.find((key) => getSlotsForDateKey(key).some((it) => it.is_available));
        state.selectedDateKey = firstWithOpen || keys[0] || '';
      }

      function renderStudentStats() {
        const allSlots = Object.values(state.slotsByDate).flat();
        const openSlots = allSlots.filter((slot) => slot.is_available);
        const activeBookings = (state.studentBookings || []).filter((booking) =>
          ['PENDING', 'BOOKED'].includes(booking.status)
        );

        studentTotalSlots.textContent = String(allSlots.length);
        studentOpenSlots.textContent = String(openSlots.length);
        studentActiveBookings.textContent = String(activeBookings.length);
      }

      function renderTeacherStats() {
        const activeWeekly = (state.teacherAvailability || []).filter((row) => row.is_active);
        const activeOneTime = (state.teacherOneTimeAvailability || []).filter((row) => row.is_active);
        const activeTeacherBookings = state.teacherActiveBookings || [];

        teacherAvailCount.textContent = String(activeWeekly.length + activeOneTime.length);
        teacherExceptionCount.textContent = String((state.teacherExceptions || []).length);
        teacherActiveBookingCount.textContent = String(activeTeacherBookings.length);
      }

      function buildWeekDays(cursorDate) {
        const start = startOfWeek(cursorDate);
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          return d;
        });
      }

      function renderStudentWeekCalendar() {
        monthLabel.textContent = formatWeekLabel(state.monthCursor);
        const days = buildWeekDays(state.monthCursor);
        const now = new Date();
        const todayKey = toDateKeyFromDate(now);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const step = Math.max(10, Number.parseInt(studentGridStep.value || state.studentGridStepMin, 10) || 60);
        state.studentGridStepMin = step;

        const slotsByDate = new Map();
        for (const [dateKey, slots] of Object.entries(state.slotsByDate || {})) {
          const list = [];
          for (const slot of slots) {
            const startDate = new Date(slot.start_at);
            const endDate = new Date(slot.end_at);
            if (Number.isNaN(startDate.getTime())) continue;
            let startMinute = startDate.getHours() * 60 + startDate.getMinutes();
            let endMinute = Number.isNaN(endDate.getTime())
              ? startMinute + (Number.parseInt(slot.duration_min, 10) || step)
              : endDate.getHours() * 60 + endDate.getMinutes();
            if (!Number.isInteger(endMinute) || endMinute <= startMinute) {
              endMinute = startMinute + step;
            }
            list.push({
              startMinute,
              endMinute,
              slot,
            });
          }
          list.sort((a, b) => a.startMinute - b.startMinute);
          slotsByDate.set(dateKey, list);
        }

        let rows = '';
        for (let minute = 0; minute < 24 * 60; minute += step) {
          const bucketEnd = minute + step;
          let cells = '';
          for (const day of days) {
            const dateKey = toDateKeyFromDate(day);
            const holidayName = state.holidaysByDate[dateKey] || '';
            const daySlots = slotsByDate.get(dateKey) || [];
            const overlapEntries = daySlots.filter((item) => item.startMinute < bucketEnd && item.endMinute > minute);
            const hasAvailable = overlapEntries.some((item) => item.slot?.is_available);
            const hasDisplayableBooked = !state.availableOnly && overlapEntries.some((item) => !item.slot?.is_available);
            const startAvailableEntry =
              overlapEntries.find(
                (item) => item.slot?.is_available && item.startMinute >= minute && item.startMinute < bucketEnd
              ) || null;
            const startBookedEntry =
              overlapEntries.find(
                (item) => !item.slot?.is_available && item.startMinute >= minute && item.startMinute < bucketEnd
              ) || null;
            const classes = ['week-cell'];
            if (dateKey === state.selectedDateKey) classes.push('selected');
            if (dateKey < todayKey || (dateKey === todayKey && minute < nowMinutes)) classes.push('past');
            if (hasAvailable) classes.push('has-available');
            else if (hasDisplayableBooked) classes.push('has-booked');
            if (holidayName) classes.push('holiday');

            let content = `<button type="button" class="week-create-btn" data-pick-date="${dateKey}">+</button>`;
            if (startAvailableEntry?.slot) {
              const slot = startAvailableEntry.slot;
              const slotTitle = (slot.lesson_title || '').trim();
              const label = slotTitle || '수강신청';
              const duration = Number.parseInt(slot.duration_min, 10) || step;
              content = `<button type="button" class="week-slot-btn available" data-book-slot="${slot.start_at}" data-book-duration="${duration}" data-pick-date="${dateKey}" title="${escapeHtml(slotTitle || '예약 가능')}">${escapeHtml(label)}</button>`;
            } else if (startBookedEntry?.slot && !state.availableOnly) {
              content = '<span class="week-booked-chip">마감</span>';
            } else if (overlapEntries.length && state.availableOnly && !hasAvailable) {
              content = '';
            }

            cells += `<td class="${classes.join(' ')}" data-pick-date="${dateKey}">${content}</td>`;
          }
          rows += `<tr><th scope="row" class="week-time">${timeLabelFromMinutes(minute)}</th>${cells}</tr>`;
        }

        const header = days
          .map((day, index) => {
            const dateKey = toDateKeyFromDate(day);
            const isToday = dateKey === todayKey;
            const holidayName = state.holidaysByDate[dateKey] || '';
            const classes = ['week-day-head'];
            if (holidayName) classes.push('holiday');
            return `<th scope="col" class="${classes.join(' ')}"><strong>${WEEKDAY_LABELS[index]}${isToday ? ' · 오늘' : ''}</strong>${day.getMonth() + 1}/${day.getDate()}${holidayName ? `<span class="holiday-caption">${escapeHtml(holidayName)}</span>` : ''}</th>`;
          })
          .join('');

        calendarGrid.innerHTML = `
          <table class="week-table">
            <thead>
              <tr>
                <th scope="col" class="week-time-head">시간</th>
                ${header}
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        `;
      }

      function renderStudentMonthCalendar() {
        monthLabel.textContent = formatMonthLabel(state.monthCursor);
        const { from } = monthGridRange(state.monthCursor);
        const todayKey = toDateKeyFromDate(new Date());
        const myBookingByDate = new Map();
        for (const booking of state.studentBookings || []) {
          const dateKey = toDateKeyFromIso(booking.start_at);
          if (!dateKey) continue;
          myBookingByDate.set(dateKey, (myBookingByDate.get(dateKey) || 0) + 1);
        }

        const weeks = [];
        for (let week = 0; week < 6; week += 1) {
          const row = [];
          for (let day = 0; day < 7; day += 1) {
            const date = new Date(from);
            date.setDate(from.getDate() + week * 7 + day);
            row.push(date);
          }
          weeks.push(row);
        }

        const currentMonth = startOfMonth(state.monthCursor).getMonth();
        const header = WEEKDAY_LABELS.map((label) => `<th scope="col" class="month-day-head">${label}</th>`).join('');
        const bodyRows = weeks
          .map((week) => {
            const tds = week
              .map((date) => {
                const dateKey = toDateKeyFromDate(date);
                const slots = getSlotsForDateKey(dateKey);
                const openCount = slots.filter((slot) => slot.is_available).length;
                const bookedCount = slots.length - openCount;
                const myCount = myBookingByDate.get(dateKey) || 0;
                const holidayName = state.holidaysByDate[dateKey] || '';
                const classes = ['month-cell'];
                if (date.getMonth() !== currentMonth) classes.push('out-month');
                if (dateKey === todayKey) classes.push('today');
                if (dateKey === state.selectedDateKey) classes.push('selected');
                if (openCount > 0) classes.push('has-available');
                if (bookedCount > 0) classes.push('has-booked');
                if (myCount > 0) classes.push('has-my-booking');
                if (holidayName) classes.push('holiday');
                return `
                  <td class="${classes.join(' ')}" data-pick-date="${dateKey}">
                    <div class="month-date">${date.getDate()}</div>
                    ${holidayName ? `<div class="month-holiday">${escapeHtml(holidayName)}</div>` : ''}
                    <div class="month-metrics">
                      <span class="metric open">가능 ${openCount}</span>
                      <span class="metric close">마감 ${bookedCount}</span>
                      <span class="metric mine">내예약 ${myCount}</span>
                    </div>
                  </td>
                `;
              })
              .join('');
            return `<tr>${tds}</tr>`;
          })
          .join('');

        calendarGrid.innerHTML = `
          <table class="month-table">
            <thead><tr>${header}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        `;
      }

      function renderCalendar() {
        applyStudentCalendarViewUi();
        if (state.studentCalendarView === 'month') {
          renderStudentMonthCalendar();
        } else {
          renderStudentWeekCalendar();
        }

        calendarGrid.onclick = (event) => {
          const bookButton = event.target.closest('[data-book-slot]');
          if (bookButton) {
            const startAt = bookButton.getAttribute('data-book-slot');
            const durationMin = Number.parseInt(bookButton.getAttribute('data-book-duration') || '', 10);
            const pickDate = bookButton.getAttribute('data-pick-date');
            if (pickDate) state.selectedDateKey = pickDate;
            runAction('수강신청', async () => {
              if (!confirmBookingRequest(startAt, durationMin)) return;
              await createBooking(startAt, durationMin);
              await loadSlotsForCurrentMonth();
              await loadMyBookings();
            });
            return;
          }

          const pickTarget = event.target.closest('[data-pick-date]');
          if (!pickTarget) return;
          const pickedDateKey = String(pickTarget.getAttribute('data-pick-date') || '').trim();
          if (!pickedDateKey) return;
          if (state.studentCalendarView === 'month') {
            runAction('해당 주 열기', async () => {
              state.selectedDateKey = pickedDateKey;
              const picked = parseDateKey(pickedDateKey);
              if (!Number.isNaN(picked.getTime())) {
                state.monthCursor = picked;
              }
              state.studentCalendarView = 'week';
              applyStudentCalendarViewUi();
              await loadSlotsForCurrentMonth();
              state.selectedDateKey = pickedDateKey;
              renderCalendar();
              renderDaySlots();
            });
            return;
          }
          state.selectedDateKey = pickedDateKey;
          renderCalendar();
          renderDaySlots();
        };
      }

      function renderDaySlots() {
        daySlotsList.innerHTML = '';
        if (!state.selectedDateKey) {
          selectedDateLabel.textContent = '선택 가능한 날짜가 없습니다.';
          daySlotSummary.textContent = '총 0개 · 예약 가능 0개 · 마감 0개';
          daySlotsList.innerHTML = '<div class="hint">캘린더 범위를 조정하거나 선생님을 변경해보세요.</div>';
          return;
        }

        const date = parseDateKey(state.selectedDateKey);
        selectedDateLabel.textContent = `${date.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })}`;

        const slots = [...getSlotsForDateKey(state.selectedDateKey)]
          .filter((slot) => (state.availableOnly ? slot.is_available : true))
          .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
        const openCount = slots.filter((slot) => slot.is_available).length;
        const closedCount = slots.length - openCount;
        daySlotSummary.textContent = `총 ${slots.length}개 · 예약 가능 ${openCount}개 · 마감 ${closedCount}개`;

        if (!slots.length) {
          daySlotsList.innerHTML = '<div class="hint">선택 조건에 맞는 슬롯이 없습니다.</div>';
          return;
        }

        for (const slot of slots) {
          const row = document.createElement('div');
          row.className = `slot-item ${slot.is_available ? '' : 'booked'}`;
          const isInvitedSlot = Boolean(state.invitedStartAtIso) && String(slot.start_at) === String(state.invitedStartAtIso);
          const activeMyBooking = (state.studentBookings || []).find(
            (booking) =>
              String(booking.start_at) === String(slot.start_at) &&
              ['PENDING', 'BOOKED'].includes(String(booking.status || ''))
          );
          const canCancelMyBooking = Boolean(activeMyBooking);
          if (isInvitedSlot) {
            row.style.outline = '2px solid #D9543A';
            row.style.outlineOffset = '2px';
          }

          const info = document.createElement('div');
          const slotTitle = escapeHtml(slot.lesson_title || '일반 수업');
          const invitedBadge = isInvitedSlot ? ' · <span class="status-badge status-TRUE">공유 링크</span>' : '';
          info.innerHTML = `<strong>${formatTime(slot.start_at)} - ${formatTime(slot.end_at)}</strong><br /><small>${slotTitle} · ${slot.is_available ? '<span class="status-badge status-AVAILABLE">예약 가능</span>' : '이미 예약됨'}${invitedBadge}</small>`;

          const action = document.createElement('button');
          action.type = 'button';
          if (canCancelMyBooking) {
            action.textContent = '예약 취소';
            action.className = 'danger';
            action.disabled = false;
          } else {
            action.textContent = slot.is_available ? (isInvitedSlot ? '공유 레슨 예약' : '예약') : '예약됨';
            action.disabled = !slot.is_available;
            if (slot.is_available) action.className = 'primary';
          }

          action.addEventListener('click', () => {
            if (canCancelMyBooking && activeMyBooking?.id) {
              runAction('내 예약 취소', async () => {
                const ok = window.confirm('이 예약을 취소할까요?');
                if (!ok) return;
                await cancelBooking(activeMyBooking.id);
                await loadMyBookings();
                await loadSlotsForCurrentMonth();
              });
              return;
            }

            runAction('예약 생성', async () => {
              const durationMin = Number.parseInt(slot.duration_min, 10) || state.studentGridStepMin;
              if (!confirmBookingRequest(slot.start_at, durationMin)) return;
              await createBooking(slot.start_at, durationMin);
              await loadSlotsForCurrentMonth();
              await loadMyBookings();
            });
          });

          const actionWrap = document.createElement('div');
          actionWrap.className = 'actions';
          actionWrap.appendChild(action);
          if (isInvitedSlot && !canCancelMyBooking) {
            const rejectBtn = document.createElement('button');
            rejectBtn.type = 'button';
            rejectBtn.textContent = '거절';
            rejectBtn.addEventListener('click', () => {
              const next = new URL(window.location.href);
              next.searchParams.delete('start_at');
              window.history.replaceState({}, '', `${next.pathname}${next.search}${next.hash}`);
              state.invitedStartAtIso = '';
              showToast('공유 레슨 제안을 거절했습니다.');
              renderCalendar();
              renderDaySlots();
            });
            actionWrap.appendChild(rejectBtn);
          }

          row.appendChild(info);
          row.appendChild(actionWrap);
          daySlotsList.appendChild(row);
        }
      }

      async function loadSlotsForCurrentMonth() {
        const teacherId = parseOptionalId(teacherSelect.value || state.selectedTeacherId);
        if (!teacherId) {
          state.slotsByDate = {};
          state.selectedDateKey = '';
          renderCalendar();
          renderDaySlots();
          renderStudentStats();
          renderTeacherOpenSlotList();
          return;
        }
        const isTeacherMode = PAGE_MODE === 'TEACHER' && state.user?.role === 'TEACHER';
        const { from, to } = isTeacherMode ? currentTeacherCalendarRange() : currentStudentCalendarRange();
        await ensureHolidayCacheForRange(from, to);
        const stepMinForQuery = isTeacherMode ? state.teacherGridStepMin || 30 : state.studentGridStepMin || 30;

        const result = await api(
          `/api/v1/teachers/${teacherId}/slots?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&step_min=${encodeURIComponent(String(stepMinForQuery))}`,
          {}
        );

        const grouped = {};
        for (const slot of result.items || []) {
          const key = toDateKeyFromIso(slot.start_at);
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(slot);
        }

        state.slotsByDate = grouped;
        const invitedSlotDateKey = state.invitedStartAtIso ? toDateKeyFromIso(state.invitedStartAtIso) : '';
        if (invitedSlotDateKey && grouped[invitedSlotDateKey]?.length) {
          state.selectedDateKey = invitedSlotDateKey;
        } else {
          const today = new Date();
          if (today >= from && today < to) {
            state.selectedDateKey = toDateKeyFromDate(today);
          }
        }
        pickDefaultSelectedDate();
        renderCalendar();
        renderDaySlots();
        renderStudentStats();
        renderTeacherOpenSlotList();
      }

      async function loadTeacherProfile() {
        const result = await api('/api/v1/teachers/me/profile', { auth: true });
        state.teacherProfile = result.item || null;
        renderTeacherProfileForm();
      }

      function renderTeacherMonthCalendar() {
        teacherWeekLabel.textContent = formatMonthLabel(state.teacherWeekCursor);
        const { from } = monthGridRange(state.teacherWeekCursor);
        const todayKey = toDateKeyFromDate(new Date());
        const activeBookingByDate = new Map();
        for (const booking of state.teacherBookings || []) {
          const status = String(booking.status || '').toUpperCase();
          if (!['PENDING', 'BOOKED'].includes(status)) continue;
          const dateKey = toDateKeyFromIso(booking.start_at);
          if (!dateKey) continue;
          activeBookingByDate.set(dateKey, (activeBookingByDate.get(dateKey) || 0) + 1);
        }

        const weeks = [];
        for (let week = 0; week < 6; week += 1) {
          const row = [];
          for (let day = 0; day < 7; day += 1) {
            const date = new Date(from);
            date.setDate(from.getDate() + week * 7 + day);
            row.push(date);
          }
          weeks.push(row);
        }

        const currentMonth = startOfMonth(state.teacherWeekCursor).getMonth();
        const header = WEEKDAY_LABELS.map((label) => `<th scope="col" class="month-day-head">${label}</th>`).join('');
        const bodyRows = weeks
          .map((week) => {
            const tds = week
              .map((date) => {
                const dateKey = toDateKeyFromDate(date);
                const slots = getSlotsForDateKey(dateKey);
                const openCount = slots.filter((slot) => slot.is_available).length;
                const bookedCount = slots.length - openCount;
                const activeBookingCount = activeBookingByDate.get(dateKey) || 0;
                const holidayName = state.holidaysByDate[dateKey] || '';
                const classes = ['month-cell'];
                if (date.getMonth() !== currentMonth) classes.push('out-month');
                if (dateKey === todayKey) classes.push('today');
                if (openCount > 0) classes.push('has-available');
                if (bookedCount > 0) classes.push('has-booked');
                if (holidayName) classes.push('holiday');
                return `
                  <td class="${classes.join(' ')}" data-pick-teacher-date="${dateKey}">
                    <div class="month-date">${date.getDate()}</div>
                    ${holidayName ? `<div class="month-holiday">${escapeHtml(holidayName)}</div>` : ''}
                    <div class="month-metrics">
                      <span class="metric open">오픈 ${openCount}</span>
                      <span class="metric close">마감 ${bookedCount}</span>
                      <span class="metric mine">예약 ${activeBookingCount}</span>
                    </div>
                  </td>
                `;
              })
              .join('');
            return `<tr>${tds}</tr>`;
          })
          .join('');

        teacherCalendarGrid.innerHTML = `
          <table class="month-table">
            <thead><tr>${header}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        `;
      }

      function renderTeacherCalendar() {
        applyTeacherCalendarViewUi();
        if (state.teacherCalendarView === 'month') {
          renderTeacherMonthCalendar();
          hideTeacherCellDetail();
          renderTeacherDragHint(null);
          teacherCalendarGrid.onmousedown = null;
          teacherCalendarGrid.onmousemove = null;
          teacherCalendarGrid.onmouseleave = null;
          teacherCalendarGrid.ontouchstart = null;
          teacherCalendarGrid.ontouchmove = null;
          teacherCalendarGrid.ontouchend = null;
          teacherCalendarGrid.onclick = (event) => {
            const pickTarget = event.target.closest('[data-pick-teacher-date]');
            if (!pickTarget) return;
            const dateKey = String(pickTarget.getAttribute('data-pick-teacher-date') || '').trim();
            if (!dateKey) return;
            const picked = parseDateKey(dateKey);
            if (Number.isNaN(picked.getTime())) return;
            runAction('해당 주 열기', async () => {
              state.teacherWeekCursor = picked;
              state.monthCursor = new Date(picked);
              state.teacherCalendarView = 'week';
              applyTeacherCalendarViewUi();
              const { from, to } = currentTeacherCalendarRange();
              await ensureHolidayCacheForRange(from, to);
              await loadSlotsForCurrentMonth();
              renderTeacherCalendar();
            });
          };
          updateTeacherTouchGuide();
          return;
        }
        teacherWeekLabel.textContent = formatWeekLabel(state.teacherWeekCursor);
        const days = buildWeekDays(state.teacherWeekCursor);
        const now = new Date();
        const todayKey = toDateKeyFromDate(now);
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const step = getTeacherGridStepMinutes();
        state.teacherGridStepMin = step;
        const touchAnchor = state.teacherTouch.rangeAnchor;

        const activeAvailability = (state.teacherAvailability || []).filter((row) => row.is_active);
        const activeOneTimeAvailability = (state.teacherOneTimeAvailability || []).filter((row) => row.is_active);
        const availabilityById = new Map((state.teacherAvailability || []).map((row) => [Number(row.id), row]));
        const oneTimeByDate = new Map();
        for (const row of activeOneTimeAvailability) {
          const dateKey = String(row.date_local || '').trim();
          if (!dateKey) continue;
          if (!oneTimeByDate.has(dateKey)) {
            oneTimeByDate.set(dateKey, []);
          }
          oneTimeByDate.get(dateKey).push(row);
        }
        const exceptionsByDateKey = new Map();
        for (const ex of state.teacherExceptions || []) {
          const dateKey = String(ex.date_local || '').trim();
          if (!dateKey) continue;
          if (!exceptionsByDateKey.has(dateKey)) {
            exceptionsByDateKey.set(dateKey, []);
          }
          exceptionsByDateKey.get(dateKey).push(ex);
        }
        const bookingBlocksByDate = new Map();
        for (const row of state.teacherBookings || []) {
          const rowStatus = String(row.status || '');
          const startDate = new Date(row.start_at);
          if (Number.isNaN(startDate.getTime())) continue;
          const endDateCandidate = new Date(row.end_at);
          const durationMin = Number.parseInt(row.duration_min, 10) || step;
          const endDate = Number.isNaN(endDateCandidate.getTime())
            ? new Date(startDate.getTime() + durationMin * 60 * 1000)
            : endDateCandidate;
          const shouldBlock = rowStatus === 'PENDING' || rowStatus === 'BOOKED' || rowStatus === 'COMPLETED';
          if (!shouldBlock) continue;

          const dateKey = toDateKeyFromDate(startDate);
          const startMinute = startDate.getHours() * 60 + startDate.getMinutes();
          const endMinute = endDate.getHours() * 60 + endDate.getMinutes();
          if (!bookingBlocksByDate.has(dateKey)) {
            bookingBlocksByDate.set(dateKey, []);
          }
          bookingBlocksByDate.get(dateKey).push({
            id: Number(row.id),
            startMinute,
            endMinute: endMinute > startMinute ? endMinute : startMinute + step,
            status: rowStatus,
            booking: row,
          });
        }
        for (const items of bookingBlocksByDate.values()) {
          items.sort((a, b) => a.startMinute - b.startMinute);
        }

        let rows = '';
        const dragPreview = getTeacherDragPreview();
        for (let minute = 0; minute < 24 * 60; minute += step) {
          const bucketEnd = minute + step;
          let cells = '';
          for (const day of days) {
            const dateKey = toDateKeyFromDate(day);
            const weekday = day.getDay();
            const holidayName = state.holidaysByDate[dateKey] || '';
            const weeklyWindows = activeAvailability
              .filter((row) => Number(row.weekday) === weekday)
              .map((row) => ({ ...row, source: 'weekly' }));
            const oneTimeWindows = (oneTimeByDate.get(dateKey) || []).map((row) => ({ ...row, source: 'one_time' }));
            const windows = [...oneTimeWindows, ...weeklyWindows];
            const dayExceptions = exceptionsByDateKey.get(dateKey) || [];
            const dayBookings = bookingBlocksByDate.get(dateKey) || [];
            let windowAtStartInfo = null;
            const windowOverlaps = [];
            let hasWindow = false;
            const isAllDayException = dayExceptions.some((ex) => !ex.start_time_local && !ex.end_time_local);
            let hasException = isAllDayException;
            let exceptionAtStart = null;
            const exceptionOverlaps = [];

            for (const row of windows) {
              const startMin = minutesFromTimeLocal(row.start_time_local);
              const endMin = minutesFromTimeLocal(row.end_time_local);
              if (startMin === null || endMin === null) continue;
              if (minute < endMin && bucketEnd > startMin) {
                hasWindow = true;
                windowOverlaps.push({ row, startMin, endMin });
              }
              if (!windowAtStartInfo && startMin >= minute && startMin < bucketEnd) {
                windowAtStartInfo = { row, startMin, endMin };
              }
            }

            if (!isAllDayException) {
              for (const ex of dayExceptions) {
                const exStart = minutesFromTimeLocal(ex.start_time_local);
                const exEnd = minutesFromTimeLocal(ex.end_time_local);
                if (exStart === null || exEnd === null) continue;
                if (minute < exEnd && bucketEnd > exStart) {
                  hasException = true;
                  exceptionOverlaps.push(ex);
                  if (!exceptionAtStart && exStart >= minute && exStart < bucketEnd) {
                    exceptionAtStart = ex;
                  }
                }
              }
            } else if (minute === 0) {
              exceptionAtStart = dayExceptions.find((ex) => !ex.start_time_local && !ex.end_time_local) || null;
            }
            if (isAllDayException) {
              const allDay = dayExceptions.find((ex) => !ex.start_time_local && !ex.end_time_local);
              if (allDay) {
                exceptionOverlaps.push(allDay);
              }
            }

            const bookingOverlaps = dayBookings.filter(
              (item) => item.startMinute < bucketEnd && item.endMinute > minute
            );
            const bookingStart =
              bookingOverlaps.find((item) => item.startMinute >= minute && item.startMinute < bucketEnd) || null;
            const bookingPrimary = bookingStart || bookingOverlaps[0] || null;
            const windowAtStart = windowAtStartInfo?.row || null;
            const windowPrimaryInfo = windowAtStartInfo || windowOverlaps[0] || null;
            const exceptionPrimary = exceptionAtStart || exceptionOverlaps[0] || null;
            const bookingStatusAtStart = bookingStart?.status || null;
            const hasBlockedBooking = bookingOverlaps.length > 0;
            const isBookedStart = Boolean(bookingStatusAtStart);
            const classes = ['week-cell', 'week-teacher-cell'];
            if (hasBlockedBooking) classes.push('has-booking');
            if (hasWindow) classes.push('has-window');
            if (hasException) classes.push('has-exception');
            if (holidayName) classes.push('holiday');
            if (dateKey < todayKey || (dateKey === todayKey && minute < nowMinutes)) classes.push('past');
            if (
              dragPreview &&
              dragPreview.dateKey === dateKey &&
              minute >= dragPreview.startMinute &&
              minute <= dragPreview.endMinute
            ) {
              classes.push('drag-range');
            }
            if (
              state.teacherDrag &&
              dateKey ===
                (state.teacherDrag.mode === 'move' ? state.teacherDrag.currentDateKey : state.teacherDrag.dateKey) &&
              minute ===
                (state.teacherDrag.mode === 'move' ? state.teacherDrag.currentMinute : state.teacherDrag.startMinute)
            ) {
              classes.push('drag-anchor');
            }
            if (touchAnchor && touchAnchor.dateKey === dateKey && touchAnchor.minute === minute) {
              classes.push('touch-anchor');
            }

            const createLabel = state.teacherCreateType === 'exception' ? '■' : '+';
            let content = `<button type="button" class="week-create-btn" data-create-teacher-slot="${dateKey}|${minute}" title="${state.teacherCreateType === 'exception' ? '불가 일정 생성' : '수업 오픈'}">${createLabel}</button>`;
            if (isBookedStart) {
              content =
                bookingStatusAtStart === 'PENDING'
                  ? '<span class="week-booked-chip">대기</span>'
                  : bookingStatusAtStart === 'COMPLETED'
                    ? '<span class="week-booked-chip">완료</span>'
                  : '<span class="week-booked-chip">예약</span>';
            } else if (hasBlockedBooking) {
              content = '';
            } else if (exceptionAtStart) {
              const exReason = escapeHtml((exceptionAtStart.reason || '').trim() || '불가');
              content = `<span class="week-exception-chip" title="${exReason}">불가</span>`;
            } else if (windowAtStart) {
              const title = escapeHtml((windowAtStart.lesson_title || '').trim() || '오픈');
              if (windowAtStart.source === 'one_time') {
                content = `<span class="week-one-time-window" title="단일 오픈">${title}</span>`;
              } else {
                content = `<button type="button" class="week-teacher-window" data-fill-availability-id="${windowAtStart.id}" data-drag-availability-id="${windowAtStart.id}" title="${title}">${title}</button>`;
              }
            } else if (hasWindow) {
              const overlapTitle = escapeHtml((windowPrimaryInfo?.row?.lesson_title || '').trim() || '오픈');
              content = `<span class="week-open-chip" title="${overlapTitle}">오픈</span>`;
            } else if (hasException) {
              content = '';
            }

            const dataAttrs = [`data-date-key="${dateKey}"`, `data-minute="${minute}"`];
            if (bookingPrimary?.id) {
              dataAttrs.push(`data-cell-booking-id="${bookingPrimary.id}"`);
            }
            if (windowPrimaryInfo?.row?.id) {
              dataAttrs.push(`data-cell-window-id="${windowPrimaryInfo.row.id}"`);
            }
            if (windowPrimaryInfo?.row?.source) {
              dataAttrs.push(`data-cell-window-source="${windowPrimaryInfo.row.source}"`);
            }
            if (Number.isInteger(windowPrimaryInfo?.startMin)) {
              dataAttrs.push(`data-cell-window-start-minute="${windowPrimaryInfo.startMin}"`);
            }
            if (exceptionPrimary?.id) {
              dataAttrs.push(`data-cell-exception-id="${exceptionPrimary.id}"`);
            }

            cells += `<td class="${classes.join(' ')}" ${dataAttrs.join(' ')}>${content}</td>`;
          }
          rows += `<tr data-time-minute="${minute}"><th scope="row" class="week-time">${timeLabelFromMinutes(minute)}</th>${cells}</tr>`;
        }

        const header = days
          .map((day, index) => {
            const dateKey = toDateKeyFromDate(day);
            const isToday = dateKey === todayKey;
            const holidayName = state.holidaysByDate[dateKey] || '';
            const classes = ['week-day-head'];
            if (holidayName) classes.push('holiday');
            return `<th scope="col" class="${classes.join(' ')}"><strong>${WEEKDAY_LABELS[index]}${isToday ? ' · 오늘' : ''}</strong>${day.getMonth() + 1}/${day.getDate()}${holidayName ? `<span class="holiday-caption">${escapeHtml(holidayName)}</span>` : ''}</th>`;
          })
          .join('');

        teacherCalendarGrid.innerHTML = `
          <table class="week-table">
            <thead>
              <tr>
                <th scope="col" class="week-time-head">시간</th>
                ${header}
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        `;
        renderTeacherDragHint(dragPreview);
        updateTeacherTouchGuide();

        teacherCalendarGrid.onclick = (event) => {
          if (Date.now() - state.teacherDragEndedAt < 220) return;
          if (Date.now() - Number(state.teacherTouch.lastOpenAt || 0) < 380) return;
          const createTarget = event.target.closest('[data-create-teacher-slot]');
          if (createTarget) {
            const value = String(createTarget.getAttribute('data-create-teacher-slot') || '');
            const [dateKey, minuteText] = value.split('|');
            const minute = Number.parseInt(minuteText || '', 10);
            if (dateKey && Number.isInteger(minute)) {
              const endMinuteExclusive = Math.min(24 * 60, minute + step);
              const preview = {
                mode: 'create',
                dateKey,
                weekday: parseDateKey(dateKey).getDay(),
                startMinute: minute,
                endMinute: endMinuteExclusive - step,
                endMinuteExclusive,
                durationMin: endMinuteExclusive - minute,
              };
              if (state.teacherCreateType === 'exception') {
                openTeacherExceptionModal(preview);
              } else {
                openTeacherCreateModal(preview);
              }
            }
            return;
          }

          const cellMeta = getCellMetaFromEventTarget(event.target);
          if (!cellMeta) return;
          openTeacherCellDetailsFromCell(cellMeta.cell, { dateKey: cellMeta.dateKey, minute: cellMeta.minute });
        };

        const finalizeTeacherDrag = () => {
          const drag = state.teacherDrag;
          const preview = getTeacherDragPreview(drag);
          state.teacherDrag = null;
          state.teacherDragEndedAt = Date.now();
          renderTeacherCalendar();
          if (!drag || !preview) return;
          if (!drag.moved && preview.mode !== 'create') {
            if (drag.sourceCell) {
              openTeacherCellDetailsFromCell(drag.sourceCell, {
                dateKey: drag.sourceDateKey,
                minute: drag.sourceMinute,
              });
            }
            return;
          }

          const startTime = timeLabelFromMinutes(preview.startMinute);
          const endTime = timeLabelFromMinutes(preview.endMinuteExclusive);

          if (preview.mode === 'create') {
            if (state.teacherCreateType === 'exception') {
              openTeacherExceptionModal(preview);
            } else {
              openTeacherCreateModal(preview);
            }
            return;
          }

          const noChange =
            preview.weekday === preview.originalWeekday &&
            preview.startMinute === preview.originalStartMinute &&
            preview.endMinuteExclusive === preview.originalEndMinuteExclusive;
          if (noChange) return;

          runAction('클래스 수정', async () => {
            const actionText = preview.mode === 'move' ? '이동' : '길이조절';
            const ok = window.confirm(`${actionText}: ${preview.dateKey} ${startTime}-${endTime}로 변경할까요?`);
            if (!ok) return;
            await api(`/api/v1/teachers/me/availability/${preview.availabilityId}`, {
              method: 'PATCH',
              auth: true,
              body: {
                weekday: preview.weekday,
                start_time_local: startTime,
                end_time_local: endTime,
                is_active: preview.isActive,
              },
            });
            await loadTeacherAvailability();
            await loadTeachers();
            await loadSlotsForCurrentMonth();
          });
        };

        const startTeacherDrag = ({ meta, target, clientX, clientY, shiftResize = false }) => {
          if (!meta) return false;
          state.teacherTouch.rangeAnchor = null;
          const dragAvailabilityTarget = target?.closest?.('[data-drag-availability-id]');
          if (dragAvailabilityTarget) {
            const availabilityId = Number.parseInt(
              dragAvailabilityTarget.getAttribute('data-drag-availability-id') || '',
              10
            );
            const row = availabilityById.get(availabilityId);
            const rowStartMinute = minutesFromTimeLocal(row?.start_time_local);
            const rowEndMinuteExclusive = minutesFromTimeLocal(row?.end_time_local);
            if (!row || rowStartMinute === null || rowEndMinuteExclusive === null) return false;
            const mode = shiftResize ? 'resize' : 'move';
            state.teacherDrag = {
              mode,
              availabilityId,
              dateKey: meta.dateKey,
              startMinute: rowStartMinute,
              currentDateKey: meta.dateKey,
              currentMinute: mode === 'resize' ? rowEndMinuteExclusive - step : meta.minute,
              originalWeekday: Number(row.weekday),
              originalStartMinute: rowStartMinute,
              originalEndMinuteExclusive: rowEndMinuteExclusive,
              originalDuration: rowEndMinuteExclusive - rowStartMinute,
              isActive: Boolean(row.is_active),
              step,
              moved: false,
              sourceCell: meta.cell,
              sourceDateKey: meta.dateKey,
              sourceMinute: meta.minute,
              pointerX: clientX,
              pointerY: clientY,
            };
          } else {
            const hasExistingData =
              Boolean(meta.cell?.getAttribute?.('data-cell-booking-id')) ||
              Boolean(meta.cell?.getAttribute?.('data-cell-window-id')) ||
              Boolean(meta.cell?.getAttribute?.('data-cell-exception-id'));
            if (hasExistingData) {
              return false;
            }
            state.teacherDrag = {
              mode: 'create',
              dateKey: meta.dateKey,
              startMinute: meta.minute,
              currentDateKey: meta.dateKey,
              currentMinute: meta.minute,
              step,
              moved: false,
              sourceCell: meta.cell,
              sourceDateKey: meta.dateKey,
              sourceMinute: meta.minute,
              pointerX: clientX,
              pointerY: clientY,
            };
          }
          renderTeacherCalendar();
          return true;
        };

        const openTeacherCreateFromCell = ({ dateKey, minute, cell }) => {
          if (!dateKey || !Number.isInteger(minute)) return;
          if (openTeacherCellDetailsFromCell(cell, { dateKey, minute })) return;
          const startMinute = Math.max(0, Math.min(24 * 60 - step, minute));
          const preview = buildTeacherCreatePreview(dateKey, startMinute, startMinute + step, step);
          clearTeacherTouchRange();
          if (!preview) return;
          if (state.teacherCreateType === 'exception') {
            openTeacherExceptionModal(preview);
          } else {
            openTeacherCreateModal(preview);
          }
        };

        const updateTeacherDrag = ({ meta, clientX, clientY }) => {
          if (!state.teacherDrag || !meta) return;
          if (state.teacherDrag.mode !== 'move' && meta.dateKey !== state.teacherDrag.dateKey) return;
          const changed =
            meta.minute !== state.teacherDrag.currentMinute || meta.dateKey !== state.teacherDrag.currentDateKey;
          state.teacherDrag.currentMinute = meta.minute;
          state.teacherDrag.currentDateKey = meta.dateKey;
          state.teacherDrag.pointerX = clientX;
          state.teacherDrag.pointerY = clientY;
          if (changed) {
            state.teacherDrag.moved = true;
            renderTeacherCalendar();
            return;
          }
          renderTeacherDragHint(getTeacherDragPreview());
        };

        teacherCalendarGrid.onmousedown = (event) => {
          if (event.button !== 0) return;
          const meta = getCellMetaFromEventTarget(event.target);
          if (!meta) return;
          event.preventDefault();
          const started = startTeacherDrag({
            meta,
            target: event.target,
            clientX: event.clientX,
            clientY: event.clientY,
            shiftResize: event.shiftKey,
          });
          if (!started) return;
          window.addEventListener(
            'mouseup',
            () => {
              finalizeTeacherDrag();
            },
            { once: true }
          );
        };

        teacherCalendarGrid.onmousemove = (event) => {
          if (!state.teacherDrag) return;
          const meta = getCellMetaFromEventTarget(event.target);
          updateTeacherDrag({
            meta,
            clientX: event.clientX,
            clientY: event.clientY,
          });
        };

        teacherCalendarGrid.onmouseup = () => {
          finalizeTeacherDrag();
        };

        teacherCalendarGrid.ontouchstart = (event) => {
          const touch = event.touches?.[0];
          if (!touch) return;
          const meta = getCellMetaFromPoint(touch.clientX, touch.clientY);
          if (!meta) return;
          const target = document.elementFromPoint(touch.clientX, touch.clientY);
          state.teacherTouch.startMeta = meta;
          state.teacherTouch.startTarget = target;
          state.teacherTouch.startX = touch.clientX;
          state.teacherTouch.startY = touch.clientY;
          state.teacherTouch.started = false;
          state.teacherTouch.moved = false;
          if (state.teacherTouch.timerId) {
            window.clearTimeout(state.teacherTouch.timerId);
            state.teacherTouch.timerId = null;
          }
          if (shouldUseTeacherTapRangeSelection()) {
            return;
          }
          state.teacherTouch.timerId = window.setTimeout(() => {
            const started = startTeacherDrag({
              meta,
              target,
              clientX: touch.clientX,
              clientY: touch.clientY,
              shiftResize: false,
            });
            state.teacherTouch.started = Boolean(started);
          }, 120);
        };

        teacherCalendarGrid.ontouchmove = (event) => {
          const touch = event.touches?.[0];
          if (!touch) return;
          const dx = Math.abs(touch.clientX - Number(state.teacherTouch.startX || touch.clientX));
          const dy = Math.abs(touch.clientY - Number(state.teacherTouch.startY || touch.clientY));
          const movedEnough = dx >= 8 || dy >= 8;
          if (movedEnough) {
            state.teacherTouch.moved = true;
          }
          if (shouldUseTeacherTapRangeSelection()) {
            return;
          }
          if (!state.teacherTouch.started && movedEnough && state.teacherTouch.startMeta) {
            if (state.teacherTouch.timerId) {
              window.clearTimeout(state.teacherTouch.timerId);
              state.teacherTouch.timerId = null;
            }
            const started = startTeacherDrag({
              meta: state.teacherTouch.startMeta,
              target: state.teacherTouch.startTarget,
              clientX: state.teacherTouch.startX,
              clientY: state.teacherTouch.startY,
              shiftResize: false,
            });
            state.teacherTouch.started = Boolean(started);
          }
          if (!state.teacherTouch.started || !state.teacherDrag) return;
          const meta = getCellMetaFromPoint(touch.clientX, touch.clientY);
          updateTeacherDrag({
            meta,
            clientX: touch.clientX,
            clientY: touch.clientY,
          });
          event.preventDefault();
        };

        teacherCalendarGrid.ontouchend = () => {
          if (state.teacherTouch.timerId) {
            window.clearTimeout(state.teacherTouch.timerId);
            state.teacherTouch.timerId = null;
          }
          if (shouldUseTeacherTapRangeSelection()) {
            if (!state.teacherTouch.moved && state.teacherTouch.startMeta) {
              state.teacherTouch.lastOpenAt = Date.now();
              handleTeacherTapSelection({
                dateKey: state.teacherTouch.startMeta.dateKey,
                minute: state.teacherTouch.startMeta.minute,
                cell: state.teacherTouch.startMeta.cell,
              });
            }
            clearTeacherTouchState();
            return;
          }
          if (state.teacherTouch.started && state.teacherDrag) {
            finalizeTeacherDrag();
          } else if (state.teacherTouch.startMeta) {
            state.teacherTouch.lastOpenAt = Date.now();
            openTeacherCreateFromCell({
              dateKey: state.teacherTouch.startMeta.dateKey,
              minute: state.teacherTouch.startMeta.minute,
              cell: state.teacherTouch.startMeta.cell,
            });
          }
          clearTeacherTouchState();
        };

        teacherCalendarGrid.ontouchcancel = () => {
          if (state.teacherTouch.timerId) {
            window.clearTimeout(state.teacherTouch.timerId);
            state.teacherTouch.timerId = null;
          }
          if (!shouldUseTeacherTapRangeSelection() && state.teacherTouch.started && state.teacherDrag) {
            finalizeTeacherDrag();
          }
          clearTeacherTouchState();
        };
      }

      function renderMyBookings(items) {
        myBookingsBody.innerHTML = '';
        if (!items.length) {
          myBookingsBody.innerHTML = '<tr><td colspan="7">예약 없음</td></tr>';
          return;
        }

        for (const row of items) {
          const canCancel = ['PENDING', 'BOOKED'].includes(row.status);
          const actionButtons = [canCancel ? `<button type="button" data-cancel-my-booking="${row.id}">취소</button>` : '']
            .filter(Boolean)
            .join(' ');
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${row.id}</td>
            <td>${row.teacher_email || row.teacher_name || row.teacher_user_id}</td>
            <td class="mono">${formatDateTime(row.start_at)}</td>
            <td class="mono">${formatDateTime(row.end_at)}</td>
            <td>${statusBadge(row.status)}</td>
            <td>${escapeHtml(row.student_comment || row.teacher_comment || '')}</td>
            <td>${actionButtons}</td>
          `;
          myBookingsBody.appendChild(tr);
        }
      }

      async function loadMyBookings() {
        if (state.user?.role === 'STUDENT') {
          const result = await api('/api/v1/bookings/me', { auth: true });
          state.studentBookings = result.items || [];
        } else {
          state.studentBookings = [];
        }
        renderMyBookings(state.studentBookings);
        renderStudentStats();
        if (PAGE_MODE === 'STUDENT') {
          renderCalendar();
        }
      }

      async function createBooking(startAtIso, durationMin) {
        const teacherId = parseRequiredId(teacherSelect.value, 'teacher_id');
        void durationMin;
        if (state.user?.role === 'STUDENT') {
          await api('/api/v1/bookings', {
            method: 'POST',
            auth: true,
            body: {
              teacher_user_id: teacherId,
              start_at: startAtIso,
            },
          });
          return;
        }
        throw new Error('학생 계정으로 로그인 후 예약해 주세요.');
      }

      async function createBookingOnBehalf(startAtIso, durationMin) {
        if (state.user?.role !== 'TEACHER') {
          throw new Error('선생님만 대리 예약을 등록할 수 있습니다.');
        }
        const duration = Number.parseInt(durationMin, 10) || state.teacherGridStepMin || 30;
        const startLabel = formatDateTime(startAtIso);
        const endLabel = formatDateTime(new Date(new Date(startAtIso).getTime() + duration * 60 * 1000).toISOString());

        const memberIdentityInput = window.prompt(
          `[대리 예약]\n${startLabel} ~ ${endLabel}\n학생 로그인 ID 또는 숫자 학생 ID를 입력하세요.`,
          ''
        );
        if (memberIdentityInput === null) return;
        const memberIdentity = String(memberIdentityInput || '').trim();
        if (!memberIdentity) {
          throw new Error('학생 로그인 ID 또는 학생 ID는 필수입니다.');
        }
        const memberNumericId = parseOptionalId(memberIdentity);
        const requestBody = {
          start_at: startAtIso,
        };
        if (memberNumericId) {
          requestBody.student_user_id = memberNumericId;
        } else {
          requestBody.student_email = memberIdentity.toLowerCase();
        }
        await api('/api/v1/teachers/me/bookings', {
          method: 'POST',
          auth: true,
          body: requestBody,
        });
      }

      function confirmBookingRequest(startAtIso, durationMin) {
        const start = new Date(startAtIso);
        if (Number.isNaN(start.getTime())) {
          return window.confirm('이 시간으로 예약하시겠습니까?');
        }
        const duration = Number.parseInt(durationMin, 10) || state.studentGridStepMin || 30;
        const end = new Date(start.getTime() + duration * 60 * 1000);
        const teacher = state.teachers.find((t) => String(t.id) === String(state.selectedTeacherId));
        const teacherName = teacher?.name || `#${state.selectedTeacherId || '-'}`;
        return window.confirm(
          `[예약 확인]\n선생님: ${teacherName}\n시간: ${formatDateTime(start.toISOString())} ~ ${formatDateTime(
            end.toISOString()
          )}\n예약할까요?`
        );
      }

      async function cancelBooking(bookingId) {
        if (state.user?.role === 'STUDENT' || state.user?.role === 'TEACHER') {
          await api(`/api/v1/bookings/${bookingId}/cancel`, {
            method: 'POST',
            auth: true,
          });
          return;
        }
        throw new Error('로그인 후 취소할 수 있습니다.');
      }

      async function approveBooking(bookingId) {
        await api(`/api/v1/teachers/me/bookings/${bookingId}/approve`, {
          method: 'POST',
          auth: true,
        });
      }

      async function completeBooking(bookingId, { teacherPrivateComment, studentComment } = {}) {
        const body = {};
        if (teacherPrivateComment !== undefined) {
          body.teacher_private_comment = teacherPrivateComment;
        }
        if (studentComment !== undefined) {
          body.student_comment = studentComment;
        }
        await api(`/api/v1/teachers/me/bookings/${bookingId}/complete`, {
          method: 'POST',
          auth: true,
          body,
        });
      }

      function openTeacherCreateModal(preview) {
        if (Date.now() < Number(state.modalReopenGuardUntil || 0)) {
          return;
        }
        state.teacherCreateDraft = preview;
        teacherCreateForm.reset();
        teacherCreateForm.elements.date_local.value = formatDateKeyLabel(preview.dateKey);
        teacherCreateForm.elements.start_time_local.value = timeLabelFromMinutes(preview.startMinute);
        teacherCreateForm.elements.end_time_local.value = timeLabelFromMinutes(preview.endMinuteExclusive);
        teacherCreateForm.elements.repeat_mode.value = 'single';
        teacherCreateForm.elements.is_active.value = 'true';
        setTeacherCreateSubmitting(false);
        teacherCreateModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }

      function closeTeacherCreateModal() {
        teacherCreateModal.classList.add('hidden');
        setTeacherCreateSubmitting(false);
        state.modalReopenGuardUntil = Date.now() + 420;
        state.teacherCreateDraft = null;
        clearTeacherTouchState();
        if (teacherExceptionModal.classList.contains('hidden')) {
          document.body.style.overflow = '';
        }
      }

      function openTeacherExceptionModal(preview) {
        if (Date.now() < Number(state.modalReopenGuardUntil || 0)) {
          return;
        }
        state.teacherExceptionDraft = preview;
        teacherExceptionQuickForm.reset();
        teacherExceptionQuickForm.elements.date_local.value = preview.dateKey;
        teacherExceptionQuickForm.elements.start_time_local.value = timeLabelFromMinutes(preview.startMinute);
        teacherExceptionQuickForm.elements.end_time_local.value = timeLabelFromMinutes(preview.endMinuteExclusive);
        teacherExceptionQuickForm.elements.reason.value = '수업 불가';
        setTeacherExceptionSubmitting(false);
        teacherExceptionModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }

      function closeTeacherExceptionModal() {
        teacherExceptionModal.classList.add('hidden');
        setTeacherExceptionSubmitting(false);
        state.modalReopenGuardUntil = Date.now() + 420;
        state.teacherExceptionDraft = null;
        clearTeacherTouchState();
        if (teacherCreateModal.classList.contains('hidden')) {
          document.body.style.overflow = '';
        }
      }

      async function createTeacherExceptionFromModal() {
        const dateLocal = String(teacherExceptionQuickForm.elements.date_local.value || '').trim();
        const reason = String(teacherExceptionQuickForm.elements.reason.value || '').trim();
        const startTime = String(teacherExceptionQuickForm.elements.start_time_local.value || '').trim();
        const endTime = String(teacherExceptionQuickForm.elements.end_time_local.value || '').trim();
        if (!dateLocal) {
          throw new Error('날짜를 선택해 주세요.');
        }
        ensureTimeRangeAligned(startTime, endTime, '불가 시간');

        const body = {
          date_local: dateLocal,
          reason: reason || '수업 불가',
          start_time_local: startTime,
          end_time_local: endTime,
        };

        await api('/api/v1/teachers/me/exceptions', {
          method: 'POST',
          auth: true,
          body,
        });

        pushLog('불가 일정 생성', {
          date_local: dateLocal,
          start_time_local: body.start_time_local,
          end_time_local: body.end_time_local,
          reason: body.reason,
        });

        closeTeacherExceptionModal();
        await loadTeacherExceptions();
        await loadSlotsForCurrentMonth();
      }

      async function createTeacherAvailabilityFromDraft() {
        const preview = state.teacherCreateDraft;
        if (!preview) {
          throw new Error('생성할 드래그 범위 정보가 없습니다.');
        }

        const repeatMode = String(teacherCreateForm.elements.repeat_mode.value || 'single');
        const startTime = String(teacherCreateForm.elements.start_time_local.value || '').slice(0, 5);
        const endTime = String(teacherCreateForm.elements.end_time_local.value || '').slice(0, 5);
        const isActive = String(teacherCreateForm.elements.is_active.value || 'true') === 'true';
        const classTitle = String(teacherCreateForm.elements.class_title.value || '').trim();
        const classNote = String(teacherCreateForm.elements.class_note.value || '').trim();

        ensureTimeRangeAligned(startTime, endTime, '수업 시간');

        if (repeatMode === 'single') {
          await api('/api/v1/teachers/me/one-time-availability', {
            method: 'POST',
            auth: true,
            body: {
              date_local: preview.dateKey,
              start_time_local: startTime,
              end_time_local: endTime,
              is_active: isActive,
              lesson_title: classTitle,
              lesson_note: classNote,
            },
          });
        } else {
          await api('/api/v1/teachers/me/availability', {
            method: 'POST',
            auth: true,
            body: {
              weekday: preview.weekday,
              start_time_local: startTime,
              end_time_local: endTime,
              is_active: isActive,
              lesson_title: classTitle,
              lesson_note: classNote,
            },
          });
        }

        pushLog('클래스 생성 모드', {
          date: preview.dateKey,
          start_time_local: startTime,
          end_time_local: endTime,
          repeat_mode: repeatMode,
          class_title: classTitle || null,
          class_note: classNote || null,
          is_active: isActive,
        });

        closeTeacherCreateModal();
        await loadTeacherAvailability();
        await loadTeacherOneTimeAvailability();
        await loadTeachers();
        await loadSlotsForCurrentMonth();
      }

      async function loadStudentDashboard() {
        const invitedDate = state.invitedStartAtIso ? new Date(state.invitedStartAtIso) : null;
        if (invitedDate && !Number.isNaN(invitedDate.getTime())) {
          state.monthCursor = new Date(invitedDate);
          state.selectedDateKey = toDateKeyFromDate(invitedDate);
        } else {
          state.monthCursor = new Date();
        }
        await loadTeachers();
        await loadSlotsForCurrentMonth();
        await loadMyBookings();
      }

      function renderAvailability(items) {
        availabilityBody.innerHTML = '';
        if (!items.length) {
          availabilityBody.innerHTML = '<tr><td colspan="7">데이터 없음</td></tr>';
          return;
        }

        for (const row of items) {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${row.id}</td>
            <td>${weekdayLabel(row.weekday)}</td>
            <td class="mono">${row.start_time_local}</td>
            <td class="mono">${row.end_time_local}</td>
            <td>${row.lesson_title || '-'}</td>
            <td>${row.is_active ? '<span class="status-badge status-TRUE">활성</span>' : '<span class="status-badge status-FALSE">비활성</span>'}</td>
            <td><button type="button" data-fill-availability="${row.id}" data-fill-availability-weekday="${row.weekday}" data-fill-availability-active="${row.is_active ? 'true' : 'false'}" data-fill-availability-title="${row.lesson_title || ''}" data-fill-availability-note="${row.lesson_note || ''}">불러오기</button></td>
          `;
          availabilityBody.appendChild(tr);
        }
      }

      function renderExceptions(items) {
        exceptionBody.innerHTML = '';
        if (!items.length) {
          exceptionBody.innerHTML = '<tr><td colspan="6">데이터 없음</td></tr>';
          return;
        }

        for (const row of items) {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${row.id}</td>
            <td class="mono">${row.date_local}</td>
            <td class="mono">${row.start_time_local || ''}</td>
            <td class="mono">${row.end_time_local || ''}</td>
            <td>${row.reason || ''}</td>
            <td><button type="button" data-fill-exception="${row.id}">불러오기</button></td>
          `;
          exceptionBody.appendChild(tr);
        }
      }

      function renderTeacherBookings(items) {
        if (!teacherBookingsList) return;
        const source = Array.isArray(items) ? items : [];
        const statusFilter = String(state.teacherBookingsFilter.status || 'all').toUpperCase();
        const filtered = source.filter((row) => {
          if (statusFilter !== 'ALL' && statusFilter !== String(row.status || '').toUpperCase()) {
            return false;
          }
          if (!matchesStudentKeyword(row, state.teacherBookingsFilter.keyword)) {
            return false;
          }
          return matchesDateRange(row.start_at, state.teacherBookingsFilter.fromDate, state.teacherBookingsFilter.toDate);
        });
        const page = paginateItems(filtered, state.teacherBookingsFilter.pageSize, state.teacherBookingsFilter.page);
        state.teacherBookingsFilter.page = page.currentPage;
        updatePageInfo(teacherBookingsPageInfo, teacherBookingsPrevBtn, teacherBookingsNextBtn, page);

        teacherBookingsList.innerHTML = '';
        if (!page.items.length) {
          teacherBookingsList.innerHTML = '<div class="hint">조건에 맞는 진행 중 예약이 없습니다.</div>';
          return;
        }

        for (const row of page.items) {
          const canApprove = row.status === 'PENDING';
          const canCancel = ['PENDING', 'BOOKED'].includes(row.status);
          const canComplete = ['PENDING', 'BOOKED'].includes(row.status);
          const card = document.createElement('article');
          card.className = 'history-card';
          const studentName = row.student_email || row.student_name || row.student_user_id || '-';
          card.innerHTML = `
            <div class="history-card-head">
              <div class="history-title">#${row.id} · ${escapeHtml(String(studentName))}</div>
              <div>${statusBadge(row.status)}</div>
            </div>
            <div class="history-meta">
              <div><strong>수업시간</strong><br /><span class="mono">${formatDateTime(row.start_at)} ~ ${formatDateTime(row.end_at)}</span></div>
              <div><strong>학생 전달 코멘트</strong><br />${escapeHtml(row.student_comment || row.teacher_comment || '') || '-'}</div>
              <div><strong>선생님 메모</strong><br />${escapeHtml(row.teacher_private_comment || '') || '-'}</div>
            </div>
            <div class="history-actions">
              <button type="button" data-open-teacher-booking="${row.id}" class="primary">상세</button>
              ${canApprove ? `<button type="button" data-approve-teacher-booking="${row.id}">승인</button>` : ''}
              ${canCancel ? `<button type="button" data-cancel-teacher-booking="${row.id}" class="danger">거절/취소</button>` : ''}
              ${canComplete ? `<button type="button" data-complete-teacher-booking="${row.id}">완료처리</button>` : ''}
            </div>
          `;
          teacherBookingsList.appendChild(card);
        }
      }

      function renderTeacherCompletedList(items) {
        if (!teacherCompletedList) return;
        const source = Array.isArray(items) ? items : [];
        const lessonTitles = Array.from(
          new Set(source.map((row) => String(row.lesson_title || '').trim() || '미분류'))
        ).sort((a, b) => a.localeCompare(b, 'ko'));
        if (teacherCompletedLessonFilter) {
          const previous = String(teacherCompletedLessonFilter.value || 'all');
          teacherCompletedLessonFilter.innerHTML = '';
          const allOption = document.createElement('option');
          allOption.value = 'all';
          allOption.textContent = '전체 레슨';
          teacherCompletedLessonFilter.appendChild(allOption);
          for (const title of lessonTitles) {
            const option = document.createElement('option');
            option.value = title;
            option.textContent = title;
            teacherCompletedLessonFilter.appendChild(option);
          }
          if (lessonTitles.includes(previous)) {
            teacherCompletedLessonFilter.value = previous;
          } else {
            teacherCompletedLessonFilter.value = 'all';
          }
        }

        const selectedLesson = String(teacherCompletedLessonFilter?.value || 'all');
        const filtered = source.filter((row) => {
          if (selectedLesson === 'all') return true;
          const lessonTitle = String(row.lesson_title || '').trim() || '미분류';
          if (lessonTitle !== selectedLesson) return false;
          return true;
        }).filter((row) => {
          if (!matchesStudentKeyword(row, state.teacherCompletedFilter.keyword)) {
            return false;
          }
          return matchesDateRange(row.start_at, state.teacherCompletedFilter.fromDate, state.teacherCompletedFilter.toDate);
        });

        const page = paginateItems(filtered, state.teacherCompletedFilter.pageSize, state.teacherCompletedFilter.page);
        state.teacherCompletedFilter.page = page.currentPage;
        updatePageInfo(teacherCompletedPageInfo, teacherCompletedPrevBtn, teacherCompletedNextBtn, page);

        teacherCompletedList.innerHTML = '';
        if (!page.items.length) {
          teacherCompletedList.innerHTML = filtered.length
            ? '<div class="hint">현재 페이지에 표시할 완료 수업이 없습니다.</div>'
            : '<div class="hint">완료 수업 이력이 없습니다.</div>';
          return;
        }

        const groups = new Map();
        for (const row of page.items) {
          const key = String(row.lesson_title || '').trim() || '미분류';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(row);
        }

        for (const [lessonTitle, rows] of groups.entries()) {
          const section = document.createElement('section');
          section.className = 'subpanel';
          section.innerHTML = `<h4>${escapeHtml(lessonTitle)} <small class="hint">(${rows.length}건)</small></h4>`;

          for (const row of rows) {
            const card = document.createElement('article');
            card.className = 'history-card';
            const studentName = row.student_email || row.student_name || row.student_user_id || '-';
            const studentCommentRaw = String(row.student_comment || row.teacher_comment || '');
            const teacherMemoRaw = String(row.teacher_private_comment || '');
            const studentComment = escapeHtml(studentCommentRaw);
            const teacherMemo = escapeHtml(teacherMemoRaw);
            card.innerHTML = `
              <div class="history-card-head">
                <div class="history-title">#${row.id} · ${escapeHtml(String(studentName))}</div>
                <div>${statusBadge(row.status)}</div>
              </div>
              <div class="history-meta">
                <div><strong>수업시간</strong><br /><span class="mono">${formatDateTime(row.start_at)} ~ ${formatDateTime(row.end_at)}</span></div>
                <div><strong>학생 전달 코멘트</strong><br />${studentComment || '-'}</div>
                <div><strong>선생님 메모</strong><br />${teacherMemo || '-'}</div>
              </div>
              <div class="history-actions">
                <button type="button" data-edit-completed-student="${row.id}" data-current-value="${encodeURIComponent(studentCommentRaw)}">학생 코멘트 수정</button>
                <button type="button" data-edit-completed-private="${row.id}" data-current-value="${encodeURIComponent(teacherMemoRaw)}">선생님 메모 수정</button>
              </div>
            `;
            section.appendChild(card);
          }
          teacherCompletedList.appendChild(section);
        }
      }

      function applyTeacherBookingsFiltersFromInputs({ resetPage = true } = {}) {
        state.teacherBookingsFilter.keyword = String(teacherBookingsKeywordFilter?.value || '').trim();
        state.teacherBookingsFilter.status = String(teacherBookingsStatusFilter?.value || 'all').toLowerCase();
        state.teacherBookingsFilter.fromDate = String(teacherBookingsFromDate?.value || '').trim();
        state.teacherBookingsFilter.toDate = String(teacherBookingsToDate?.value || '').trim();
        state.teacherBookingsFilter.pageSize = Number.parseInt(String(teacherBookingsPageSize?.value || '20'), 10) || 20;
        if (resetPage) {
          state.teacherBookingsFilter.page = 1;
        }
      }

      function resetTeacherBookingsFilters() {
        state.teacherBookingsFilter = {
          keyword: '',
          status: 'all',
          fromDate: '',
          toDate: '',
          pageSize: 20,
          page: 1,
        };
        syncTeacherBookingsFilterInputs();
      }

      function applyTeacherCompletedFiltersFromInputs({ resetPage = true } = {}) {
        state.teacherCompletedFilter.keyword = String(teacherCompletedKeywordFilter?.value || '').trim();
        state.teacherCompletedFilter.fromDate = String(teacherCompletedFromDate?.value || '').trim();
        state.teacherCompletedFilter.toDate = String(teacherCompletedToDate?.value || '').trim();
        state.teacherCompletedFilter.pageSize = Number.parseInt(String(teacherCompletedPageSize?.value || '20'), 10) || 20;
        if (resetPage) {
          state.teacherCompletedFilter.page = 1;
        }
      }

      function resetTeacherCompletedFilters() {
        state.teacherCompletedFilter = {
          keyword: '',
          fromDate: '',
          toDate: '',
          pageSize: 20,
          page: 1,
        };
        syncTeacherCompletedFilterInputs();
      }

      async function loadTeacherAvailability() {
        const result = await api('/api/v1/teachers/me/availability', { auth: true });
        state.teacherAvailability = result.items || [];
        renderAvailability(state.teacherAvailability);
        renderTeacherStats();
        renderTeacherCalendar();
      }

      async function loadTeacherOneTimeAvailability() {
        const result = await api('/api/v1/teachers/me/one-time-availability', { auth: true });
        state.teacherOneTimeAvailability = result.items || [];
        renderTeacherStats();
        renderTeacherCalendar();
      }

      async function loadTeacherExceptions() {
        const result = await api('/api/v1/teachers/me/exceptions', { auth: true });
        state.teacherExceptions = result.items || [];
        renderExceptions(state.teacherExceptions);
        renderTeacherStats();
        renderTeacherCalendar();
      }

      async function loadTeacherBookings() {
        const result = await api('/api/v1/teachers/me/bookings', { auth: true });
        state.teacherBookings = result.items || [];
        state.teacherActiveBookings = state.teacherBookings.filter((row) => ['PENDING', 'BOOKED'].includes(row.status));
        state.teacherCompletedBookings = state.teacherBookings.filter((row) => row.status === 'COMPLETED');
        renderTeacherBookings(state.teacherActiveBookings);
        renderTeacherCompletedList(state.teacherCompletedBookings);
        renderTeacherStats();
        renderTeacherCalendar();
      }

      async function loadTeacherDashboard() {
        state.teacherWeekCursor = new Date();
        if (state.teacherCalendarView === 'month') {
          state.teacherWeekCursor = startOfMonth(state.teacherWeekCursor);
        }
        state.monthCursor = new Date(state.teacherWeekCursor);
        clearTeacherTouchRange();
        const { from, to } = currentTeacherCalendarRange();
        await ensureHolidayCacheForRange(from, to);
        await loadTeacherProfile();
        await loadTeacherAvailability();
        await loadTeacherOneTimeAvailability();
        await loadTeacherExceptions();
        await loadTeacherBookings();
        await loadTeacherStudents();
        await loadSlotsForCurrentMonth();
        renderTeacherCalendar();
      }

      document.getElementById('logoutBtn').addEventListener('click', () => {
        runAction('로그아웃', async () => {
          if (state.token) {
            await api('/api/v1/auth/logout', { method: 'POST', auth: true });
          }
          setAuth('', null);
          state.teachers = [];
          state.selectedTeacherId = '';
          state.slotsByDate = {};
          state.studentBookings = [];
          state.teacherAvailability = [];
          state.teacherOneTimeAvailability = [];
          state.teacherExceptions = [];
          state.teacherBookings = [];
          state.teacherStudents = [];
          state.teacherProfile = null;
          state.holidaysByDate = {};
          state.loadedHolidayYears = {};
          state.invitedTeacherId = null;
          state.studentTeacherSearchResults = [];
          state.studentCalendarView = 'week';
          state.teacherCalendarView = 'week';
          state.teacherManagePanel = 'availability';
          state.teacherSettingsPanel = 'profile';
          state.teacherOperationsPanel = 'bookings';
          resetTeacherBookingsFilters();
          resetTeacherCompletedFilters();
          clearTeacherTouchState();
          clearTeacherTouchRange();
          applyStudentCalendarViewUi();
          applyTeacherCalendarViewUi();
          applyTeacherManagePanel();
          applyTeacherOperationsPanel();
          applyTeacherSettingsPanel();
          renderStudentTeacherSearchResults(state.studentTeacherSearchResults);
          myBookingsBody.innerHTML = '';
          availabilityBody.innerHTML = '';
          exceptionBody.innerHTML = '';
          if (teacherBookingsList) teacherBookingsList.innerHTML = '';
          if (teacherCompletedList) teacherCompletedList.innerHTML = '';
          if (teacherStudentsBody) teacherStudentsBody.innerHTML = '';
          if (teacherTempStudentCreds) {
            teacherTempStudentCreds.textContent = '생성된 임시계정 정보가 여기에 표시됩니다.';
          }
          calendarGrid.innerHTML = '';
          teacherCalendarGrid.innerHTML = '';
          daySlotsList.innerHTML = '';
          teacherDragHint.classList.add('hidden');
          closeTeacherCreateModal();
          closeTeacherExceptionModal();
          hideTeacherCellDetail();
          renderStudentMeta();
          renderStudentStats();
          renderTeacherStats();
          if (PAGE_MODE === 'STUDENT') {
            window.location.href = '/student.html';
          } else {
            window.location.href = '/index.html';
          }
        });
      });

      document.getElementById('topLogoutBtn').addEventListener('click', () => {
        document.getElementById('logoutBtn').click();
      });

      teacherCellDetailClearBtn?.addEventListener('click', () => {
        hideTeacherCellDetail();
      });

      teacherCreateType.addEventListener('change', () => {
        state.teacherCreateType = teacherCreateType.value === 'exception' ? 'exception' : 'availability';
        clearTeacherTouchRange();
        renderTeacherCalendar();
      });

      document.getElementById('teacherCreateCancelBtn').addEventListener('click', () => {
        closeTeacherCreateModal();
      });

      function promptRequiredText(message, initialValue = '') {
        let seed = initialValue;
        while (true) {
          const input = window.prompt(message, seed);
          if (input === null) return null;
          const value = String(input || '').trim();
          if (value) return value;
          showToast('필수 입력 항목입니다.', 'error');
          seed = '';
        }
      }

      teacherCreateModal.addEventListener('click', (event) => {
        if (event.target === teacherCreateModal) {
          closeTeacherCreateModal();
        }
      });

      teacherCreateForm.addEventListener('submit', (event) => {
        event.preventDefault();
        runAction('수업 일정 저장', async () => {
          if (state.teacherCreateSubmitting) return;
          setTeacherCreateSubmitting(true);
          try {
            await createTeacherAvailabilityFromDraft();
          } finally {
            setTeacherCreateSubmitting(false);
          }
        });
      });

      document.getElementById('teacherExceptionCancelBtn').addEventListener('click', () => {
        closeTeacherExceptionModal();
      });

      teacherExceptionModal.addEventListener('click', (event) => {
        if (event.target === teacherExceptionModal) {
          closeTeacherExceptionModal();
        }
      });

      teacherExceptionQuickForm.addEventListener('submit', (event) => {
        event.preventDefault();
        runAction('불가 일정 저장', async () => {
          if (state.teacherExceptionSubmitting) return;
          setTeacherExceptionSubmitting(true);
          try {
            await createTeacherExceptionFromModal();
          } finally {
            setTeacherExceptionSubmitting(false);
          }
        });
      });

      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        runAction('로그인', async () => {
          const form = formObject(loginForm);
          const result = await api('/api/v1/auth/login', {
            method: 'POST',
            body: { login_id: form.login_id, password: form.password },
          });
          setAuth(result.token, result.user);
          if (PAGE_MODE === 'TEACHER' && state.user?.role !== 'TEACHER') {
            window.location.href = '/student.html';
            return;
          }
          if (PAGE_MODE === 'STUDENT' && state.user?.role === 'TEACHER') {
            window.location.href = '/teacher.html';
            return;
          }
          if (state.user?.role === 'TEACHER') {
            await loadTeacherDashboard();
          } else {
            await loadStudentDashboard();
          }
        });
      });

      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        runAction('회원가입', async () => {
          const form = formObject(registerForm);
          const loginId = String(form.login_id || '').trim().toLowerCase();
          const phone = String(form.phone || '').replace(/\D/g, '');
          const password = String(form.password || '');
          const passwordConfirm = String(form.password_confirm || '');
          const name = String(form.name || '').trim();
          if (!loginId || !phone || !password || !name || !String(form.role || '').trim()) {
            throw new Error('아이디/휴대폰/비밀번호/이름/역할을 모두 입력해 주세요.');
          }
          if (password !== passwordConfirm) {
            throw new Error('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
          }
          const result = await api('/api/v1/auth/register', {
            method: 'POST',
            body: {
              login_id: loginId,
              phone,
              password,
              name,
              role: form.role,
            },
          });
          setAuth(result.token, result.user);
          if (PAGE_MODE === 'TEACHER' && state.user?.role !== 'TEACHER') {
            window.location.href = '/student.html';
            return;
          }
          if (PAGE_MODE === 'STUDENT' && state.user?.role === 'TEACHER') {
            window.location.href = '/teacher.html';
            return;
          }
          if (state.user?.role === 'TEACHER') {
            await loadTeacherDashboard();
          } else {
            await loadStudentDashboard();
          }
        });
      });

      teacherSelect.addEventListener('change', () => {
        state.selectedTeacherId = teacherSelect.value;
        renderStudentMeta();
        runAction('선생님 전환', loadSlotsForCurrentMonth);
      });

      studentTeacherAssignBtn?.addEventListener('click', () => {
        runAction('담당 선생님 연결', async () => {
          await assignMyTeacher();
          showToast('담당 선생님이 연결되었습니다.', 'success');
        });
      });

      studentTeacherSearchBtn?.addEventListener('click', () => {
        runAction('선생님 검색', async () => {
          await searchTeachersForAssignment();
          const count = Array.isArray(state.studentTeacherSearchResults) ? state.studentTeacherSearchResults.length : 0;
          showToast(`검색 결과 ${count}건`, 'success');
        });
      });

      studentTeacherAssignSelectedBtn?.addEventListener('click', () => {
        runAction('선택 선생님 연결', async () => {
          const selectedId = parseOptionalId(studentTeacherSearchSelect?.value || '');
          if (!selectedId) {
            throw new Error('검색 결과에서 선생님을 선택해 주세요.');
          }
          await assignMyTeacher({ teacherUserId: selectedId });
          showToast('선택한 선생님으로 연결되었습니다.', 'success');
        });
      });

      studentTeacherInviteAssignBtn?.addEventListener('click', () => {
        runAction('초대 선생님 연결', async () => {
          await assignInvitedTeacher();
          showToast('초대 선생님으로 연결되었습니다.', 'success');
        });
      });

      studentTeacherClearBtn?.addEventListener('click', () => {
        runAction('담당 선생님 연결 해제', async () => {
          await clearMyTeacherAssignment();
          showToast('담당 선생님 연결이 해제되었습니다.', 'success');
        });
      });

      document.getElementById('teachersRefreshBtn').addEventListener('click', () => {
        runAction('선생님 조회', async () => {
          await loadTeachers();
          await loadSlotsForCurrentMonth();
        });
      });

      prevMonthBtn.addEventListener('click', () => {
        if (state.studentCalendarView === 'month') {
          const next = new Date(state.monthCursor);
          next.setMonth(next.getMonth() - 1, 1);
          state.monthCursor = next;
          runAction('이전 달 슬롯 조회', loadSlotsForCurrentMonth);
          return;
        }
        const next = new Date(state.monthCursor);
        next.setDate(next.getDate() - 7);
        state.monthCursor = next;
        runAction('이전 주 슬롯 조회', loadSlotsForCurrentMonth);
      });

      nextMonthBtn.addEventListener('click', () => {
        if (state.studentCalendarView === 'month') {
          const next = new Date(state.monthCursor);
          next.setMonth(next.getMonth() + 1, 1);
          state.monthCursor = next;
          runAction('다음 달 슬롯 조회', loadSlotsForCurrentMonth);
          return;
        }
        const next = new Date(state.monthCursor);
        next.setDate(next.getDate() + 7);
        state.monthCursor = next;
        runAction('다음 주 슬롯 조회', loadSlotsForCurrentMonth);
      });

      document.getElementById('todayBtn').addEventListener('click', () => {
        const today = new Date();
        state.monthCursor = new Date(today);
        state.selectedDateKey = toDateKeyFromDate(today);
        runAction('오늘 기준 캘린더 조회', loadSlotsForCurrentMonth);
      });

      document.getElementById('monthRefreshBtn').addEventListener('click', () => {
        runAction('캘린더 새로고침', loadSlotsForCurrentMonth);
      });

      studentWeekViewBtn?.addEventListener('click', () => {
        state.studentCalendarView = 'week';
        applyStudentCalendarViewUi();
        runAction('주 캘린더 전환', loadSlotsForCurrentMonth);
      });

      studentMonthViewBtn?.addEventListener('click', () => {
        state.studentCalendarView = 'month';
        applyStudentCalendarViewUi();
        runAction('월 캘린더 전환', loadSlotsForCurrentMonth);
      });

      studentGridStep.addEventListener('change', () => {
        state.studentGridStepMin = Number.parseInt(studentGridStep.value, 10) || 60;
        runAction('학생 캘린더 격자 변경', loadSlotsForCurrentMonth);
      });

      availableOnlyToggle.addEventListener('change', () => {
        state.availableOnly = availableOnlyToggle.checked;
        renderCalendar();
        renderDaySlots();
      });

      document.getElementById('teacherPrevWeekBtn').addEventListener('click', () => {
        const next = new Date(state.teacherWeekCursor);
        if (state.teacherCalendarView === 'month') {
          next.setMonth(next.getMonth() - 1, 1);
        } else {
          next.setDate(next.getDate() - 7);
        }
        runAction(state.teacherCalendarView === 'month' ? '선생님 이전 달 이동' : '선생님 이전 주 이동', async () => {
          state.teacherWeekCursor = next;
          state.monthCursor = new Date(next);
          const { from, to } = currentTeacherCalendarRange();
          await ensureHolidayCacheForRange(from, to);
          await loadSlotsForCurrentMonth();
          renderTeacherCalendar();
        });
      });

      document.getElementById('teacherNextWeekBtn').addEventListener('click', () => {
        const next = new Date(state.teacherWeekCursor);
        if (state.teacherCalendarView === 'month') {
          next.setMonth(next.getMonth() + 1, 1);
        } else {
          next.setDate(next.getDate() + 7);
        }
        runAction(state.teacherCalendarView === 'month' ? '선생님 다음 달 이동' : '선생님 다음 주 이동', async () => {
          state.teacherWeekCursor = next;
          state.monthCursor = new Date(next);
          const { from, to } = currentTeacherCalendarRange();
          await ensureHolidayCacheForRange(from, to);
          await loadSlotsForCurrentMonth();
          renderTeacherCalendar();
        });
      });

      document.getElementById('teacherTodayBtn').addEventListener('click', () => {
        runAction(state.teacherCalendarView === 'month' ? '선생님 이번 달 이동' : '선생님 이번 주 이동', async () => {
          state.teacherWeekCursor = new Date();
          if (state.teacherCalendarView === 'month') {
            state.teacherWeekCursor = startOfMonth(state.teacherWeekCursor);
          }
          state.monthCursor = new Date(state.teacherWeekCursor);
          const { from, to } = currentTeacherCalendarRange();
          await ensureHolidayCacheForRange(from, to);
          await loadSlotsForCurrentMonth();
          renderTeacherCalendar();
        });
      });

      teacherGridStep.addEventListener('change', () => {
        state.teacherGridStepMin = Number.parseInt(teacherGridStep.value, 10) || 60;
        clearTeacherTouchRange();
        runAction('선생님 캘린더 격자 변경', async () => {
          await loadSlotsForCurrentMonth();
          renderTeacherCalendar();
        });
      });

      document.getElementById('teacherWeekRefreshBtn').addEventListener('click', () => {
        runAction('선생님 캘린더 새로고침', async () => {
          state.monthCursor = new Date(state.teacherWeekCursor);
          const { from, to } = currentTeacherCalendarRange();
          await ensureHolidayCacheForRange(from, to);
          await loadTeacherProfile();
          await loadTeacherAvailability();
          await loadTeacherOneTimeAvailability();
          await loadTeacherExceptions();
          await loadTeacherBookings();
          await loadSlotsForCurrentMonth();
        });
      });

      teacherInviteBtn.addEventListener('click', () => {
        runAction('학생 초대 링크 복사', async () => {
          if (!state.user?.id) {
            throw new Error('로그인 사용자 정보를 확인할 수 없습니다.');
          }
          const inviteUrl = buildCalendarInviteUrl(state.user.id);
          await navigator.clipboard.writeText(inviteUrl);
          pushLog('학생 캘린더 링크 생성', { invite_url: inviteUrl });
          showToast('학생 캘린더 링크를 복사했습니다.', 'success');
        });
      });

      document.getElementById('teacherOpenSlotRefreshBtn')?.addEventListener('click', () => {
        runAction('오픈 슬롯 새로고침', async () => {
          state.monthCursor = new Date(state.teacherWeekCursor);
          await loadSlotsForCurrentMonth();
        });
      });

      teacherWeekViewBtn?.addEventListener('click', () => {
        if (state.teacherCalendarView === 'week') return;
        runAction('선생님 주 캘린더 전환', async () => {
          state.teacherCalendarView = 'week';
          clearTeacherTouchRange();
          applyTeacherCalendarViewUi();
          const { from, to } = currentTeacherCalendarRange();
          await ensureHolidayCacheForRange(from, to);
          await loadSlotsForCurrentMonth();
          renderTeacherCalendar();
        });
      });

      teacherMonthViewBtn?.addEventListener('click', () => {
        if (state.teacherCalendarView === 'month') return;
        runAction('선생님 월 캘린더 전환', async () => {
          state.teacherCalendarView = 'month';
          state.teacherWeekCursor = startOfMonth(state.teacherWeekCursor);
          state.monthCursor = new Date(state.teacherWeekCursor);
          clearTeacherTouchRange();
          applyTeacherCalendarViewUi();
          const { from, to } = currentTeacherCalendarRange();
          await ensureHolidayCacheForRange(from, to);
          await loadSlotsForCurrentMonth();
          renderTeacherCalendar();
        });
      });

      teacherOpenSlotList?.addEventListener('click', (e) => {
        const lessonStartAt = e.target?.dataset?.copyLessonLinkStartAt;
        if (lessonStartAt) {
          runAction('레슨 링크 복사', async () => {
            const lessonUrl = await copyLessonInviteUrlByStartAt(lessonStartAt);
            pushLog('레슨 링크 생성', { lesson_url: lessonUrl, start_at: lessonStartAt });
            showToast('레슨 링크를 복사했습니다.', 'success');
          });
          return;
        }

        const proxyStartAt = e.target?.dataset?.bookSlotOnBehalf;
        if (!proxyStartAt) return;
        const proxyDuration = Number.parseInt(e.target?.dataset?.bookSlotDuration || '', 10) || 30;
        runAction('대리 예약 등록', async () => {
          await createBookingOnBehalf(proxyStartAt, proxyDuration);
          await loadTeacherBookings();
          await loadSlotsForCurrentMonth();
        });
      });

      lessonCatalogList?.addEventListener('click', (e) => {
        const startAt = e.target?.dataset?.copyLessonCatalogStartAt;
        if (!startAt) return;
        runAction('레슨 항목 링크 복사', async () => {
          await copyLessonInviteUrlByStartAt(startAt);
          showToast('레슨 링크를 복사했습니다.', 'success');
        });
      });

      document.getElementById('teacherProfileSaveBtn')?.addEventListener('click', () => {
        runAction('선생님 설정 저장', async () => {
          const form = formObject(teacherProfileForm);
          const cancelHour = Number.parseInt(String(form.student_cancel_day_before_hour || ''), 10);
          if (!Number.isInteger(cancelHour) || cancelHour < 0 || cancelHour > 23) {
            throw new Error('학생 취소 마감 시각은 0~23 사이여야 합니다.');
          }
          await api('/api/v1/teachers/me/profile', {
            method: 'PATCH',
            auth: true,
            body: {
              display_name: String(form.display_name || ''),
              bio: String(form.bio || ''),
              student_cancel_day_before_hour: cancelHour,
              student_notice: String(form.student_notice || ''),
            },
          });
          await loadTeacherProfile();
          await loadTeachers();
          await loadSlotsForCurrentMonth();
          renderStudentMeta();
        });
      });

      document.getElementById('teacherProfileRefreshBtn')?.addEventListener('click', () => {
        runAction('선생님 설정 다시불러오기', loadTeacherProfile);
      });

      document.getElementById('studentProfileSaveBtn')?.addEventListener('click', () => {
        runAction('학생 프로필 저장', async () => {
          await saveMyProfile(studentProfileForm);
          showToast('프로필이 저장되었습니다.', 'success');
        });
      });

      document.getElementById('studentProfileRefreshBtn')?.addEventListener('click', () => {
        runAction('학생 프로필 다시불러오기', syncMe);
      });

      document.getElementById('studentPasswordSaveBtn')?.addEventListener('click', () => {
        runAction('학생 비밀번호 변경', async () => {
          await changeMyPassword(studentPasswordForm);
          showToast('비밀번호가 변경되었습니다.', 'success');
        });
      });

      document.getElementById('studentUpgradeBtn')?.addEventListener('click', () => {
        runAction('정식계정 전환', async () => {
          await upgradeMyStudentAccount();
          showToast('정식 계정으로 전환되었습니다.', 'success');
        });
      });

      document.getElementById('teacherAccountSaveBtn')?.addEventListener('click', () => {
        runAction('선생님 계정 저장', async () => {
          await saveMyProfile(teacherAccountForm);
          showToast('계정 정보가 저장되었습니다.', 'success');
        });
      });

      document.getElementById('teacherAccountRefreshBtn')?.addEventListener('click', () => {
        runAction('선생님 계정 다시불러오기', syncMe);
      });

      document.getElementById('teacherPasswordSaveBtn')?.addEventListener('click', () => {
        runAction('선생님 비밀번호 변경', async () => {
          await changeMyPassword(teacherPasswordForm);
          showToast('비밀번호가 변경되었습니다.', 'success');
        });
      });

      document.getElementById('teacherTempStudentCreateBtn')?.addEventListener('click', () => {
        runAction('임시 학생 생성', async () => {
          await createTemporaryStudentByTeacher();
          showToast('임시 학생 계정이 생성되었습니다.', 'success');
        });
      });

      document.getElementById('teacherStudentsRefreshBtn')?.addEventListener('click', () => {
        runAction('학생 목록 조회', loadTeacherStudents);
      });

      document.getElementById('teacherAssignStudentBtn')?.addEventListener('click', () => {
        runAction('학생 연결', async () => {
          await assignStudentToMeByTeacher();
          showToast('학생이 현재 선생님에게 연결되었습니다.', 'success');
        });
      });

      document.getElementById('myBookingsRefreshBtn').addEventListener('click', () => {
        runAction('내 예약 조회', loadMyBookings);
      });

      myBookingsBody.addEventListener('click', (e) => {
        const bookingId = e.target?.dataset?.cancelMyBooking;
        if (!bookingId) return;
        runAction('내 예약 취소', async () => {
          await cancelBooking(bookingId);
          await loadMyBookings();
          await loadSlotsForCurrentMonth();
        });
      });

      document.getElementById('availabilityCreateBtn').addEventListener('click', () => {
        runAction('시간표 등록', async () => {
          const form = formObject(availabilityForm);
          ensureTimeRangeAligned(form.start_time_local, form.end_time_local, '시간표');
          await api('/api/v1/teachers/me/availability', {
            method: 'POST',
            auth: true,
            body: {
              weekday: Number(form.weekday),
              start_time_local: form.start_time_local,
              end_time_local: form.end_time_local,
              is_active: form.is_active === 'true',
              lesson_title: form.lesson_title,
              lesson_note: form.lesson_note,
            },
          });
          await loadTeacherAvailability();
        });
      });

      document.getElementById('availabilityUpdateBtn').addEventListener('click', () => {
        runAction('시간표 수정', async () => {
          const id = parseRequiredId(availabilityForm.elements.id.value, 'availability id');
          const form = formObject(availabilityForm);
          ensureTimeRangeAligned(form.start_time_local, form.end_time_local, '시간표');
          await api(`/api/v1/teachers/me/availability/${id}`, {
            method: 'PATCH',
            auth: true,
            body: {
              weekday: Number(form.weekday),
              start_time_local: form.start_time_local,
              end_time_local: form.end_time_local,
              is_active: form.is_active === 'true',
              lesson_title: form.lesson_title,
              lesson_note: form.lesson_note,
            },
          });
          await loadTeacherAvailability();
        });
      });

      document.getElementById('availabilityDeleteBtn').addEventListener('click', () => {
        runAction('시간표 삭제', async () => {
          const id = parseRequiredId(availabilityForm.elements.id.value, 'availability id');
          await api(`/api/v1/teachers/me/availability/${id}`, {
            method: 'DELETE',
            auth: true,
          });
          await loadTeacherAvailability();
        });
      });

      document.getElementById('availabilityRefreshBtn').addEventListener('click', () => {
        runAction('시간표 조회', loadTeacherAvailability);
      });

      availabilityBody.addEventListener('click', (e) => {
        const id = e.target?.dataset?.fillAvailability;
        if (!id) return;
        const tr = e.target.closest('tr');
        availabilityForm.elements.id.value = id;
        availabilityForm.elements.weekday.value = String(e.target?.dataset?.fillAvailabilityWeekday || tr.children[1].textContent.trim());
        availabilityForm.elements.start_time_local.value = tr.children[2].textContent.trim().slice(0, 5);
        availabilityForm.elements.end_time_local.value = tr.children[3].textContent.trim().slice(0, 5);
        availabilityForm.elements.is_active.value = e.target.dataset.fillAvailabilityActive === 'false' ? 'false' : 'true';
        availabilityForm.elements.lesson_title.value = e.target.dataset.fillAvailabilityTitle || '';
        availabilityForm.elements.lesson_note.value = e.target.dataset.fillAvailabilityNote || '';
      });

      document.getElementById('exceptionCreateBtn').addEventListener('click', () => {
        runAction('예외 등록', async () => {
          const form = formObject(exceptionForm);
          const hasStart = Boolean(form.start_time_local.trim());
          const hasEnd = Boolean(form.end_time_local.trim());
          if (!hasStart || !hasEnd) {
            throw new Error('예외는 시작/종료 시간을 모두 입력해야 합니다.');
          }
          ensureTimeRangeAligned(form.start_time_local.trim(), form.end_time_local.trim(), '예외 시간');

          const body = {
            date_local: form.date_local,
            reason: form.reason,
            start_time_local: form.start_time_local,
            end_time_local: form.end_time_local,
          };

          await api('/api/v1/teachers/me/exceptions', {
            method: 'POST',
            auth: true,
            body,
          });
          await loadTeacherExceptions();
        });
      });

      document.getElementById('exceptionDeleteBtn').addEventListener('click', () => {
        runAction('예외 삭제', async () => {
          const id = parseRequiredId(exceptionForm.elements.id.value, 'exception id');
          await api(`/api/v1/teachers/me/exceptions/${id}`, {
            method: 'DELETE',
            auth: true,
          });
          await loadTeacherExceptions();
        });
      });

      document.getElementById('exceptionRefreshBtn').addEventListener('click', () => {
        runAction('예외 조회', loadTeacherExceptions);
      });

      exceptionBody.addEventListener('click', (e) => {
        const id = e.target?.dataset?.fillException;
        if (!id) return;
        const tr = e.target.closest('tr');
        exceptionForm.elements.id.value = id;
        exceptionForm.elements.date_local.value = tr.children[1].textContent.trim();
        exceptionForm.elements.start_time_local.value = tr.children[2].textContent.trim().slice(0, 5);
        exceptionForm.elements.end_time_local.value = tr.children[3].textContent.trim().slice(0, 5);
        exceptionForm.elements.reason.value = tr.children[4].textContent.trim();
      });

      teacherManagePanelSelect?.addEventListener('change', () => {
        state.teacherManagePanel = String(teacherManagePanelSelect.value || 'availability').toLowerCase();
        applyTeacherManagePanel();
      });

      teacherOperationsBookingsTab?.addEventListener('click', () => {
        state.teacherOperationsPanel = 'bookings';
        applyTeacherOperationsPanel();
      });

      teacherOperationsCompletedTab?.addEventListener('click', () => {
        state.teacherOperationsPanel = 'completed';
        applyTeacherOperationsPanel();
      });

      teacherSettingsPanelSelect?.addEventListener('change', () => {
        state.teacherSettingsPanel = String(teacherSettingsPanelSelect.value || 'profile').toLowerCase();
        applyTeacherSettingsPanel();
      });

      teacherClearTouchSelectionBtn?.addEventListener('click', () => {
        if (!state.teacherTouch.rangeAnchor) return;
        clearTeacherTouchRange({ rerender: true });
        showToast('선택한 시간 범위를 초기화했습니다.', 'success', 1800);
      });

      teacherJumpMorningBtn?.addEventListener('click', () => {
        scrollTeacherCalendarToMinute(9 * 60);
      });

      teacherJumpAfternoonBtn?.addEventListener('click', () => {
        scrollTeacherCalendarToMinute(13 * 60);
      });

      teacherJumpEveningBtn?.addEventListener('click', () => {
        scrollTeacherCalendarToMinute(18 * 60);
      });

      document.getElementById('teacherBookingsRefreshBtn').addEventListener('click', () => {
        runAction('선생님 예약 조회', loadTeacherBookings);
      });

      teacherBookingsFilterBtn?.addEventListener('click', () => {
        applyTeacherBookingsFiltersFromInputs({ resetPage: true });
        renderTeacherBookings(state.teacherActiveBookings || []);
      });

      teacherBookingsResetBtn?.addEventListener('click', () => {
        resetTeacherBookingsFilters();
        renderTeacherBookings(state.teacherActiveBookings || []);
      });

      teacherBookingsPageSize?.addEventListener('change', () => {
        applyTeacherBookingsFiltersFromInputs({ resetPage: true });
        renderTeacherBookings(state.teacherActiveBookings || []);
      });

      teacherBookingsPrevBtn?.addEventListener('click', () => {
        state.teacherBookingsFilter.page = Math.max(1, state.teacherBookingsFilter.page - 1);
        renderTeacherBookings(state.teacherActiveBookings || []);
      });

      teacherBookingsNextBtn?.addEventListener('click', () => {
        state.teacherBookingsFilter.page += 1;
        renderTeacherBookings(state.teacherActiveBookings || []);
      });

      document.getElementById('teacherCompletedRefreshBtn')?.addEventListener('click', () => {
        runAction('완료 수업 조회', loadTeacherBookings);
      });

      teacherCompletedFilterBtn?.addEventListener('click', () => {
        applyTeacherCompletedFiltersFromInputs({ resetPage: true });
        renderTeacherCompletedList(state.teacherCompletedBookings || []);
      });

      teacherCompletedResetBtn?.addEventListener('click', () => {
        resetTeacherCompletedFilters();
        if (teacherCompletedLessonFilter) {
          teacherCompletedLessonFilter.value = 'all';
        }
        renderTeacherCompletedList(state.teacherCompletedBookings || []);
      });

      teacherCompletedPageSize?.addEventListener('change', () => {
        applyTeacherCompletedFiltersFromInputs({ resetPage: true });
        renderTeacherCompletedList(state.teacherCompletedBookings || []);
      });

      teacherCompletedPrevBtn?.addEventListener('click', () => {
        state.teacherCompletedFilter.page = Math.max(1, state.teacherCompletedFilter.page - 1);
        renderTeacherCompletedList(state.teacherCompletedBookings || []);
      });

      teacherCompletedNextBtn?.addEventListener('click', () => {
        state.teacherCompletedFilter.page += 1;
        renderTeacherCompletedList(state.teacherCompletedBookings || []);
      });

      teacherCompletedLessonFilter?.addEventListener('change', () => {
        state.teacherCompletedFilter.page = 1;
        renderTeacherCompletedList(state.teacherCompletedBookings || []);
      });

      teacherBookingsList?.addEventListener('click', (e) => {
        const openId = e.target?.dataset?.openTeacherBooking;
        if (openId) {
          openTeacherBookingDetail(openId);
          return;
        }

        const approveId = e.target?.dataset?.approveTeacherBooking;
        if (approveId) {
          runAction('예약 승인', async () => {
            await approveBooking(approveId);
            await loadTeacherBookings();
            await loadSlotsForCurrentMonth();
          });
          return;
        }

        const completeId = e.target?.dataset?.completeTeacherBooking;
        if (completeId) {
          runAction('수업 완료 처리', async () => {
            const studentComment = promptRequiredText('학생에게 전달할 코멘트를 입력해 주세요. (필수)');
            if (studentComment === null) return;
            const teacherPrivateComment = promptRequiredText('선생님 내부 메모를 입력해 주세요. (필수)');
            if (teacherPrivateComment === null) return;
            await completeBooking(completeId, {
              teacherPrivateComment,
              studentComment,
            });
            await loadTeacherBookings();
            await loadSlotsForCurrentMonth();
          });
          return;
        }

        const bookingId = e.target?.dataset?.cancelTeacherBooking;
        if (!bookingId) return;
        runAction('선생님 예약 취소', async () => {
          await cancelBooking(bookingId);
          await loadTeacherBookings();
          await loadSlotsForCurrentMonth();
        });
      });

      teacherCompletedList?.addEventListener('click', (e) => {
        const studentCommentId = e.target?.dataset?.editCompletedStudent;
        if (studentCommentId) {
          runAction('학생 전달 코멘트 수정', async () => {
            const current = decodeURIComponentSafe(e.target?.dataset?.currentValue || '');
            const next = promptRequiredText('학생에게 전달할 코멘트를 입력해 주세요. (필수)', current);
            if (next === null) return;
            await completeBooking(studentCommentId, { studentComment: next });
            await loadTeacherBookings();
          });
          return;
        }

        const privateCommentId = e.target?.dataset?.editCompletedPrivate;
        if (privateCommentId) {
          runAction('선생님 메모 수정', async () => {
            const current = decodeURIComponentSafe(e.target?.dataset?.currentValue || '');
            const next = promptRequiredText('선생님 내부 메모를 입력해 주세요. (필수)', current);
            if (next === null) return;
            await completeBooking(privateCommentId, { teacherPrivateComment: next });
            await loadTeacherBookings();
          });
        }
      });

      window.addEventListener('unhandledrejection', (e) => {
        pushLog('UI_REJECTION', {
          message: e.reason?.message || String(e.reason),
          payload: e.reason?.payload,
        });
      });

      window.addEventListener('error', (e) => {
        pushLog('UI_ERROR', { message: e.message });
      });

      window.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        if (!teacherCreateModal.classList.contains('hidden')) {
          closeTeacherCreateModal();
        }
        if (!teacherExceptionModal.classList.contains('hidden')) {
          closeTeacherExceptionModal();
        }
      });

      async function bootstrap() {
        applyTopNavState();
        initializeHalfHourSelects();
        studentGridStep.value = '60';
        teacherGridStep.value = '60';
        teacherCreateType.value = state.teacherCreateType;
        state.studentGridStepMin = 60;
        state.teacherGridStepMin = 60;
        applyStudentCalendarViewUi();
        renderStudentTeacherSearchResults(state.studentTeacherSearchResults);
        syncTeacherBookingsFilterInputs();
        syncTeacherCompletedFilterInputs();
        applyTeacherManagePanel();
        applyTeacherOperationsPanel();
        applyTeacherSettingsPanel();
        updateTeacherTouchGuide();
        if (exceptionForm?.elements?.date_local && !exceptionForm.elements.date_local.value) {
          exceptionForm.elements.date_local.value = toDateKeyFromDate(new Date());
        }
        if (PAGE_MODE === 'STUDENT' && state.invitedStartAtIso) {
          const invited = new Date(state.invitedStartAtIso);
          if (!Number.isNaN(invited.getTime())) {
            state.monthCursor = new Date(invited);
            state.selectedDateKey = toDateKeyFromDate(invited);
          }
        }
        renderAuth();
        renderStudentMeta();
        renderStudentStats();
        renderTeacherStats();
        if (!state.token) {
          redirectToLoginPage();
          return;
        }

        try {
          await syncMe();

          if (PAGE_MODE === 'TEACHER') {
            if (!state.user || state.user.role !== 'TEACHER') {
              window.location.href = '/index.html';
              return;
            }
            await loadTeacherDashboard();
            return;
          }

          if (PAGE_MODE === 'STUDENT' && state.user?.role === 'TEACHER') {
            window.location.href = '/teacher.html';
            return;
          }

          state.monthCursor = new Date();
          await loadTeachers();
          await loadSlotsForCurrentMonth();
          if (state.user?.role === 'STUDENT') {
            await loadMyBookings();
          } else {
            state.studentBookings = [];
            renderMyBookings(state.studentBookings);
            renderStudentStats();
          }
        } catch (err) {
          pushLog('세션 복원 FAILED', { message: getErrorMessage(err), payload: err?.payload });
          setAuth('', null);
          redirectToLoginPage();
        }
      }

      bootstrap();
