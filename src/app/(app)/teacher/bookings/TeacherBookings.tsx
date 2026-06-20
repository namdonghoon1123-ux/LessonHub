"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Chip, EmptyState, PageTitle } from "@/components/ui";
import type { BookingStatus } from "@/lib/data/bookings";
import { WEEKDAY_KO, fmtTime, kstWall } from "@/lib/time";
import {
  cancelBookingAction,
  completeBookingAction,
  noShowBookingAction,
} from "../actions";

export type UITB = {
  id: string;
  start_at: string;
  duration_min: number;
  status: BookingStatus;
  student_name: string;
  lesson_title: string | null;
};

type Tab = "upcoming" | "done" | "canceled";

const TABS: { key: Tab; label: string; match: (s: BookingStatus) => boolean }[] =
  [
    { key: "upcoming", label: "예정", match: (s) => s === "BOOKED" || s === "PENDING" },
    { key: "done", label: "완료/노쇼", match: (s) => s === "COMPLETED" || s === "NO_SHOW" },
    { key: "canceled", label: "취소됨", match: (s) => s === "CANCELED" },
  ];

const STATUS: Record<BookingStatus, { label: string; tone: "rose" | "success" | "coral" | "muted" | "neutral" }> = {
  PENDING: { label: "대기", tone: "neutral" },
  BOOKED: { label: "확정", tone: "rose" },
  COMPLETED: { label: "완료", tone: "success" },
  NO_SHOW: { label: "노쇼", tone: "coral" },
  CANCELED: { label: "취소", tone: "muted" },
};

export default function TeacherBookings({ items }: { items: UITB[] }) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const active = TABS.find((t) => t.key === tab)!;
  const filtered = items.filter((i) => active.match(i.status));
  const count = (t: (typeof TABS)[number]) =>
    items.filter((i) => t.match(i.status)).length;

  return (
    <>
      <PageTitle title="예약 관리" desc="들어온 예약을 완료·노쇼·취소 처리합니다." />

      <div className="mb-4 flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              "rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors " +
              (tab === t.key
                ? "bg-coral text-white"
                : "bg-line-soft text-sub hover:text-ink")
            }
          >
            {t.label} {count(t)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState>해당하는 예약이 없습니다.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((b) => (
            <Row key={b.id} b={b} />
          ))}
        </div>
      )}
    </>
  );
}

function Row({ b }: { b: UITB }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const w = kstWall(new Date(b.start_at));
  const s = STATUS[b.status];

  const act = (fn: (id: string) => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn(b.id);
      if (!res.ok) setError(res.error ?? "처리 실패");
      else router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-surface p-3.5">
      <Avatar name={b.student_name} size={34} />
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-semibold">{b.student_name}</p>
        {b.lesson_title && (
          <p className="text-[12px] text-muted">{b.lesson_title}</p>
        )}
      </div>
      <div className="text-right">
        <p className="text-[13px] font-semibold tabular-nums">
          {w.mo + 1}.{w.d} ({WEEKDAY_KO[w.weekday]})
        </p>
        <p className="text-[15px] font-bold text-coral-deep tabular-nums">
          {fmtTime(new Date(b.start_at))}
        </p>
      </div>
      <Chip tone={s.tone}>{s.label}</Chip>

      {(b.status === "BOOKED" || b.status === "PENDING") && (
        <div className="flex items-center gap-1.5">
          <ActBtn onClick={() => act(completeBookingAction)} disabled={pending} tone="primary">
            완료
          </ActBtn>
          <ActBtn onClick={() => act(noShowBookingAction)} disabled={pending}>
            노쇼
          </ActBtn>
          <ActBtn onClick={() => act(cancelBookingAction)} disabled={pending}>
            취소
          </ActBtn>
        </div>
      )}
      {error && <p className="w-full text-[12px] text-coral-deep">{error}</p>}
    </div>
  );
}

function ActBtn({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "rounded-[9px] px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-50 " +
        (tone === "primary"
          ? "bg-coral text-white hover:opacity-95"
          : "border border-line text-sub hover:bg-line-soft")
      }
    >
      {children}
    </button>
  );
}
