# LessonHub AI Handover (2026-03-30)

## 1) Current Service Rules
- Service timezone is fixed to `Asia/Seoul`.
- Roles: `POWER_ADMIN`, `TEACHER`, `STUDENT`.
- Student booking requires assigned teacher.
- Teacher slot booking duration is based on `teacher_profiles.lesson_duration_min`.

## 2) Main Frontend Structure
- `frontend/app.html`
  - Unified workspace page for teacher/student.
  - Section routing by query: `mode`, `section`, optional `manage_panel`, `settings_panel`, `teacher_calendar`.
  - Teacher operations now renders active bookings as list cards (`#teacherBookingsList`).
  - Teacher settings split by panel select (`#teacherSettingsPanelSelect`):
    - `profile`
    - `account`
    - `students`
  - Student flow has teacher-first gate (`#studentNeedsTeacherNotice`).

- `frontend/lesson-booking-app.js`
  - Session/auth rendering: `renderAuth`, `applyTopNavState`, `applyPageSection`.
  - Teacher panel routing:
    - `applyTeacherManagePanel`
    - `applyTeacherSettingsPanel`
  - Teacher calendar rendering:
    - `renderTeacherCalendar` (week/month)
    - `openTeacherCellDetailsFromCell`
    - `openTeacherBookingDetail`, `openTeacherWindowDetail`, `openTeacherExceptionDetail`
  - Booking lists:
    - `renderTeacherBookings` (active booking list cards)
    - `renderTeacherCompletedList`
  - Student teacher-assignment flow:
    - `renderStudentTeacherAssignmentState`
    - `assignMyTeacher`, `clearMyTeacherAssignment`, `searchTeachersForAssignment`

- `frontend/power-admin.html`
  - Fast login UX (default credentials prefilled + quick fill/login buttons).
  - New section: Patch Notes (`notes`).

- `frontend/power-admin-app.js`
  - Admin section router: overview/users/links/activity/notes/policy.
  - New patch-note functions:
    - `loadPatchNotes`
    - `createPatchNote`
    - `renderPatchNotes`

## 3) Main Backend Structure
- `backend/src/index.js`
  - Auth/account routes (`/api/v1/auth/*`, `/api/v1/users/me/*`).
  - Teacher routes (`/api/v1/teachers/*`, `/api/v1/teachers/me/*`).
  - Student booking routes (`/api/v1/bookings`, `/api/v1/bookings/me`).
  - Power admin routes (`/api/v1/admin/*`).

### Important booking logic
- Function: `getBookableSlotAt(teacherUserId, startAtIso, timezone, lessonDurationMin)`
  - Validates slot against:
    - teacher availability window (weekly + one-time)
    - exceptions overlap
    - booking overlap
    - booking window and current time
- Route: `GET /api/v1/teachers/:teacherId/slots`
  - Expands availability windows into actual slot starts via `generate_series`.
  - Uses teacher lesson duration (`lesson_duration_min`) for slot length.
  - Uses request `step_min` for slot start granularity.
  - Deduplicates overlapped weekly/one-time slots with one-time priority.

## 4) DB Tables (Key)
- `users`
  - role/login/password/assignment state (`assigned_teacher_user_id`)
  - soft deletion fields: `is_active`, `deactivated_at`, `deactivated_reason`
- `teacher_profiles`
  - teacher policies and display info
  - `lesson_duration_min`, `booking_window_days`, `student_cancel_day_before_hour`, `student_notice`, `display_name`, `bio`
- `weekly_availabilities`
  - recurring weekly availability
- `one_time_availabilities`
  - date-specific availability
- `availability_exceptions`
  - date/time blocked windows (or all-day)
- `bookings`
  - booking lifecycle status and comments
- `admin_patch_notes` (new)
  - patch notes for power-admin and AI handover tracking

## 5) New/Relevant Migrations
- `015_user_soft_deletion.sql`
  - user soft-deactivation support
- `016_admin_patch_notes_and_power_admin_login_fix.sql`
  - adds `admin_patch_notes`
  - ensures `poweradmin` account exists/active
  - normalizes poweradmin account state for local development

## 6) Power Admin Credentials (Dev)
- 관리자 자격 정보는 문서에 직접 남기지 않는다.

## 7) Operational Notes
- Deleting users from admin API is soft-delete, not hard delete.
- Teacher deactivation clears assigned students.
- For large UX change requests, log summary to Power Admin > Patch Notes.
- Backend tests can reset local fixture data. If test accounts disappear, re-run migrate/seed and restore required demo accounts.

## 8) Next Recommended Work Items
- Add inline modal editor for booking detail (currently detail card + prompt-based edit flow).
- Add multi-teacher assignment model for students if product scope expands.
- Add migration history table to avoid re-running all SQL files on each migrate command.
