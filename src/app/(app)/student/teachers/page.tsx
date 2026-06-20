import { redirect } from "next/navigation";

// 학생 셀프 연결 페이지는 비활성화됨 (연결은 선생님/관리자가 관리)
export default function Page() {
  redirect("/student");
}
