export default function Placeholder({
  title,
  desc,
}: {
  title: string;
  desc?: string;
}) {
  return (
    <section>
      <h1 className="text-[22px] font-extrabold tracking-[-0.4px]">{title}</h1>
      {desc && <p className="mt-2 text-sm text-sub">{desc}</p>}
      <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-12 text-center text-[13px] text-muted">
        구현 예정 화면입니다.
      </div>
    </section>
  );
}
