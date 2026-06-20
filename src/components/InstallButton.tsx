"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export default function InstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    // 이미 설치(standalone)면 숨김
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari 전용
      window.navigator.standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }
    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (installed) return null;

  // Android/데스크톱 Chrome: 네이티브 설치 프롬프트
  if (deferred) {
    return (
      <button
        type="button"
        onClick={async () => {
          await deferred.prompt();
          setDeferred(null);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-coral-border bg-coral-tint py-3 text-[14px] font-bold text-coral-deep"
      >
        📲 홈 화면에 앱 설치
      </button>
    );
  }

  // iOS Safari: beforeinstallprompt 미지원 → 안내
  if (isIOS) {
    return (
      <div className="rounded-[13px] border border-line bg-surface p-3 text-center">
        <button
          type="button"
          onClick={() => setShowIOSHelp((v) => !v)}
          className="text-[13.5px] font-bold text-coral-deep"
        >
          📲 아이폰 홈 화면에 앱으로 추가하기
        </button>
        {showIOSHelp && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-sub">
            사파리 하단 <b>공유</b> 버튼(⬆️) → <b>홈 화면에 추가</b> → 추가
          </p>
        )}
      </div>
    );
  }

  return null;
}
