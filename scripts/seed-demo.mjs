// 풍부한 데모 데이터. 멱등(유저는 있으면 재사용, 예약/가용시간은 재생성).
// 사용: node --env-file=.env.local scripts/seed-demo.mjs
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const pad = (n) => String(n).padStart(2, "0");
const KST = 9 * 3600 * 1000;

// 현재 유저 맵
let { data: ulist } = await sb.auth.admin.listUsers({ page: 1, perPage: 500 });
const byEmail = new Map(ulist.users.map((u) => [u.email, u.id]));

async function ensureUser(email, name, role, tier) {
  if (byEmail.has(email)) return byEmail.get(email);
  const { data, error } = await sb.auth.admin.createUser({
    email, password: "demo1234", email_confirm: true,
    user_metadata: { name, role, ...(tier ? { tier } : {}) },
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  byEmail.set(email, data.user.id);
  return data.user.id;
}

const W = { MON:1, TUE:2, WED:3, THU:4, FRI:5, SAT:6, SUN:0 };

const TEACHERS = [
  { email:"teacher@lessonhub.test", name:"이지원", subject:"피아노", slug:"jiwon-piano",
    bio:"어린이부터 성인까지 1:1 피아노 레슨",
    avail:[[W.MON,"10:00","12:00"],[W.MON,"14:00","18:00"],[W.TUE,"10:00","12:00"],[W.WED,"14:00","18:00"],[W.THU,"10:00","12:00"],[W.FRI,"14:00","18:00"]] },
  { email:"teacher2@lessonhub.test", name:"박준영", subject:"기타", slug:"junyoung-guitar",
    bio:"통기타·일렉 입문 환영",
    avail:[[W.TUE,"13:00","19:00"],[W.THU,"13:00","19:00"],[W.SAT,"10:00","14:00"]] },
  { email:"teacher3@lessonhub.test", name:"김서윤", subject:"요가", slug:"seoyun-yoga",
    bio:"아침·저녁 1:1 요가",
    avail:[[W.MON,"07:00","09:00"],[W.WED,"18:00","21:00"],[W.FRI,"07:00","09:00"]] },
];
const STUDENTS = [
  ["student@lessonhub.test","최서연"],["student2@lessonhub.test","이도윤"],
  ["student3@lessonhub.test","정하준"],["student4@lessonhub.test","강민서"],
  ["student5@lessonhub.test","윤지우"],["student6@lessonhub.test","한서진"],
  ["student7@lessonhub.test","오세훈"],["student8@lessonhub.test","임채원"],
];

// 유저 생성
const tIds = {};
for (const t of TEACHERS) tIds[t.email] = await ensureUser(t.email, t.name, "TEACHER", null);
const sIds = {};
for (const [email,name] of STUDENTS) sIds[email] = await ensureUser(email, name, "STUDENT", "FULL");
console.log(`✓ 선생님 ${TEACHERS.length}, 학생 ${STUDENTS.length} 준비`);

// teacher_profiles + 가용시간
for (const t of TEACHERS) {
  const id = tIds[t.email];
  await sb.from("teacher_profiles").upsert(
    { teacher_id:id, display_name:t.name, subject:t.subject, slug:t.slug, bio:t.bio, lesson_duration_min:60 },
    { onConflict:"teacher_id" });
  await sb.from("weekly_availabilities").delete().eq("teacher_id", id);
  await sb.from("weekly_availabilities").insert(
    t.avail.map(([wd,s,e]) => ({ teacher_id:id, weekday:wd, start_time:s, end_time:e, lesson_title:`${t.subject} 레슨` })));
}
console.log("✓ teacher_profiles + 가용시간 (60분)");

// 연결: 학생들을 선생님에게 배정 (대부분 ACTIVE, 일부 PENDING)
const assign = [
  ["student@lessonhub.test","teacher@lessonhub.test","ACTIVE",W.MON,"10:00"],
  ["student2@lessonhub.test","teacher@lessonhub.test","ACTIVE",W.MON,"11:00"],
  ["student3@lessonhub.test","teacher@lessonhub.test","ACTIVE",W.WED,"14:00"],
  ["student4@lessonhub.test","teacher@lessonhub.test","ACTIVE",W.FRI,"15:00"],
  ["student5@lessonhub.test","teacher2@lessonhub.test","ACTIVE",W.TUE,"14:00"],
  ["student6@lessonhub.test","teacher2@lessonhub.test","ACTIVE",W.THU,"16:00"],
  ["student7@lessonhub.test","teacher3@lessonhub.test","ACTIVE",W.MON,"07:00"],
  ["student8@lessonhub.test","teacher3@lessonhub.test","ACTIVE",W.WED,"19:00"],
  ["student5@lessonhub.test","teacher@lessonhub.test","PENDING",null,null], // 연결 요청 대기
];
await sb.from("links").delete().neq("id","00000000-0000-0000-0000-000000000000");
for (const [se,te,st] of assign) {
  await sb.from("links").upsert({ student_id:sIds[se], teacher_id:tIds[te], status:st }, { onConflict:"student_id,teacher_id" });
}
console.log("✓ 연결 (ACTIVE 8 + PENDING 1)");

// 특정 weekday의 '이번 주' 날짜(KST) → +offsetWeeks
function dateForWeek(weekday, offsetWeeks) {
  const nowK = new Date(Date.now() + KST);
  const cur = nowK.getUTCDay();
  const d = new Date(Date.UTC(nowK.getUTCFullYear(), nowK.getUTCMonth(), nowK.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + (weekday - cur) + offsetWeeks * 7);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
}
function utcISO(dateStr, hhmm) { return new Date(`${dateStr}T${hhmm}:00+09:00`).toISOString(); }

const COMMENTS = [
  "오늘 박자 감각이 많이 좋아졌어요. 이 영상 참고해서 복습해보세요 https://youtu.be/dQw4w9WgXcQ",
  "손목 힘이 잘 빠졌습니다. 다음 시간엔 스케일 속도를 올려볼게요.",
  "자세가 안정적이었어요. 호흡에 조금 더 집중해봅시다.",
  "코드 전환이 매끄러워졌네요! 꾸준히 잘 하고 있어요.",
  "",
];
const PRIV = ["다음 시간 진도 점검 필요", "기초 탄탄, 칭찬 위주로", "", "결석 잦음 주의", ""];

// 예약 생성: 각 배정에 대해 -8주 ~ +2주 주간 반복
await sb.from("bookings").delete().neq("id","00000000-0000-0000-0000-000000000000");
const rows = [];
const now = Date.now();
let idx = 0;
for (const [se,te,st,wd,hh] of assign) {
  if (st !== "ACTIVE" || wd == null) continue;
  for (let off = -8; off <= 2; off++) {
    const date = dateForWeek(wd, off);
    const startISO = utcISO(date, hh);
    const isPast = new Date(startISO).getTime() < now;
    let status = "BOOKED", extra = {};
    if (isPast) {
      const r = (idx + off + 10) % 10;
      if (r === 0) status = "NO_SHOW", extra = { no_show_at: startISO };
      else if (r === 1) status = "CANCELED", extra = { canceled_at: startISO, canceled_by: sIds[se] };
      else {
        status = "COMPLETED";
        const c = COMMENTS[(idx + off + 5) % COMMENTS.length];
        const p = PRIV[(idx + off + 2) % PRIV.length];
        extra = { completed_at: startISO,
          teacher_comment: c || null, comment_delivered_at: c ? startISO : null,
          teacher_private_comment: p || null };
      }
    }
    rows.push({ teacher_id:tIds[te], student_id:sIds[se], start_at:startISO, duration_min:60,
      status, lesson_title_snapshot:"레슨", ...extra });
  }
  idx++;
}
// 충돌 방지: (teacher,start_at) 활성 중복 제거는 데이터상 weekday/hour가 학생별로 달라 없음
const { error: be } = await sb.from("bookings").insert(rows);
console.log(be ? `✗ bookings ${be.message}` : `✓ 예약 ${rows.length}건 (과거 완료/노쇼/취소 + 미래)`);

// 패치노트
await sb.from("patch_notes").delete().neq("id","00000000-0000-0000-0000-000000000000");
await sb.from("patch_notes").insert([
  { title:"반복 예약 기능 추가", body:"이제 매주 N회 반복 예약을 한 번에 잡을 수 있어요.", published_at:new Date(now-3*86400000).toISOString() },
  { title:"레슨 피드백", body:"선생님이 레슨 후 코멘트를 남기면 피드백 탭에서 확인할 수 있어요.", published_at:new Date(now-86400000).toISOString() },
  { title:"점검 안내(임시저장)", body:"이번 주말 서버 점검 예정.", published_at:null },
]);
console.log("✓ 패치노트 3건");

// 요약
const { count: bc } = await sb.from("bookings").select("id",{count:"exact",head:true});
console.log(`\n🎉 데모 시드 완료 — 예약 총 ${bc}건`);
console.log("로그인: 모든 데모계정 비번 demo1234 (admin/teacher/student@…는 기존 비번 유지)");
