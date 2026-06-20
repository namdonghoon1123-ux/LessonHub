export type Role = "STUDENT" | "TEACHER" | "POWER_ADMIN";
export type StudentTier = "FULL" | "TEMP";

export type Profile = {
  id: string;
  role: Role;
  name: string;
  email: string | null;
  is_active: boolean;
  must_change_password: boolean;
  student_tier: StudentTier | null;
};

// 역할별 홈 경로
export const roleHome: Record<Role, string> = {
  STUDENT: "/student",
  TEACHER: "/teacher",
  POWER_ADMIN: "/admin",
};

export const roleLabel: Record<Role, string> = {
  STUDENT: "학생",
  TEACHER: "선생님",
  POWER_ADMIN: "관리자",
};
