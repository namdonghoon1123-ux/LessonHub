"use client";

import { useActionState } from "react";
import { signup, type AuthState } from "@/app/auth/actions";
import { LogoMark } from "@/components/ui";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signup,
    {},
  );

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="w-full max-w-[360px]">
        <div className="mb-7 flex items-center gap-2.5">
          <LogoMark size={36} radius={10} />
          <span className="text-[18px] font-extrabold tracking-[-0.4px]">
            LessonHub
          </span>
        </div>

        <h2 className="text-[25px] font-extrabold tracking-[-0.4px]">회원가입</h2>
        <p className="mt-1.5 text-sm text-muted">학생 계정을 만들어 레슨을 예약하세요.</p>

        <form action={formAction} className="mt-7 flex flex-col gap-4">
          <Field label="이름" name="name" type="text" autoComplete="name" />
          <Field label="이메일" name="email" type="email" autoComplete="email" />
          <Field
            label="비밀번호"
            name="password"
            type="password"
            autoComplete="new-password"
          />

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
            {pending ? "가입 중…" : "회원가입"}
          </button>
        </form>

        <p className="mt-6 text-center text-[14px] text-sub">
          이미 계정이 있으신가요?{" "}
          <a href="/login" className="font-bold text-coral-deep">
            로그인
          </a>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[13px] font-semibold text-sub">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="h-12 w-full rounded-[var(--radius-input)] border-[1.5px] border-line bg-surface px-3.5 text-[14.5px] outline-none transition-colors focus:border-coral"
      />
    </div>
  );
}
