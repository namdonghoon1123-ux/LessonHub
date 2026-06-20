// 데모 선생님(이지원) 주간 가능시간 시드 (월~금 10–12, 14–18). 멱등.
import { createClient } from "@supabase/supabase-js";
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
const teacher = list.users.find((u) => u.email === "teacher@lessonhub.test");
if (!teacher) { console.error("teacher 없음"); process.exit(1); }

await sb.from("weekly_availabilities").delete().eq("teacher_id", teacher.id);

const rows = [];
for (let wd = 1; wd <= 5; wd++) {
  rows.push({ teacher_id: teacher.id, weekday: wd, start_time: "10:00", end_time: "12:00", lesson_title: "피아노 레슨" });
  rows.push({ teacher_id: teacher.id, weekday: wd, start_time: "14:00", end_time: "18:00", lesson_title: "피아노 레슨" });
}
const { error } = await sb.from("weekly_availabilities").insert(rows);
console.log(error ? `✗ ${error.message}` : `✓ 주간 가능시간 ${rows.length}행 (월~금 10–12, 14–18)`);

const { data: check } = await sb
  .from("weekly_availabilities")
  .select("weekday, start_time, end_time")
  .eq("teacher_id", teacher.id)
  .order("weekday");
console.log("등록됨:", check?.length, "행");
