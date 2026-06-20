"use client";

import { useActionState } from "react";
import { PageTitle, Card } from "@/components/ui";
import { changePasswordAction, type PwState } from "@/app/change-password/actions";

export default function AccountPage() {
  const [state, formAction, pending] = useActionState<PwState, FormData>(
    changePasswordAction,
    {},
  );

  return (
    <>
      <PageTitle title="설정" desc="비밀번호를 변경할 수 있어요." />
      <Card className="max-w-md p-5">
        <h2 className="mb-3 text-[15px] font-bold">비밀번호 변경</h2>
        <form action={formAction} className="flex flex-col gap-3">
          <Field label="새 비밀번호 (6자 이상)" name="password" />
          <Field label="새 비밀번호 확인" name="confirm" />
          {state.error && (
            <p className="rounded-[10px] bg-coral-tint px-3 py-2 text-[13px] font-medium text-coral-deep">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-1 h-11 rounded-[var(--radius-btn)] bg-coral text-[14px] font-bold text-white disabled:opacity-60"
          >
            {pending ? "변경 중…" : "비밀번호 변경"}
          </button>
        </form>
      </Card>
    </>
  );
}

function Field({ label, name }: { label: string; name: string }) {
  return (
    <label className="text-[13px] font-semibold text-sub">
      {label}
      <input
        name={name}
        type="password"
        autoComplete="new-password"
        required
        className="mt-1 h-11 w-full rounded-[var(--radius-input)] border-[1.5px] border-line px-3.5 text-[14.5px] outline-none focus:border-coral"
      />
    </label>
  );
}
