"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navByRole, type NavItem } from "@/lib/nav";
import { roleLabel, type Profile } from "@/lib/types";
import { logout } from "@/app/auth/actions";
import { LogoMark } from "@/components/ui";

export default function Nav({
  profile,
  badges = {},
}: {
  profile: Profile;
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const tabs = navByRole[profile.role];
  const home = tabs[0]?.href ?? "/";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: "var(--gradient-brand)" }}
      />

      {/* 상단 바 */}
      <div className="flex h-[54px] items-center gap-3 pl-4 pr-3">
        <Link href={home} className="flex shrink-0 items-center gap-2">
          <LogoMark size={28} />
          <span className="text-[16px] font-bold tracking-[-0.3px]">LessonHub</span>
        </Link>

        {/* 데스크톱 탭 (인라인) */}
        <nav className="hidden flex-1 items-center gap-1 px-2 md:flex">
          <Tabs tabs={tabs} pathname={pathname} badges={badges} />
        </nav>

        {/* 우측 컨트롤 */}
        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          <span className="hidden text-[12.5px] font-semibold text-sub sm:inline">
            {roleLabel[profile.role]}
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-coral-tint text-[13px] font-bold text-coral-deep">
            {profile.name.slice(0, 1)}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-[8px] px-2 py-2 text-[12.5px] font-medium text-muted transition-colors hover:text-coral-deep"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>

      {/* 모바일 탭 (스크롤 행) */}
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] md:hidden">
        <Tabs tabs={tabs} pathname={pathname} badges={badges} />
      </nav>
    </header>
  );
}

function Tabs({
  tabs,
  pathname,
  badges,
}: {
  tabs: NavItem[];
  pathname: string;
  badges: Record<string, number>;
}) {
  // 가장 긴 prefix 매칭 탭만 활성 (예: /student 와 /student/teachers 충돌 방지)
  const activeHref = tabs
    .filter((t) => pathname === t.href || pathname.startsWith(t.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <>
      {tabs.map((t) => {
        const active = t.href === activeHref;
        const badge = badges[t.href];
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              "relative flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition-colors " +
              (active
                ? "bg-coral-tint text-coral-deep"
                : "text-muted hover:text-sub")
            }
          >
            {t.label}
            {badge ? (
              <span className="grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </>
  );
}
