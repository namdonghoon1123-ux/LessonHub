import Link from "next/link";
import { notFound } from "next/navigation";
import { getTeacherBySlug } from "@/lib/data/teachers";

export default async function PublicTeacherPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const teacher = await getTeacherBySlug(slug);
  if (!teacher) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-[440px] overflow-hidden rounded-[18px] border border-line bg-surface">
        <div
          className="px-7 py-10 text-white"
          style={{ background: "var(--gradient-brand)" }}
        >
          <div className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-2xl font-extrabold text-coral">
            {teacher.name.slice(0, 1)}
          </div>
          <h1 className="mt-4 text-[26px] font-extrabold tracking-[-0.5px]">
            {teacher.name} 선생님
          </h1>
          {teacher.subject && (
            <p className="mt-1 text-[15px] text-white/90">{teacher.subject}</p>
          )}
        </div>
        <div className="p-7">
          {teacher.bio && (
            <p className="text-[14.5px] leading-relaxed text-sub">{teacher.bio}</p>
          )}
          <p className="mt-4 text-[13px] text-muted">
            레슨 시간 {teacher.lesson_duration_min}분 · Asia/Seoul
          </p>
          <Link
            href="/login"
            className="mt-6 grid h-12 w-full place-items-center rounded-[13px] bg-coral text-[15px] font-bold text-white hover:opacity-95"
          >
            로그인하고 예약하기
          </Link>
          <p className="mt-3 text-center text-[12.5px] text-muted">
            예약하려면 로그인 후 담당 선생님과 연결되어야 합니다.
          </p>
        </div>
      </div>
      <p className="mt-6 text-[12.5px] font-semibold text-muted">LessonHub</p>
    </main>
  );
}
