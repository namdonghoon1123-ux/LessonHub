import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 로그인 지속용 쿠키 수명 (~400일, 브라우저 최대치). 로그인 거의 안 풀림.
export const PERSIST_MAX_AGE = 60 * 60 * 24 * 400;

// 서버 컴포넌트/Route Handler용. 로그인 세션(쿠키) 기반 → RLS 적용.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(
                name,
                value,
                value ? { ...options, maxAge: PERSIST_MAX_AGE } : options,
              ),
            );
          } catch {
            // 서버 컴포넌트에서 호출 시 무시 (미들웨어가 세션 갱신 담당)
          }
        },
      },
    },
  );
}
