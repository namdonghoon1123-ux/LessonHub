"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Chip, EmptyState, PageTitle } from "@/components/ui";
import Modal from "@/components/Modal";
import type { LinkDetailed } from "@/lib/data/admin";
import { createLinkAction, deleteLinkAction } from "../actions";

type Opt = { id: string; name: string };

export default function AdminLinks({
  links,
  students,
  teachers,
}: {
  links: LinkDetailed[];
  students: Opt[];
  teachers: Opt[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");
  const [teacherId, setTeacherId] = useState("");

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
        title="연결 관리"
        desc="학생과 담당 선생님을 연결합니다."
        right={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-10 rounded-[var(--radius-btn)] bg-coral px-4 text-[14px] font-bold text-white hover:opacity-95"
          >
            + 연결 추가
          </button>
        }
      />

      {error && (
        <p className="mb-3 rounded-[10px] bg-coral-tint px-3 py-2 text-[13px] font-medium text-coral-deep">
          {error}
        </p>
      )}

      {links.length === 0 ? (
        <EmptyState>등록된 연결이 없습니다.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {links.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3.5"
            >
              <span className="font-semibold">{l.student_name}</span>
              <span className="text-muted">→</span>
              <span className="font-semibold">{l.teacher_name} 선생님</span>
              <div className="ml-auto flex items-center gap-2.5">
                <Chip tone={l.status === "ACTIVE" ? "success" : "coral"}>
                  {l.status === "ACTIVE" ? "연결됨" : "대기"}
                </Chip>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => deleteLinkAction(l.id))}
                  className="text-[12.5px] text-muted hover:text-coral-deep"
                >
                  해제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="연결 추가">
        <div className="flex flex-col gap-3">
          <Picker label="학생" value={studentId} onChange={setStudentId} options={students} />
          <Picker label="선생님" value={teacherId} onChange={setTeacherId} options={teachers} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-10 rounded-[var(--radius-btn)] border border-line px-4 text-[14px] font-medium text-sub hover:bg-line-soft"
          >
            취소
          </button>
          <button
            type="button"
            disabled={pending || !studentId || !teacherId}
            onClick={() => {
              setOpen(false);
              run(() => createLinkAction(studentId, teacherId));
            }}
            className="h-10 rounded-[var(--radius-btn)] bg-coral px-4 text-[14px] font-bold text-white disabled:opacity-60"
          >
            연결
          </button>
        </div>
      </Modal>
    </>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
}) {
  return (
    <label className="text-[13px] font-semibold text-sub">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-[10px] border-[1.5px] border-line bg-surface px-3 text-[14px] outline-none focus:border-coral"
      >
        <option value="">선택…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
