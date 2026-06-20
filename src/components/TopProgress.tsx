"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// 페이지 이동 동안 화면 중앙에 큰 로딩 오버레이 (느린 서버에서도 확실히 보임).
// 아주 빠른 이동엔 깜빡이지 않도록 120ms 지연 후 표시.
export default function TopProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)
        return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (
        href &&
        a.origin === window.location.origin &&
        !a.target &&
        a.pathname !== window.location.pathname
      ) {
        clear();
        timer.current = setTimeout(() => setActive(true), 120);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // 경로가 바뀌면(이동 완료) 즉시 종료
  useEffect(() => {
    clear();
    setActive(false);
  }, [pathname]);

  // 상단 얇은 바도 같이
  return (
    <>
      {active && (
        <>
          <div className="fixed inset-x-0 top-0 z-[90] h-1 overflow-hidden bg-coral-tint">
            <div className="h-full w-2/5 animate-[lh-bar_1s_ease-in-out_infinite] rounded-full bg-coral" />
          </div>
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-bg/70 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3 rounded-[16px] border border-line bg-surface px-8 py-6 shadow-xl">
              <span className="h-10 w-10 animate-spin rounded-full border-4 border-coral-tint border-t-coral" />
              <span className="text-[13.5px] font-semibold text-sub">불러오는 중…</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
