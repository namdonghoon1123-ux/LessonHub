"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Chip, EmptyState, PageTitle } from "@/components/ui";
import Modal from "@/components/Modal";
import type { LinkedStudent } from "@/lib/data/links";
import { createStudentAction } from "../actions";

export default function StudentsManager({
  students,
}: {
  students: LinkedStudent[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; pw: string } | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const active = students.filter((s) => s.status === "ACTIVE");
  const pendingList = students.filter((s) => s.status === "PENDING");

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const res = await createStudentAction({ name, email, password: pw });
      if (!res.ok) setError(res.error ?? "생성 실패");
      else {
        setCreated({ email, pw });
        setName(""); setEmail(""); setPw("");
        setOpen(false);
        router.refresh();
      }
    });

  return (
    <>
      <PageTitle
        title="학생"
        desc="담당 학생을 관리하고 임시 계정을 만들 수 있어요."
        right={
          <button
            type="button"
            onClick={() => { setCreated(null); setOpen(true); }}
            className="h-10 rounded-[var(--radius-btn)] bg-coral px-4 text-[14px] font-bold text-white hover:opacity-95"
          >
            + 학생 추가
          </button>
        }
      />

      {created && (
        <div className="mb-3 rounded-[10px] bg-success-bg px-3 py-2.5 text-[13px] text-success">
          학생 계정 생성됨 — 학생에게 전달하세요:
          <br />
          <b>이메일</b> {created.email} · <b>임시 비번</b> {created.pw}
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
          승인 대기 {pendingList.length}건은 <b>주간 캘린더</b> 상단에서 처리할 수 있어요.
        </p>
      )}

      {active.length === 0 && pendingList.length === 0 ? (
        <EmptyState>아직 담당 학생이 없습니다.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2">
          {students.map((s) => (
            <div
              key={s.student_id}
              className="flex items-center gap-3 rounded-[14px] border border-line bg-surface p-3.5"
            >
              <Avatar name={s.name} size={38} />
              <span className="flex-1 text-[14.5px] font-semibold">{s.name}</span>
              <Chip tone={s.status === "ACTIVE" ? "success" : "coral"}>
                {s.status === "ACTIVE" ? "연결됨" : "승인 대기"}
              </Chip>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="학생 추가 (임시 계정)">
        <div className="flex flex-col gap-3">
          <Field label="이름" value={name} onChange={setName} />
          <Field label="이메일" value={email} onChange={setEmail} type="email" />
          <Field label="임시 비밀번호 (6자+)" value={pw} onChange={setPw} />
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
            disabled={pending || !name || !email || pw.length < 6}
            onClick={submit}
            className="h-10 rounded-[var(--radius-btn)] bg-coral px-4 text-[14px] font-bold text-white disabled:opacity-60"
          >
            {pending ? "생성 중…" : "생성 + 연결"}
          </button>
        </div>
      </Modal>
    </>
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
