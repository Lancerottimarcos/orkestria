import { requireModulePage } from "@/lib/authz";
import { ContadorCaracteresView } from "@/components/ferramentas/ContadorCaracteresView";

export default async function ContadorPage() {
  await requireModulePage("ferramentas");
  return <ContadorCaracteresView />;
}
