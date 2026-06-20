"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// 페이지 이동 시: 상단 진행바 + 하단 중앙 "불러오는 중" 플로팅(모바일에서도 잘 보임)
export default function TopProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

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
        setActive(true);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    setActive(false);
  }, [pathname]);

  if (!active) return null;
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[70] h-1 overflow-hidden bg-coral-tint">
        <div className="h-full w-2/5 animate-[lh-bar_1s_ease-in-out_infinite] rounded-full bg-coral" />
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[70] flex justify-center px-4">
        <div className="flex items-center gap-2 rounded-full bg-ink/90 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          불러오는 중…
        </div>
      </div>
    </>
  );
}
