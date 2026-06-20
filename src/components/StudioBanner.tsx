// 상단 스튜디오 안내 배너 (네이버 예약 링크). 지금은 고정값 — 추후 선생님 설정으로 확장.
const STUDIO = {
  name: "스튜디오 블루닷 음악연습실",
  area: "여의도",
  // 네이버 지도 장소 → 예약(ticket) 탭 (만료성 파라미터 제거한 안정 링크)
  naverUrl: "https://map.naver.com/p/entry/place/1152268854?placePath=/ticket",
};

export default function StudioBanner() {
  return (
    <div className="border-b border-line bg-coral-tint/50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-[13px]">
        <span aria-hidden>🎵</span>
        <span className="font-bold text-ink">{STUDIO.name}</span>
        <span className="text-sub">· {STUDIO.area}</span>
        <a
          href={STUDIO.naverUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto rounded-full bg-coral px-3 py-1.5 text-[12.5px] font-bold text-white hover:opacity-95"
        >
          네이버 예약 ›
        </a>
      </div>
    </div>
  );
}
