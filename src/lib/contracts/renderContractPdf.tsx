import path from "path";
import { Document, Page, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { renderTipTapDocToPdfNodes, type TipTapNode } from "./pdfNodes";
import { resolveVariables, type ContractVariableContext } from "./variables";

const styles = StyleSheet.create({
  page: { paddingTop: 90, paddingBottom: 70, paddingHorizontal: 56, fontSize: 11, fontFamily: "Helvetica", lineHeight: 1.5 },
  header: { position: "absolute", top: 24, left: 56, right: 56, height: 46, objectFit: "contain" },
  footer: { position: "absolute", bottom: 20, left: 56, right: 56, height: 36, objectFit: "contain" },
  watermark: { position: "absolute", top: "35%", left: "25%", width: "50%", opacity: 0.08 },
});

/** Converte a URL relativa salva no banco (/api/uploads/file/x.png) no caminho absoluto em disco, pro <Image> do react-pdf ler direto sem round-trip HTTP. */
function resolveUploadPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/api\/uploads\/file\/([a-zA-Z0-9._-]+)$/);
  if (!match) return null;
  return path.join(process.cwd(), "public", "uploads", match[1]);
}

export type ContractTemplateForRender = {
  bodyJson: string;
  watermarkUrl: string | null;
  headerUrl: string | null;
  footerUrl: string | null;
};

/** Monta o documento PDF final (variáveis já substituídas + marca d'água/cabeçalho/rodapé) e devolve os bytes. */
export async function renderContractPdf(
  template: ContractTemplateForRender,
  ctx: ContractVariableContext,
): Promise<Buffer> {
  const vars = resolveVariables(ctx);

  let doc: TipTapNode;
  try {
    doc = JSON.parse(template.bodyJson);
  } catch {
    doc = { type: "doc", content: [] };
  }

  const headerPath = resolveUploadPath(template.headerUrl);
  const footerPath = resolveUploadPath(template.footerUrl);
  const watermarkPath = resolveUploadPath(template.watermarkUrl);

  const pdfDoc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {watermarkPath && <Image src={watermarkPath} style={styles.watermark} fixed />}
        {headerPath && <Image src={headerPath} style={styles.header} fixed />}
        {footerPath && <Image src={footerPath} style={styles.footer} fixed />}
        <View>{renderTipTapDocToPdfNodes(doc, vars)}</View>
      </Page>
    </Document>
  );

  return renderToBuffer(pdfDoc as never);
}
