import { requireModulePage } from "@/lib/authz";
import { EngajamentoView } from "@/components/ferramentas/EngajamentoView";

export default async function EngajamentoPage() {
  await requireModulePage("ferramentas");
  return <EngajamentoView />;
}
