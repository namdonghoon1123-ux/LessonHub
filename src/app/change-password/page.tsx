"use client";

import { useActionState } from "react";
import { changePasswordAction, type PwState } from "./actions";
import { LogoMark } from "@/components/ui";

export default function ChangePasswordPage() {
  const [state, formAction, pending] = useActionState<PwState, FormData>(
    changePasswordAction,
    {},
  );

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="w-full max-w-[360px]">
        <div className="mb-6 flex items-center gap-2.5">
          <LogoMark size={36} radius={10} />
          <span className="text-[18px] font-extrabold tracking-[-0.4px]">
            LessonHub
          </span>
        </div>

        <h2 className="text-[22px] font-extrabold tracking-[-0.4px]">
          비밀번호 변경
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          보안을 위해 새 비밀번호를 설정해 주세요.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <Field label="새 비밀번호" name="password" />
          <Field label="새 비밀번호 확인" name="confirm" />

          {state.error && (
            <p className="rounded-[10px] bg-coral-tint px-3 py-2 text-[13px] font-medium text-coral-deep">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 h-[50px] w-full rounded-[13px] bg-coral text-[16px] font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            {pending ? "변경 중…" : "변경하고 계속하기"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[13px] font-semibold text-sub">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="password"
        autoComplete="new-password"
        required
        className="h-12 w-full rounded-[var(--radius-input)] border-[1.5px] border-line bg-surface px-3.5 text-[14.5px] outline-none transition-colors focus:border-coral"
      />
    </div>
  );
}
