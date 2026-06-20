// 'demo' 선생님 계정 + 데이터 왕창. 멱등(있으면 데이터 재생성).
// 사용: node --env-file=.env.local scripts/seed-demo-teacher.mjs
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const pad = (n) => String(n).padStart(2, "0");
const KST = 9 * 3600 * 1000;
const synth = () => `u-${globalThis.crypto.randomUUID()}@lessonhub.local`;

let { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
const byUsername = new Map();
for (const u of list.users) {
  const un = u.user_metadata?.username;
  if (un) byUsername.set(un, u.id);
}
// profiles에서 username 보강(메타에 없을 수 있음)
{
  const { data: profs } = await sb.from("profiles").select("id, username");
  for (const p of profs ?? []) if (p.username) byUsername.set(p.username, p.id);
}

async function ensureTeacher(username, name, password) {
  if (byUsername.has(username)) return { id: byUsername.get(username), pw: null };
  let pw = password;
  let res = await sb.auth.admin.createUser({ email: synth(), password: pw, email_confirm: true, user_metadata: { username, name, role: "TEACHER" } });
  if (res.error && /(least|password|6)/i.test(res.error.message)) {
    pw = "demo1234";
    res = await sb.auth.admin.createUser({ email: synth(), password: pw, email_confirm: true, user_metadata: { username, name, role: "TEACHER" } });
  }
  if (res.error) throw new Error(`teacher ${username}: ${res.error.message}`);
  byUsername.set(username, res.data.user.id);
  return { id: res.data.user.id, pw };
}
async function ensureStudent(username, name) {
  if (byUsername.has(username)) return byUsername.get(username);
  const res = await sb.auth.admin.createUser({ email: synth(), password: "demo1234", email_confirm: true, user_metadata: { username, name, role: "STUDENT", tier: "FULL" } });
  if (res.error) throw new Error(`student ${username}: ${res.error.message}`);
  byUsername.set(username, res.data.user.id);
  return res.data.user.id;
}

const demo = await ensureTeacher("demo", "데모 선생님", "demo");
const tId = demo.id;
const usedPw = demo.pw; // null이면 이미 존재(비번 모름)
console.log(`✓ demo 선생님 (id ${tId.slice(0,8)})${usedPw ? ` · 비번 ${usedPw}` : " · 이미 존재"}`);

// teacher_profile + 가용시간(왕창: 월~토 09-12, 13-21)
await sb.from("teacher_profiles").upsert({ teacher_id: tId, display_name: "데모 선생님", subject: "피아노", slug: "demo", bio: "데모용 선생님 계정입니다. 무엇이든 눌러보세요!", lesson_duration_min: 60 }, { onConflict: "teacher_id" });
await sb.from("weekly_availabilities").delete().eq("teacher_id", tId);
const avail = [];
for (let wd = 1; wd <= 6; wd++) { avail.push({ teacher_id: tId, weekday: wd, start_time: "09:00", end_time: "12:00", lesson_title: "피아노 레슨" }); avail.push({ teacher_id: tId, weekday: wd, start_time: "13:00", end_time: "21:00", lesson_title: "피아노 레슨" }); }
await sb.from("weekly_availabilities").insert(avail);
console.log("✓ 가용시간 (월~토 09-12, 13-21)");

// 학생 10명
const STUD = [["student","최서연"],["student2","이도윤"],["student3","정하준"],["student4","강민서"],["student5","윤지우"],["student6","한서진"],["student7","오세훈"],["student8","임채원"],["student9","배서아"],["student10","문지호"]];
const sIds = {};
for (const [un, nm] of STUD) sIds[un] = await ensureStudent(un, nm);
console.log(`✓ 학생 ${STUD.length}명`);

// 연결(ACTIVE) + 메모 + 잔여횟수
await sb.from("links").delete().eq("teacher_id", tId);
const memos = ["바이엘 진행 중, 손목 긴장 주의","체르니 30번. 박자 안정적","성인 취미반, 가요 반주 선호","입시 준비, 주 2회 권장","왕초보. 칭찬 위주로","",""];
let li = 0;
for (const [un] of STUD) {
  const remaining = [8, 4, null, 12, 0, null, 6, null, 10, 3][li] ?? null;
  await sb.from("links").insert({ student_id: sIds[un], teacher_id: tId, status: "ACTIVE", teacher_memo: memos[li % memos.length] || null, remaining_lessons: remaining });
  li++;
}
console.log("✓ 연결 10명 (메모·잔여횟수 포함)");

// 슬롯 배정(학생별 distinct weekday+hour)
const SLOTS = [[1,"09:00"],[1,"10:00"],[2,"14:00"],[2,"15:00"],[3,"16:00"],[3,"17:00"],[4,"13:00"],[5,"18:00"],[6,"10:00"],[6,"19:00"]];
function dateForWeek(weekday, off) {
  const nowK = new Date(Date.now() + KST);
  const cur = nowK.getUTCDay();
  const d = new Date(Date.UTC(nowK.getUTCFullYear(), nowK.getUTCMonth(), nowK.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + (weekday - cur) + off * 7);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
}
const utcISO = (date, hhmm) => new Date(`${date}T${hhmm}:00+09:00`).toISOString();
const MSG = [
  "오늘 박자 감각이 좋았어요! 이 영상 참고해서 복습해보세요 https://youtu.be/dQw4w9WgXcQ",
  "손목 힘이 잘 빠졌습니다. 다음 시간엔 스케일 속도를 올려볼게요.",
  "코드 전환이 매끄러워졌네요. 꾸준히 잘 하고 있어요!",
  "왼손 리듬을 조금 더 또렷하게. 연습 영상 https://youtu.be/9bZkp7q19f0",
  "",
];
const PRIV = ["다음 진도 점검","칭찬 위주","결석 잦음 주의",""];

await sb.from("bookings").delete().eq("teacher_id", tId);
const rows = [];
const now = Date.now();
let si = 0;
for (const [un] of STUD) {
  const [wd, hh] = SLOTS[si];
  for (let off = -12; off <= 3; off++) {
    const date = dateForWeek(wd, off);
    const startISO = utcISO(date, hh);
    const past = new Date(startISO).getTime() < now;
    let status = "BOOKED", extra = {};
    if (past) {
      const r = (si + off + 20) % 10;
      if (r === 0) { status = "NO_SHOW"; extra = { no_show_at: startISO }; }
      else if (r === 1) { status = "CANCELED"; extra = { canceled_at: startISO, canceled_by: sIds[un] }; }
      else {
        status = "COMPLETED";
        const m = MSG[(si + off + 7) % MSG.length];
        const p = PRIV[(si + off) % PRIV.length];
        extra = { completed_at: startISO, teacher_comment: m || null, comment_delivered_at: m ? startISO : null, teacher_private_comment: p || null };
      }
    }
    rows.push({ teacher_id: tId, student_id: sIds[un], start_at: startISO, duration_min: 60, status, lesson_title_snapshot: "피아노 레슨", ...extra });
  }
  si++;
}
const { error: be } = await sb.from("bookings").insert(rows);
console.log(be ? `✗ bookings ${be.message}` : `✓ 예약 ${rows.length}건 (과거 완료/노쇼/취소 + 미래 + 코멘트/유튜브)`);

const { count } = await sb.from("bookings").select("id", { count: "exact", head: true }).eq("teacher_id", tId);
console.log(`\n🎉 완료 — demo 선생님 예약 ${count}건`);
console.log(`로그인: 아이디 demo / 비번 ${usedPw ?? "(기존 비번)"}`);
