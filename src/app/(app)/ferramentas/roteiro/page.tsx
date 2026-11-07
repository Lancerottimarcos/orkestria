import { requireModulePage } from "@/lib/authz";
import { RoteiroView } from "@/components/ferramentas/RoteiroView";

export default async function RoteiroPage() {
  await requireModulePage("ferramentas");
  return <RoteiroView />;
}
