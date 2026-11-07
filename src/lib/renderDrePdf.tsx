import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { DreMonth } from "./cashFlowProjection";
import { formatCurrency } from "./format";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666666", marginBottom: 20 },
  monthBlock: { marginBottom: 18, paddingBottom: 14, borderBottom: "1 solid #dddddd" },
  monthTitle: { fontSize: 12, marginBottom: 8, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#444444" },
  value: { fontFamily: "Helvetica-Bold" },
  resultPositive: { color: "#1a7a3c" },
  resultNegative: { color: "#c0392b" },
});

export async function renderDrePdf(months: DreMonth[], companyName: string): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>DRE simplificado - {companyName}</Text>
        <Text style={styles.subtitle}>Gerado em {new Date().toLocaleDateString("pt-BR")}</Text>

        {months.map((m) => (
          <View key={m.label} style={styles.monthBlock}>
            <Text style={styles.monthTitle}>{m.label}{m.isProjection ? " (projeção)" : ""}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Receita</Text>
              <Text style={styles.value}>{formatCurrency(m.income)}</Text>
            </View>
            {m.expenseByCategory.map((e) => (
              <View key={e.category} style={styles.row}>
                <Text style={styles.label}>  {e.category}</Text>
                <Text>{formatCurrency(e.amount)}</Text>
              </View>
            ))}
            <View style={styles.row}>
              <Text style={styles.label}>Despesa total</Text>
              <Text style={styles.value}>{formatCurrency(m.totalExpense)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Resultado</Text>
              <Text style={[styles.value, m.result >= 0 ? styles.resultPositive : styles.resultNegative]}>
                {formatCurrency(m.result)}
              </Text>
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );

  return renderToBuffer(doc as never);
}
