import { requireRole } from "@/lib/auth";
import { getAuditLogs } from "@/lib/data/audit";
import { EmptyState, PageTitle } from "@/components/ui";

export default async function Page() {
  await requireRole("POWER_ADMIN");
  const logs = await getAuditLogs();

  return (
    <>
      <PageTitle title="활동 로그" desc="관리자 액션 기록 (최근 100건)" />
      {logs.length === 0 ? (
        <EmptyState>기록된 활동이 없습니다.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="bg-line-soft text-left text-[11.5px] font-bold text-sub">
                <th className="px-3 py-2.5">시각</th>
                <th className="px-3 py-2.5">작업</th>
                <th className="px-3 py-2.5">실행자</th>
                <th className="px-3 py-2.5">대상</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-line-soft">
                  <td className="px-3 py-2.5 tabular-nums text-sub">
                    {l.created_at.slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-3 py-2.5 font-semibold">{l.action}</td>
                  <td className="px-3 py-2.5 text-sub">{l.actor_email ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted">
                    {l.target_type ?? ""}
                    {l.payload ? ` · ${JSON.stringify(l.payload)}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
