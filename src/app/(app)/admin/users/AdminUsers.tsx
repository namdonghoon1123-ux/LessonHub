"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Chip, PageTitle } from "@/components/ui";
import Modal from "@/components/Modal";
import { roleLabel, type Role } from "@/lib/types";
import type { AdminUser } from "@/lib/data/admin";
import {
  createUserAction,
  resetPasswordAction,
  setUserActiveAction,
} from "../actions";

type Filter = "all" | "STUDENT" | "TEACHER" | "POWER_ADMIN" | "inactive";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "STUDENT", label: "학생" },
  { key: "TEACHER", label: "선생님" },
  { key: "POWER_ADMIN", label: "관리자" },
  { key: "inactive", label: "일시정지" },
];

const roleTone: Record<Role, "coral" | "rose" | "success"> = {
  STUDENT: "coral",
  TEACHER: "rose",
  POWER_ADMIN: "success",
};

export default function AdminUsers({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const match = (u: AdminUser) =>
    filter === "all"
      ? true
      : filter === "inactive"
        ? !u.is_active
        : u.role === filter && u.is_active;
  const filtered = users.filter(match);
  const countOf = (f: Filter) => users.filter((u) =>
    f === "all" ? true : f === "inactive" ? !u.is_active : u.role === f && u.is_active,
  ).length;

  const run = (fn: () => Promise<{ ok: boolean; error?: string; tempPassword?: string }>) =>
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "처리 실패");
      else {
        if (res.tempPassword)
          setNotice(`임시 비밀번호: ${res.tempPassword} (사용자에게 전달, 첫 로그인 시 변경)`);
        router.refresh();
      }
    });

  return (
    <>
      <PageTitle
        title="사용자 관리"
        desc={`총 ${users.length}명`}
        right={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="h-10 rounded-[var(--radius-btn)] bg-coral px-4 text-[14px] font-bold text-white hover:opacity-95"
          >
            + 사용자
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={
              "rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors " +
              (filter === f.key
                ? "bg-coral text-white"
                : "bg-line-soft text-sub hover:text-ink")
            }
          >
            {f.label} {countOf(f.key)}
          </button>
        ))}
      </div>

      {notice && (
        <p className="mb-3 rounded-[10px] bg-success-bg px-3 py-2 text-[13px] font-medium text-success">
          {notice}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-[10px] bg-coral-tint px-3 py-2 text-[13px] font-medium text-coral-deep">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line">
        <table className="w-full min-w-[640px] text-[13.5px]">
          <thead>
            <tr className="bg-line-soft text-left text-[11.5px] font-bold text-sub">
              <Th>사용자</Th>
              <Th>역할</Th>
              <Th>상태</Th>
              <Th>가입일</Th>
              <Th>작업</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-line-soft">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.name} size={30} />
                    <div>
                      <div className="font-semibold">{u.name}</div>
                      <div className="text-[12px] text-muted">
                        {u.username ? `@${u.username}` : u.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <Chip tone={roleTone[u.role]}>{roleLabel[u.role]}</Chip>
                </td>
                <td className="px-3 py-2.5">
                  {u.is_active ? (
                    <Chip tone="success">활성</Chip>
                  ) : (
                    <Chip tone="muted">일시정지</Chip>
                  )}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-sub">
                  {u.created_at.slice(0, 10)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1.5">
                    <SmallBtn
                      disabled={pending}
                      onClick={() => run(() => resetPasswordAction(u.id))}
                    >
                      비번 재설정
                    </SmallBtn>
                    {u.is_active ? (
                      <SmallBtn
                        disabled={pending}
                        onClick={() => run(() => setUserActiveAction(u.id, false))}
                      >
                        비활성화
                      </SmallBtn>
                    ) : (
                      <SmallBtn
                        disabled={pending}
                        onClick={() => run(() => setUserActiveAction(u.id, true))}
                      >
                        활성화
                      </SmallBtn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateUserModal
        open={createOpen}
        pending={pending}
        onClose={() => setCreateOpen(false)}
        onSubmit={(input) => {
          setCreateOpen(false);
          run(() => createUserAction(input));
        }}
      />
    </>
  );
}

function CreateUserModal({
  open,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: {
    username: string;
    password: string;
    name: string;
    role: Role;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");

  return (
    <Modal open={open} onClose={onClose} title="사용자 추가">
      <div className="flex flex-col gap-3">
        <Input label="이름" value={name} onChange={setName} />
        <Input label="아이디 (한글 가능)" value={username} onChange={setUsername} />
        <Input
          label="임시 비밀번호 (6자+)"
          value={password}
          onChange={setPassword}
        />
        <label className="text-[13px] font-semibold text-sub">
          역할
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="mt-1 h-10 w-full rounded-[10px] border-[1.5px] border-line bg-surface px-3 text-[14px] outline-none focus:border-coral"
          >
            <option value="STUDENT">학생</option>
            <option value="TEACHER">선생님</option>
            <option value="POWER_ADMIN">관리자</option>
          </select>
        </label>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-[var(--radius-btn)] border border-line px-4 text-[14px] font-medium text-sub hover:bg-line-soft"
        >
          취소
        </button>
        <button
          type="button"
          disabled={pending || !name || !username}
          onClick={() => onSubmit({ name, username, password, role })}
          className="h-10 rounded-[var(--radius-btn)] bg-coral px-4 text-[14px] font-bold text-white disabled:opacity-60"
        >
          생성
        </button>
      </div>
    </Modal>
  );
}

function Input({
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

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2.5">{children}</th>;
}

function SmallBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-[8px] border border-line px-2.5 py-1.5 text-[12px] font-medium text-sub hover:bg-line-soft disabled:opacity-50"
    >
      {children}
    </button>
  );
}
