import { requireRole } from "@/lib/auth";
import { getOverrides, getWeekly } from "@/lib/data/availability";
import { kstTodayStr } from "@/lib/time";
import ScheduleEditor from "./ScheduleEditor";

export default async function Page() {
  const me = await requireRole("TEACHER");
  const [weekly, overrides] = await Promise.all([
    getWeekly(me.id),
    getOverrides(me.id, kstTodayStr()),
  ]);
  return <ScheduleEditor weekly={weekly} overrides={overrides} />;
}
