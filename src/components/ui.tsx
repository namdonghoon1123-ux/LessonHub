import type { ReactNode } from "react";

export function PageTitle({
  title,
  desc,
  right,
}: {
  title: string;
  desc?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.4px]">{title}</h1>
        {desc && <p className="mt-1.5 text-sm text-sub">{desc}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-line bg-surface ${className}`}
    >
      {children}
    </div>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full bg-coral-tint font-bold text-coral-deep"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

type ChipTone =
  | "coral"
  | "rose"
  | "success"
  | "muted"
  | "neutral"
  | "warn";

const chipTones: Record<ChipTone, string> = {
  coral: "bg-coral-tint text-coral-deep",
  rose: "bg-rose-tint text-rose",
  success: "bg-success-bg text-success",
  muted: "bg-line-soft text-muted",
  neutral: "bg-line-soft text-sub",
  warn: "bg-coral-tint text-coral-deep",
};

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: ChipTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[7px] px-2 py-0.5 text-[11.5px] font-semibold ${chipTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-12 text-center text-[13px] text-muted">
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  type = "submit",
  disabled,
  className = "",
}: {
  children: ReactNode;
  type?: "submit" | "button";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`h-10 rounded-[var(--radius-btn)] bg-coral px-4 text-[14px] font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
