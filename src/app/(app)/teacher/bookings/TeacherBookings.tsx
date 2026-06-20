"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Chip, EmptyState, PageTitle } from "@/components/ui";
import Modal from "@/components/Modal";
import type { BookingStatus } from "@/lib/data/bookings";
import { WEEKDAY_KO, fmtTime, kstWall } from "@/lib/time";
import {
  cancelBookingAction,
  completeBookingAction,
  noShowBookingAction,
  saveCommentAction,
} from "../actions";

export type UITB = {
  id: string;
  start_at: string;
  duration_min: number;
  status: BookingStatus;
  student_name: string;
  lesson_title: string | null;
  teacher_comment: string | null;
  teacher_private_comment: string | null;
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
  const [commentTarget, setCommentTarget] = useState<UITB | null>(null);
  const active = TABS.find((t) => t.key === tab)!;
  const filtered = items.filter((i) => active.match(i.status));
  const count = (t: (typeof TABS)[number]) =>
    items.filter((i) => t.match(i.status)).length;

  return (
    <>
      <PageTitle title="예약 관리" desc="완료·노쇼·취소 처리 및 레슨 코멘트 작성." />

      <div className="mb-4 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              "shrink-0 rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition-colors " +
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
            <Row key={b.id} b={b} onComment={() => setCommentTarget(b)} />
          ))}
        </div>
      )}

      <CommentModal
        target={commentTarget}
        onClose={() => setCommentTarget(null)}
      />
    </>
  );
}

function Row({ b, onComment }: { b: UITB; onComment: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const w = kstWall(new Date(b.start_at));
  const s = STATUS[b.status];
  const hasComment = !!(b.teacher_comment || b.teacher_private_comment);

  const act = (fn: (id: string) => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn(b.id);
      if (!res.ok) setError(res.error ?? "처리 실패");
      else router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] border border-line bg-surface p-3.5">
      <Avatar name={b.student_name} size={34} />
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-semibold">{b.student_name}</p>
        {b.lesson_title && <p className="text-[12px] text-muted">{b.lesson_title}</p>}
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

      <div className="ml-auto flex items-center gap-1.5">
        {b.status !== "CANCELED" && (
          <ActBtn onClick={onComment} disabled={pending}>
            {hasComment ? "코멘트 ✎" : "코멘트"}
          </ActBtn>
        )}
        {(b.status === "BOOKED" || b.status === "PENDING") && (
          <>
            <ActBtn onClick={() => act(completeBookingAction)} disabled={pending} tone="primary">
              완료
            </ActBtn>
            <ActBtn onClick={() => act(noShowBookingAction)} disabled={pending}>
              노쇼
            </ActBtn>
            <ActBtn onClick={() => act(cancelBookingAction)} disabled={pending}>
              취소
            </ActBtn>
          </>
        )}
      </div>
      {error && <p className="w-full text-[12px] text-coral-deep">{error}</p>}
    </div>
  );
}

function CommentModal({
  target,
  onClose,
}: {
  target: UITB | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [memo, setMemo] = useState("");
  const [initId, setInitId] = useState<string | null>(null);

  // target 바뀔 때 초기화
  if (target && target.id !== initId) {
    setInitId(target.id);
    setMsg(target.teacher_comment ?? "");
    setMemo(target.teacher_private_comment ?? "");
    setError(null);
  }

  const save = () => {
    if (!target) return;
    const id = target.id;
    startTransition(async () => {
      setError(null);
      const res = await saveCommentAction(id, msg, memo);
      if (!res.ok) setError(res.error ?? "저장 실패");
      else {
        onClose();
        setInitId(null);
        router.refresh();
      }
    });
  };

  return (
    <Modal open={target != null} onClose={onClose} title={`레슨 코멘트 · ${target?.student_name ?? ""}`}>
      <div className="flex flex-col gap-3">
        <label className="text-[13px] font-semibold text-sub">
          학생 전달 메시지
          <span className="ml-1 font-normal text-muted">(학생에게 보여요 · 링크 가능)</span>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            rows={4}
            placeholder="예: 오늘 손목 각도 좋았어요! 참고 영상 https://youtu.be/..."
            className="mt-1 w-full rounded-[10px] border-[1.5px] border-line px-3 py-2 text-[14px] outline-none focus:border-coral"
          />
        </label>
        <label className="text-[13px] font-semibold text-sub">
          개인 메모
          <span className="ml-1 font-normal text-muted">(나만 봐요)</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            placeholder="예: 다음 시간 스케일 점검 필요"
            className="mt-1 w-full rounded-[10px] border-[1.5px] border-line px-3 py-2 text-[14px] outline-none focus:border-coral"
          />
        </label>
        {error && <p className="text-[12.5px] text-coral-deep">{error}</p>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-[var(--radius-btn)] border border-line px-4 text-[14px] font-medium text-sub hover:bg-line-soft"
        >
          닫기
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="h-10 rounded-[var(--radius-btn)] bg-coral px-5 text-[14px] font-bold text-white disabled:opacity-60"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
    </Modal>
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
