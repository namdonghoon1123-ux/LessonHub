"use client";

import { useState } from "react";
import { Card } from "@/components/ui";

export default function CalendarSync({ icsUrl }: { icsUrl: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(icsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <Card className="mb-5 p-5">
      <h2 className="mb-1 text-[15px] font-bold">캘린더 연동</h2>
      <p className="mb-3 text-[12.5px] text-muted">
        이 주소를 아이폰 기본 캘린더나 구글 캘린더에 구독하면 예약이 자동으로 표시돼요.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={icsUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-[10px] border-[1.5px] border-line bg-line-soft px-3 py-2 text-[12.5px] text-sub outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className="h-10 shrink-0 rounded-[var(--radius-btn)] bg-coral px-4 text-[13px] font-bold text-white hover:opacity-95"
        >
          {copied ? "복사됨!" : "주소 복사"}
        </button>
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-4 text-[12px] text-muted">
        <li>구글 캘린더: 다른 캘린더 + → URL로 추가 → 주소 붙여넣기</li>
        <li>아이폰: 설정 → 캘린더 → 계정 → 계정 추가 → 기타 → 구독 캘린더</li>
      </ul>
    </Card>
  );
}
