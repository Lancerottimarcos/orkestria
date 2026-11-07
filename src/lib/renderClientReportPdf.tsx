import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { ClientMetrics } from "./socialMetrics";
import { SOCIAL_NETWORK_LABELS } from "./socialNetworks";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 2 },
  subtitle: { fontSize: 11, color: "#666666", marginBottom: 4 },
  period: { fontSize: 9, color: "#999999", marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 10 },
  statsRow: { flexDirection: "row", gap: 24, marginBottom: 14 },
  statBox: { flexDirection: "column" },
  statValue: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  statLabel: { fontSize: 9, color: "#666666", marginTop: 2 },
  platformBlock: { marginBottom: 12, paddingBottom: 10, borderBottom: "1 solid #eeeeee" },
  platformTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#444444" },
  value: { fontFamily: "Helvetica-Bold" },
});

export type ClientReportSummary = {
  clientName: string;
  deliveredCards: number;
  approvedPosts: number;
  pendingPosts: number;
  rejectedOrChangesPosts: number;
};

export async function renderClientReportPdf(summary: ClientReportSummary, metrics: ClientMetrics): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Relatório mensal - {summary.clientName}</Text>
        <Text style={styles.period}>Gerado em {new Date().toLocaleDateString("pt-BR")} · últimos 30 dias</Text>

        <Text style={styles.sectionTitle}>Produção e aprovação</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{summary.deliveredCards}</Text>
            <Text style={styles.statLabel}>Demandas entregues</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{summary.approvedPosts}</Text>
            <Text style={styles.statLabel}>Posts aprovados</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{summary.pendingPosts}</Text>
            <Text style={styles.statLabel}>Aguardando aprovação</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{summary.rejectedOrChangesPosts}</Text>
            <Text style={styles.statLabel}>Pediram ajuste/reprovados</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Redes sociais</Text>
        {metrics.platforms.length === 0 ? (
          <Text style={styles.label}>Nenhuma rede com métrica coletada nesse período.</Text>
        ) : (
          metrics.platforms.map((p) => (
            <View key={p.platform} style={styles.platformBlock}>
              <Text style={styles.platformTitle}>{SOCIAL_NETWORK_LABELS[p.platform]} - {p.accountName}</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Seguidores</Text>
                <Text style={styles.value}>{p.followers ?? "-"}{p.followersDelta ? ` (${p.followersDelta > 0 ? "+" : ""}${p.followersDelta})` : ""}</Text>
              </View>
              {p.kpis.map((k) => (
                <View key={k.key} style={styles.row}>
                  <Text style={styles.label}>{k.label}</Text>
                  <Text style={styles.value}>{k.current ?? "-"}</Text>
                </View>
              ))}
            </View>
          ))
        )}
      </Page>
    </Document>
  );

  return renderToBuffer(doc as never);
}
