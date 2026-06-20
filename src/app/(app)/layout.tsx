import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { countUnseenFeedback } from "@/lib/data/bookings";
import StudioBanner from "@/components/StudioBanner";
import Nav from "./_components/Nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const badges: Record<string, number> = {};
  if (profile.role === "STUDENT") {
    const n = await countUnseenFeedback(profile.id);
    if (n > 0) badges["/student/feedback"] = n;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav profile={profile} badges={badges} />
      <StudioBanner />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 md:p-7">
        {children}
      </main>
    </div>
  );
}
