import { requireModulePage } from "@/lib/authz";
import { QrCodeView } from "@/components/ferramentas/QrCodeView";

export default async function QrCodePage() {
  await requireModulePage("ferramentas");
  return <QrCodeView />;
}
