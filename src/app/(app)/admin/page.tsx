import { requireRole } from "@/lib/auth";
import { getAllUsers } from "@/lib/data/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, PageTitle } from "@/components/ui";

async function countBookings(): Promise<number> {
  const db = createAdminClient();
  const { count } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .in("status", ["BOOKED", "PENDING"]);
  return count ?? 0;
}

export default async function AdminHome() {
  const me = await requireRole("POWER_ADMIN");
  const [users, activeBookings] = await Promise.all([
    getAllUsers(),
    countBookings(),
  ]);

  const active = users.filter((u) => u.is_active);
  const students = active.filter((u) => u.role === "STUDENT").length;
  const teachers = active.filter((u) => u.role === "TEACHER").length;

  return (
    <>
      <PageTitle title="대시보드" desc={`${me.name}님, 운영 현황입니다.`} />
      <Card className="grid grid-cols-2 divide-x divide-line-soft sm:grid-cols-4">
        <Stat n={active.length} label="활성 사용자" highlight />
        <Stat n={students} label="학생" />
        <Stat n={teachers} label="선생님" />
        <Stat n={activeBookings} label="활성 예약" />
      </Card>
    </>
  );
}

function Stat({ n, label, highlight }: { n: number; label: string; highlight?: boolean }) {
  return (
    <div className="px-5 py-4">
      <div className={`text-[24px] font-bold tabular-nums ${highlight ? "text-coral-deep" : ""}`}>
        {n}
      </div>
      <div className="text-[12px] text-muted">{label}</div>
    </div>
  );
}
