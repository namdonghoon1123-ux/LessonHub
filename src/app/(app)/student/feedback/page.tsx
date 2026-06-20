import { requireRole } from "@/lib/auth";
import { getStudentFeedback, markFeedbackSeen } from "@/lib/data/bookings";
import { PageTitle } from "@/components/ui";
import FeedbackList, { type UIFeedback } from "./FeedbackList";

export default async function Page() {
  const me = await requireRole("STUDENT");
  const rows = await getStudentFeedback(me.id);
  const unseen = new Set(
    rows
      .filter((r) => r.comment_delivered_at && !r.comment_seen_at)
      .map((r) => r.id),
  );
  if (unseen.size > 0) await markFeedbackSeen(me.id);

  const items: UIFeedback[] = rows.map((r) => ({
    id: r.id,
    start_at: r.start_at,
    teacher_comment: r.teacher_comment,
    lesson_title: r.lesson_title_snapshot,
    teacher_name: r.teacher_name,
    isNew: unseen.has(r.id),
  }));

  return (
    <>
      <PageTitle title="피드백" desc="선생님이 남긴 레슨 코멘트입니다." />
      <FeedbackList items={items} />
    </>
  );
}
