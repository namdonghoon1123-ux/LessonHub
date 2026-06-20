import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 비로그인 접근 허용 경로 (정확히 일치하거나 하위 경로)
const PUBLIC_PREFIXES = ["/login", "/signup", "/t", "/api/ics"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;

  const isPublic =
    path === "/" ||
    PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // 정적 자산/이미지 제외
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.png$).*)",
  ],
};
