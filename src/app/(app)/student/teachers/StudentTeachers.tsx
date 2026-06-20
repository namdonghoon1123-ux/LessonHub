"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Chip, EmptyState, PageTitle } from "@/components/ui";
import type { StudentLink } from "@/lib/data/links";
import { removeLinkAction, requestLinkAction } from "../actions";

type Available = { teacher_id: string; name: string; subject: string | null };

export default function StudentTeachers({
  links,
  available,
}: {
  links: StudentLink[];
  available: Available[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "처리 실패");
      else router.refresh();
    });

  const filtered = available.filter(
    (t) =>
      !q ||
      t.name.includes(q) ||
      (t.subject ?? "").includes(q),
  );

  return (
    <>
      <PageTitle title="선생님" desc="담당 선생님을 연결하고 관리하세요." />

      {error && (
        <p className="mb-3 rounded-[10px] bg-coral-tint px-3 py-2 text-[13px] font-medium text-coral-deep">
          {error}
        </p>
      )}

      <h2 className="mb-2 text-[15px] font-bold">내 선생님</h2>
      {links.length === 0 ? (
        <EmptyState>연결된 선생님이 없습니다. 아래에서 연결해 보세요.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {links.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3.5"
            >
              <Avatar name={l.name} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-semibold">
                  {l.name} 선생님
                </p>
                {l.subject && (
                  <p className="text-[12.5px] text-muted">{l.subject}</p>
                )}
              </div>
              <Chip tone={l.status === "ACTIVE" ? "success" : "coral"}>
                {l.status === "ACTIVE" ? "연결됨" : "승인 대기"}
              </Chip>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => removeLinkAction(l.id))}
                className="rounded-[var(--radius-btn)] border border-line px-3 py-2 text-[12.5px] font-medium text-sub hover:bg-line-soft disabled:opacity-50"
              >
                {l.status === "ACTIVE" ? "해제" : "취소"}
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-2 mt-7 text-[15px] font-bold">선생님 찾기</h2>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="이름 또는 과목 검색"
        className="mb-3 h-11 w-full rounded-[var(--radius-input)] border-[1.5px] border-line px-3.5 text-[14px] outline-none focus:border-coral"
      />
      {filtered.length === 0 ? (
        <EmptyState>연결 가능한 선생님이 없습니다.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => (
            <div
              key={t.teacher_id}
              className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3.5"
            >
              <Avatar name={t.name} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-semibold">
                  {t.name} 선생님
                </p>
                {t.subject && (
                  <p className="text-[12.5px] text-muted">{t.subject}</p>
                )}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => requestLinkAction(t.teacher_id))}
                className="rounded-[var(--radius-btn)] bg-coral px-3.5 py-2 text-[13px] font-bold text-white hover:opacity-95 disabled:opacity-60"
              >
                연결 요청
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
