"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Chip, EmptyState, PageTitle } from "@/components/ui";
import Modal from "@/components/Modal";
import type { LinkedStudent } from "@/lib/data/links";
import { createStudentAction, saveStudentMgmtAction } from "../actions";

export default function StudentsManager({
  students,
}: {
  students: LinkedStudent[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [manage, setManage] = useState<LinkedStudent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; pw: string } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const pendingList = students.filter((s) => s.status === "PENDING");

  const submitAdd = () =>
    startTransition(async () => {
      setError(null);
      const res = await createStudentAction({ name, email, password: pw });
      if (!res.ok) setError(res.error ?? "생성 실패");
      else {
        setCreated({ email, pw });
        setName(""); setEmail(""); setPw("");
        setAddOpen(false);
        router.refresh();
      }
    });

  return (
    <>
      <PageTitle
        title="학생"
        desc="학생별 메모·잔여 횟수 관리, 임시 계정 생성."
        right={
          <button
            type="button"
            onClick={() => { setCreated(null); setAddOpen(true); }}
            className="h-10 rounded-[var(--radius-btn)] bg-coral px-4 text-[14px] font-bold text-white hover:opacity-95"
          >
            + 학생 추가
          </button>
        }
      />

      {created && (
        <div className="mb-3 rounded-[10px] bg-success-bg px-3 py-2.5 text-[13px] text-success">
          학생 계정 생성됨 — <b>이메일</b> {created.email} · <b>임시 비번</b> {created.pw}
          <br />
          <span className="text-[12px]">첫 로그인 시 비밀번호를 변경하게 됩니다.</span>
        </div>
      )}
      {error && (
        <p className="mb-3 rounded-[10px] bg-coral-tint px-3 py-2 text-[13px] font-medium text-coral-deep">
          {error}
        </p>
      )}
      {pendingList.length > 0 && (
        <p className="mb-2 text-[13px] text-sub">
          승인 대기 {pendingList.length}건은 <b>주간 캘린더</b> 상단에서 처리하세요.
        </p>
      )}

      {students.length === 0 ? (
        <EmptyState>아직 담당 학생이 없습니다.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {students.map((s) => (
            <div
              key={s.link_id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] border border-line bg-surface p-3.5"
            >
              <Avatar name={s.name} size={38} />
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-semibold">{s.name}</p>
                {s.teacher_memo && (
                  <p className="mt-0.5 line-clamp-1 text-[12px] text-muted">📝 {s.teacher_memo}</p>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2">
                {s.remaining_lessons != null && (
                  <Chip tone={s.remaining_lessons > 0 ? "success" : "coral"}>
                    잔여 {s.remaining_lessons}회
                  </Chip>
                )}
                <Chip tone={s.status === "ACTIVE" ? "neutral" : "coral"}>
                  {s.status === "ACTIVE" ? "연결됨" : "대기"}
                </Chip>
                {s.status === "ACTIVE" && (
                  <button
                    type="button"
                    onClick={() => { setError(null); setManage(s); }}
                    className="rounded-[var(--radius-btn)] border border-line px-3 py-2 text-[12.5px] font-medium text-sub hover:bg-line-soft"
                  >
                    관리
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 학생 추가 */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="학생 추가 (임시 계정)">
        <div className="flex flex-col gap-3">
          <Field label="이름" value={name} onChange={setName} />
          <Field label="이메일" value={email} onChange={setEmail} type="email" />
          <Field label="임시 비밀번호 (6자+)" value={pw} onChange={setPw} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <CancelBtn onClick={() => setAddOpen(false)} />
          <button
            type="button"
            disabled={pending || !name || !email || pw.length < 6}
            onClick={submitAdd}
            className="h-10 rounded-[var(--radius-btn)] bg-coral px-4 text-[14px] font-bold text-white disabled:opacity-60"
          >
            {pending ? "생성 중…" : "생성 + 연결"}
          </button>
        </div>
      </Modal>

      {/* 학생 관리 (메모 + 잔여) */}
      <ManageModal
        student={manage}
        pending={pending}
        onClose={() => setManage(null)}
        onSave={(memo, remaining) => {
          if (!manage) return;
          const id = manage.link_id;
          setManage(null);
          startTransition(async () => {
            const res = await saveStudentMgmtAction(id, memo, remaining);
            if (!res.ok) setError(res.error ?? "저장 실패");
            else router.refresh();
          });
        }}
      />
    </>
  );
}

function ManageModal({
  student,
  pending,
  onClose,
  onSave,
}: {
  student: LinkedStudent | null;
  pending: boolean;
  onClose: () => void;
  onSave: (memo: string, remaining: number | null) => void;
}) {
  const [memo, setMemo] = useState("");
  const [remaining, setRemaining] = useState("");
  const [initId, setInitId] = useState<string | null>(null);

  if (student && student.link_id !== initId) {
    setInitId(student.link_id);
    setMemo(student.teacher_memo ?? "");
    setRemaining(student.remaining_lessons == null ? "" : String(student.remaining_lessons));
  }

  return (
    <Modal open={student != null} onClose={onClose} title={`학생 관리 · ${student?.name ?? ""}`}>
      <div className="flex flex-col gap-3">
        <label className="text-[13px] font-semibold text-sub">
          메모 / 특이사항 <span className="font-normal text-muted">(나만 봐요)</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={4}
            placeholder="예: 바이엘 진행 중, 손목 긴장 주의"
            className="mt-1 w-full rounded-[10px] border-[1.5px] border-line px-3 py-2 text-[14px] outline-none focus:border-coral"
          />
        </label>
        <label className="text-[13px] font-semibold text-sub">
          잔여 레슨 횟수 <span className="font-normal text-muted">(비우면 미사용)</span>
          <input
            type="number"
            min={0}
            value={remaining}
            onChange={(e) => setRemaining(e.target.value)}
            placeholder="예: 8"
            className="mt-1 h-10 w-full rounded-[10px] border-[1.5px] border-line px-3 text-[14px] tabular-nums outline-none focus:border-coral"
          />
        </label>
        <p className="text-[12px] text-muted">
          잔여 횟수를 설정하면 레슨 완료 시 자동으로 1씩 차감돼요.
        </p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <CancelBtn onClick={onClose} />
        <button
          type="button"
          disabled={pending}
          onClick={() => onSave(memo, remaining === "" ? null : Number(remaining))}
          className="h-10 rounded-[var(--radius-btn)] bg-coral px-5 text-[14px] font-bold text-white disabled:opacity-60"
        >
          저장
        </button>
      </div>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="text-[13px] font-semibold text-sub">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-[10px] border-[1.5px] border-line px-3 text-[14px] outline-none focus:border-coral"
      />
    </label>
  );
}

function CancelBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-[var(--radius-btn)] border border-line px-4 text-[14px] font-medium text-sub hover:bg-line-soft"
    >
      취소
    </button>
  );
}
