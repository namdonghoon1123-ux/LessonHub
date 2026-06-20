import { requireRole } from "@/lib/auth";
import { Card, PageTitle } from "@/components/ui";
import { STUDENT_CANCEL_CUTOFF_HOURS } from "@/lib/policy";

export default async function Page() {
  await requireRole("POWER_ADMIN");
  return (
    <>
      <PageTitle title="정책" desc="서비스 운영 정책 개요" />
      <div className="flex flex-col gap-3">
        <PolicyRow
          label="학생 취소 마감"
          value={`수업 ${STUDENT_CANCEL_CUTOFF_HOURS}시간 전까지`}
          note="전역 기본값. 코드 상수(lib/policy.ts)."
        />
        <PolicyRow
          label="예약 자동 완료"
          value="수업 종료 후 자동 (매분 배치)"
          note="pg_cron · auto_complete_bookings()"
        />
        <PolicyRow
          label="레슨 길이 · 예약 가능 기간"
          value="선생님별 설정"
          note="각 선생님 프로필(teacher_profiles)에서 관리"
        />
        <PolicyRow
          label="노쇼 처리"
          value="선생님 수동"
          note="자동 아님. 예약 관리에서 노쇼 처리"
        />
      </div>
    </>
  );
}

function PolicyRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="flex items-center justify-between gap-4 p-4">
      <div>
        <p className="text-[14.5px] font-bold">{label}</p>
        <p className="mt-0.5 text-[12.5px] text-muted">{note}</p>
      </div>
      <span className="shrink-0 text-right text-[13.5px] font-semibold text-coral-deep">
        {value}
      </span>
    </Card>
  );
}
