import type { Role } from "./types";

export type NavItem = { href: string; label: string };

// README 공통 네비 명세의 역할별 탭
export const navByRole: Record<Role, NavItem[]> = {
  STUDENT: [
    { href: "/student", label: "예약하기" },
    { href: "/student/bookings", label: "내 예약" },
    { href: "/student/feedback", label: "피드백" },
  ],
  TEACHER: [
    { href: "/teacher", label: "주간 캘린더" },
    { href: "/teacher/schedule", label: "시간표·예외" },
    { href: "/teacher/bookings", label: "예약 관리" },
    { href: "/teacher/students", label: "학생" },
    { href: "/teacher/stats", label: "통계" },
  ],
  POWER_ADMIN: [
    { href: "/admin", label: "대시보드" },
    { href: "/admin/users", label: "사용자" },
    { href: "/admin/links", label: "연결" },
    { href: "/admin/audit", label: "활동 로그" },
    { href: "/admin/patch-notes", label: "패치노트" },
    { href: "/admin/settings", label: "정책" },
  ],
};
