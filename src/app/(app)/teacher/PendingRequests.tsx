"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui";
import { approveLinkAction, rejectLinkAction } from "./actions";

export default function PendingRequests({
  requests,
}: {
  requests: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (requests.length === 0) return null;

  const run = (fn: () => Promise<{ ok: boolean }>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="mb-4 rounded-[var(--radius-card)] border border-rose-border bg-rose-tint p-4">
      <p className="mb-2.5 text-[13.5px] font-bold text-rose">
        연결 요청 {requests.length}건
      </p>
      <div className="flex flex-col gap-2">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center gap-2.5">
            <Avatar name={r.name} size={32} />
            <span className="flex-1 text-[14px] font-semibold">{r.name} 학생</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => approveLinkAction(r.id))}
              className="rounded-[9px] bg-coral px-3 py-2 text-[12.5px] font-bold text-white disabled:opacity-60"
            >
              승인
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => rejectLinkAction(r.id))}
              className="rounded-[9px] border border-rose-border bg-surface px-3 py-2 text-[12.5px] font-medium text-rose disabled:opacity-60"
            >
              거절
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
