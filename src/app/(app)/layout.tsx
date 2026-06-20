import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import Nav from "./_components/Nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <Nav profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-6 md:p-7">
        {children}
      </main>
    </div>
  );
}
