import { createClient } from "@supabase/supabase-js";

// 서버 전용. service role 키 → RLS 우회. 절대 클라이언트로 노출 금지.
// 역할 기반 인가는 호출하는 쪽(앱 코드)에서 강제한다.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
