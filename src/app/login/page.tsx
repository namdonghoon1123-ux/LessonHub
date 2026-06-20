"use client";

import { useActionState } from "react";
import { login, type AuthState } from "@/app/auth/actions";
import { LogoMark } from "@/components/ui";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    login,
    {},
  );

  return (
    <div className="flex min-h-screen flex-1">
      {/* 좌측 브랜드 패널 (데스크톱 46%) */}
      <aside
        className="relative hidden w-[46%] flex-col justify-between overflow-hidden p-11 text-white md:flex"
        style={{ background: "var(--gradient-brand)" }}
      >
        <span className="pointer-events-none absolute -right-24 -top-24 h-[360px] w-[360px] rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -bottom-16 -left-16 h-[220px] w-[220px] rounded-full bg-white/[0.12]" />

        <div className="relative flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-white/95">
            <LogoMark size={30} radius={8} />
          </span>
          <span className="text-[21px] font-extrabold tracking-[-0.4px]">
            LessonHub
          </span>
        </div>

        <h1 className="relative text-[34px] font-extrabold leading-[1.25] tracking-[-0.8px]">
          레슨 예약,
          <br />
          이제 한 곳에서
          <br />
          간단하게.
        </h1>

        <p className="relative text-[12.5px] text-white/90">
          피아노 · 요가 · 과외 · 코칭을 위한 1:1 예약 도구
        </p>
      </aside>

      {/* 우측 폼 */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[360px]">
          <h2 className="text-[25px] font-extrabold tracking-[-0.4px]">
            다시 오신 걸 환영해요
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            계정에 로그인하고 레슨을 관리하세요.
          </p>

          <form action={formAction} className="mt-7 flex flex-col gap-4">
            <Field label="아이디" name="identifier" type="text" autoComplete="username" />
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-[13px] font-semibold text-sub">
                  비밀번호
                </label>
                <span className="text-[13px] font-semibold text-coral-deep">
                  비밀번호 찾기
                </span>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="h-12 w-full rounded-[var(--radius-input)] border-[1.5px] border-line bg-surface px-3.5 text-[14.5px] outline-none transition-colors focus:border-coral"
              />
            </div>

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
              {pending ? "로그인 중…" : "로그인"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[12.5px] text-muted">
            <span className="h-px flex-1 bg-line" />
            또는
            <span className="h-px flex-1 bg-line" />
          </div>

          <p className="text-center text-[14px] text-sub">
            처음이신가요?{" "}
            <a href="/signup" className="font-bold text-coral-deep">
              회원가입
            </a>
          </p>
        </div>
      </main>
    </div>
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
