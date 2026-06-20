import type { ReactNode } from "react";

const URL_RE = /(https?:\/\/[^\s]+)/g;

// 텍스트 내 URL(유튜브 링크 등)을 클릭 가능한 링크로 렌더
export function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  const out: ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;
    if (URL_RE.test(p)) {
      URL_RE.lastIndex = 0;
      out.push(
        <a
          key={i}
          href={p}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-coral-deep underline underline-offset-2 break-all"
        >
          {p}
        </a>,
      );
    } else {
      out.push(<span key={i}>{p}</span>);
    }
  }
  return <span className="whitespace-pre-wrap">{out}</span>;
}
