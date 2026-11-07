import { requireModulePage } from "@/lib/authz";
import { DatesCalendarView } from "@/components/dates/DatesCalendarView";

export default async function DatasComemorativasPage() {
  await requireModulePage("datas-comemorativas");

  return <DatesCalendarView />;
}
