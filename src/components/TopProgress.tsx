"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// 페이지 이동 시 상단 진행바. 내부 링크 클릭 → 시작, 경로 변경 완료 → 종료.
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

  // 경로가 바뀌면(이동 완료) 종료
  useEffect(() => {
    setActive(false);
  }, [pathname]);

  if (!active) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden bg-coral-tint">
      <div className="h-full w-2/5 animate-[lh-bar_1s_ease-in-out_infinite] rounded-full bg-coral" />
    </div>
  );
}
