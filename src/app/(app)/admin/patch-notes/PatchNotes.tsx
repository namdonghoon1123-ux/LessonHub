"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Chip, EmptyState, PageTitle } from "@/components/ui";
import Modal from "@/components/Modal";
import type { PatchNote } from "@/lib/data/patchNotes";
import { createPatchNoteAction, deletePatchNoteAction } from "../actions";

export default function PatchNotes({ notes }: { notes: PatchNote[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "처리 실패");
      else router.refresh();
    });

  return (
    <>
      <PageTitle
        title="패치노트"
        desc="서비스 공지를 작성합니다."
        right={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-10 rounded-[var(--radius-btn)] bg-coral px-4 text-[14px] font-bold text-white hover:opacity-95"
          >
            + 작성
          </button>
        }
      />

      {error && (
        <p className="mb-3 rounded-[10px] bg-coral-tint px-3 py-2 text-[13px] font-medium text-coral-deep">
          {error}
        </p>
      )}

      {notes.length === 0 ? (
        <EmptyState>작성된 패치노트가 없습니다.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {notes.map((n) => (
            <div key={n.id} className="rounded-[14px] border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold">{n.title}</h3>
                    <Chip tone={n.published_at ? "success" : "neutral"}>
                      {n.published_at ? "게시됨" : "임시저장"}
                    </Chip>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[13.5px] text-sub">
                    {n.body}
                  </p>
                  <p className="mt-2 text-[12px] text-muted tabular-nums">
                    {n.created_at.slice(0, 10)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => deletePatchNoteAction(n.id))}
                  className="shrink-0 text-[12.5px] text-muted hover:text-coral-deep"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="패치노트 작성">
        <div className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="h-10 w-full rounded-[10px] border-[1.5px] border-line px-3 text-[14px] outline-none focus:border-coral"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="내용"
            rows={5}
            className="w-full rounded-[10px] border-[1.5px] border-line px-3 py-2 text-[14px] outline-none focus:border-coral"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={pending || !title || !body}
            onClick={() => {
              setOpen(false);
              const t = title, b = body;
              setTitle(""); setBody("");
              run(() => createPatchNoteAction({ title: t, body: b, publish: false }));
            }}
            className="h-10 rounded-[var(--radius-btn)] border border-line px-4 text-[14px] font-medium text-sub hover:bg-line-soft disabled:opacity-60"
          >
            임시저장
          </button>
          <button
            type="button"
            disabled={pending || !title || !body}
            onClick={() => {
              setOpen(false);
              const t = title, b = body;
              setTitle(""); setBody("");
              run(() => createPatchNoteAction({ title: t, body: b, publish: true }));
            }}
            className="h-10 rounded-[var(--radius-btn)] bg-coral px-4 text-[14px] font-bold text-white disabled:opacity-60"
          >
            게시
          </button>
        </div>
      </Modal>
    </>
  );
}
