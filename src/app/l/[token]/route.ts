import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStudentIdByShareToken } from "@/lib/data/bookings";

// 레슨 공유 링크: 학생을 자동 로그인시키고 내 예약으로 보냄 (보안 우선순위 낮음)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const loginRes = NextResponse.redirect(new URL("/login", req.url));

  const studentId = await getStudentIdByShareToken(token);
  if (!studentId) return loginRes;

  const admin = createAdminClient();
  const { data: u } = await admin.auth.admin.getUserById(studentId);
  const email = u?.user?.email;
  if (!email) return loginRes;

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !link?.properties?.hashed_token) return loginRes;

  const res = NextResponse.redirect(new URL("/student/bookings", req.url));
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(list) {
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );
  const { error: vErr } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (vErr) return loginRes;
  return res;
}
