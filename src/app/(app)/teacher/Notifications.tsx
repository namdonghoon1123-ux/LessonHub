"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NotificationRow } from "@/lib/data/notifications";
import { markNotificationReadAction } from "./actions";
import { kstWall } from "@/lib/time";

export default function Notifications({ notes }: { notes: NotificationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (notes.length === 0) return null;

  const dismiss = (id: string) =>
    startTransition(async () => {
      await markNotificationReadAction(id);
      router.refresh();
    });

  return (
    <div className="mb-4 rounded-[var(--radius-card)] border border-success-bg bg-success-bg/60 p-4">
      <p className="mb-2.5 text-[13.5px] font-bold text-success">
        💰 입금 알림 {notes.length}건
      </p>
      <div className="flex flex-col gap-2">
        {notes.map((n) => {
          const w = kstWall(new Date(n.created_at));
          return (
            <div key={n.id} className="flex items-start gap-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold">
                  {n.student_name}
                  <span className="ml-1.5 text-[12px] font-normal text-sub tabular-nums">
                    {w.mo + 1}.{w.d} {String(w.h).padStart(2, "0")}:{String(w.mi).padStart(2, "0")}
                  </span>
                </p>
                {n.message && (
                  <p className="text-[13px] text-sub">{n.message}</p>
                )}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => dismiss(n.id)}
                className="shrink-0 rounded-[9px] border border-line bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-sub disabled:opacity-60"
              >
                확인
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
