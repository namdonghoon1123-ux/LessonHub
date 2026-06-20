// 데모 계정 시드. secret 키로 auth 사용자 생성 → 트리거가 profiles 자동 생성.
// 사용: node --env-file=.env.local scripts/seed.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) {
  console.error("env 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO = [
  { key: "admin",   email: "admin@lessonhub.test",   password: "admin1234",   name: "관리자",   role: "POWER_ADMIN", tier: null },
  { key: "teacher", email: "teacher@lessonhub.test", password: "teacher1234", name: "이지원",   role: "TEACHER",     tier: null },
  { key: "student", email: "student@lessonhub.test", password: "student1234", name: "최서연",   role: "STUDENT",     tier: "FULL" },
];

const ids = {};

for (const d of DEMO) {
  const { data, error } = await sb.auth.admin.createUser({
    email: d.email,
    password: d.password,
    email_confirm: true,
    user_metadata: { name: d.name, role: d.role, ...(d.tier ? { tier: d.tier } : {}) },
  });
  if (error) {
    if (/registered|already/i.test(error.message)) {
      // 이미 존재 → id 조회
      const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list.users.find((u) => u.email === d.email);
      ids[d.key] = found?.id;
      console.log(`= ${d.email} 이미 존재 (id ${found?.id?.slice(0, 8)})`);
    } else {
      console.error(`✗ ${d.email}: ${error.message}`);
      process.exit(1);
    }
  } else {
    ids[d.key] = data.user.id;
    console.log(`✓ ${d.email} 생성 (id ${data.user.id.slice(0, 8)})`);
  }
}

// teacher_profiles
{
  const { error } = await sb.from("teacher_profiles").upsert(
    {
      teacher_id: ids.teacher,
      display_name: "이지원",
      subject: "피아노",
      slug: "jiwon-piano",
      lesson_duration_min: 30,
      bio: "어린이부터 성인까지 1:1 피아노 레슨",
    },
    { onConflict: "teacher_id" },
  );
  console.log(error ? `✗ teacher_profiles: ${error.message}` : "✓ teacher_profiles (이지원·피아노·/t/jiwon-piano)");
}

// 학생 ↔ 선생 연결 (ACTIVE)
{
  const { error } = await sb.from("links").upsert(
    { student_id: ids.student, teacher_id: ids.teacher, status: "ACTIVE" },
    { onConflict: "student_id,teacher_id" },
  );
  console.log(error ? `✗ link: ${error.message}` : "✓ link 최서연 → 이지원 (ACTIVE)");
}

// 검증: profiles 행 확인
const { data: profs } = await sb
  .from("profiles")
  .select("name, role, student_tier")
  .order("role");
console.log("\n=== profiles ===");
for (const p of profs ?? []) console.log(`  ${p.role.padEnd(12)} ${p.name} ${p.student_tier ?? ""}`);
console.log("\n🎉 시드 완료");
