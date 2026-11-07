"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Share2, Megaphone, Camera, Zap, Globe, Palette, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { DEFAULT_ANSWERS, TEMPLATE_KINDS, type TemplateKind } from "@/lib/contracts/templateFactory";
import { cn } from "@/lib/cn";

const KIND_ICONS: Record<TemplateKind, typeof Share2> = {
  "redes-sociais": Share2,
  "trafego-pago": Megaphone,
  instagram: Camera,
  "social-trafego": Zap,
  "marketing-360": Globe,
  "criacao-conteudo": Palette,
};

/** Valores numéricos como string pros inputs - convertidos no envio. */
type FormState = {
  permanencia: string;
  multaRompimento: string;
  avisoRenovacao: string;
  avisoCancelamento: string;
  envioAntecedencia: string;
  prazoAprovacao: string;
  rodadasRevisao: string;
  silencioAprova: boolean;
  primeiroPlanejamento: string;
  alteracaoCronograma: string;
  artesAntecedencia: string;
  eventosAntecedencia: string;
  canais: string;
  horario: string;
  prazoResposta: string;
  relatorio: string;
  multaAtraso: string;
  jurosMes: string;
  suspensaoPagamento: string;
  confidencialidade: string;
  incidenteDados: string;
  comunicarOcorrencia: string;
  suspensaoMax: string;
  retomada: string;
};

const d = DEFAULT_ANSWERS;
const INITIAL: FormState = {
  permanencia: "",
  multaRompimento: "uma mensalidade",
  avisoRenovacao: String(d.avisoRenovacaoDias),
  avisoCancelamento: String(d.avisoCancelamentoDias),
  envioAntecedencia: String(d.envioAntecedenciaDias),
  prazoAprovacao: String(d.prazoAprovacaoHoras),
  rodadasRevisao: String(d.rodadasRevisao),
  silencioAprova: d.silencioAprova,
  primeiroPlanejamento: String(d.primeiroPlanejamentoDias),
  alteracaoCronograma: String(d.alteracaoCronogramaHoras),
  artesAntecedencia: String(d.artesAntecedenciaDias),
  eventosAntecedencia: String(d.eventosAntecedenciaDias),
  canais: d.canais,
  horario: d.horarioAtendimento,
  prazoResposta: String(d.prazoRespostaHoras),
  relatorio: d.relatorioPeriodicidade,
  multaAtraso: String(d.multaAtrasoPercent),
  jurosMes: String(d.jurosMesPercent),
  suspensaoPagamento: String(d.suspensaoPagamentoDias),
  confidencialidade: String(d.confidencialidadeAnos),
  incidenteDados: String(d.incidenteDadosHoras),
  comunicarOcorrencia: String(d.comunicarOcorrenciaHoras),
  suspensaoMax: String(d.suspensaoMaxDias),
  retomada: String(d.retomadaDias),
};

function num(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && value.trim() !== "" ? n : fallback;
}

function GroupLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent border-b border-border pb-2">
      {children}
    </p>
  );
}

/**
 * Fluxo guiado dos modelos prontos: a pessoa escolhe o serviço, responde as
 * perguntas (absolutamente tudo que é alterável no texto: prazos, multas,
 * percentuais e janelas) e o contrato inteiro é gerado no modelo, 100%
 * preenchido no formato legal design da página pública.
 */
export function GuidedTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [kind, setKind] = useState<TemplateKind>("redes-sociais");
  const [form, setForm] = useState<FormState>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/configuracoes/contratos/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          permanenciaMeses: form.permanencia.trim() ? num(form.permanencia, 6) : null,
          multaRompimento: form.permanencia.trim() ? form.multaRompimento : "",
          avisoRenovacaoDias: num(form.avisoRenovacao, d.avisoRenovacaoDias),
          avisoCancelamentoDias: num(form.avisoCancelamento, d.avisoCancelamentoDias),
          envioAntecedenciaDias: num(form.envioAntecedencia, d.envioAntecedenciaDias),
          prazoAprovacaoHoras: num(form.prazoAprovacao, d.prazoAprovacaoHoras),
          rodadasRevisao: num(form.rodadasRevisao, d.rodadasRevisao),
          silencioAprova: form.silencioAprova,
          primeiroPlanejamentoDias: num(form.primeiroPlanejamento, d.primeiroPlanejamentoDias),
          alteracaoCronogramaHoras: num(form.alteracaoCronograma, d.alteracaoCronogramaHoras),
          artesAntecedenciaDias: num(form.artesAntecedencia, d.artesAntecedenciaDias),
          eventosAntecedenciaDias: num(form.eventosAntecedencia, d.eventosAntecedenciaDias),
          canais: form.canais.trim() || d.canais,
          horarioAtendimento: form.horario.trim() || d.horarioAtendimento,
          prazoRespostaHoras: num(form.prazoResposta, d.prazoRespostaHoras),
          relatorioPeriodicidade: form.relatorio.trim() || d.relatorioPeriodicidade,
          multaAtrasoPercent: num(form.multaAtraso, d.multaAtrasoPercent),
          jurosMesPercent: num(form.jurosMes, d.jurosMesPercent),
          suspensaoPagamentoDias: num(form.suspensaoPagamento, d.suspensaoPagamentoDias),
          confidencialidadeAnos: num(form.confidencialidade, d.confidencialidadeAnos),
          incidenteDadosHoras: num(form.incidenteDados, d.incidenteDadosHoras),
          comunicarOcorrenciaHoras: num(form.comunicarOcorrencia, d.comunicarOcorrenciaHoras),
          suspensaoMaxDias: num(form.suspensaoMax, d.suspensaoMaxDias),
          retomadaDias: num(form.retomada, d.retomadaDias),
        }),
      });
      if (!res.ok) {
        setSaveError("Não foi possível gerar o modelo - confira as respostas e tente de novo");
        return;
      }
      const template = await res.json();
      router.push(`/configuracoes/contratos/${template.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Modelo guiado" titleAccent="responda e o contrato sai 100%" width="xl">
      <div className="flex flex-col gap-7">
        <div>
          <p className="text-[13px] font-medium text-muted pl-1.5 mb-2">Qual serviço?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {TEMPLATE_KINDS.map((k) => {
              const Icon = KIND_ICONS[k.kind];
              const active = kind === k.kind;
              return (
                <button
                  key={k.kind}
                  type="button"
                  onClick={() => setKind(k.kind)}
                  className={cn(
                    "rounded-2xl border px-4 py-3.5 flex flex-col items-start gap-2 text-left transition-all cursor-pointer",
                    active ? "border-accent bg-accent/[0.07] shadow-sm shadow-accent/20" : "border-border bg-surface hover:border-border-2",
                  )}
                >
                  <span className={cn("w-8 h-8 rounded-xl flex items-center justify-center", active ? "bg-accent text-white" : "bg-surface-2 text-muted")}>
                    <Icon size={15} />
                  </span>
                  <span className="text-xs font-semibold text-ink leading-snug">{k.name}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-2 mt-2 pl-1.5">
            Todas as respostas entram no texto do contrato. Gerar de novo pro mesmo serviço atualiza o modelo existente.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <GroupLabel>Vigência e cancelamento</GroupLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Permanência mínima (meses)" hint="Vazio = sem permanência">
              <Input type="number" min={1} value={form.permanencia} onChange={(e) => set("permanencia", e.target.value)} placeholder="Ex: 6" />
            </Field>
            <Field label="Multa se romper antes" hint="Usada só com permanência">
              <Input value={form.multaRompimento} onChange={(e) => set("multaRompimento", e.target.value)} placeholder="uma mensalidade" disabled={!form.permanencia.trim()} />
            </Field>
            <Field label="Aviso pra não renovar (dias)">
              <Input type="number" min={1} value={form.avisoRenovacao} onChange={(e) => set("avisoRenovacao", e.target.value)} />
            </Field>
            <Field label="Aviso de cancelamento (dias)">
              <Input type="number" min={1} value={form.avisoCancelamento} onChange={(e) => set("avisoCancelamento", e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <GroupLabel>Aprovações e produção</GroupLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Envio antes da publicação (dias úteis)">
              <Input type="number" min={1} value={form.envioAntecedencia} onChange={(e) => set("envioAntecedencia", e.target.value)} />
            </Field>
            <Field label="Prazo de aprovação (horas úteis)">
              <Input type="number" min={1} value={form.prazoAprovacao} onChange={(e) => set("prazoAprovacao", e.target.value)} />
            </Field>
            <Field label="Rodadas de revisão">
              <Input type="number" min={1} value={form.rodadasRevisao} onChange={(e) => set("rodadasRevisao", e.target.value)} />
            </Field>
            <Field label="1º planejamento em (dias)">
              <Input type="number" min={1} value={form.primeiroPlanejamento} onChange={(e) => set("primeiroPlanejamento", e.target.value)} />
            </Field>
            <Field label="Alterar cronograma em (horas)">
              <Input type="number" min={1} value={form.alteracaoCronograma} onChange={(e) => set("alteracaoCronograma", e.target.value)} />
            </Field>
            <Field label="Artes avulsas (dias úteis)">
              <Input type="number" min={1} value={form.artesAntecedencia} onChange={(e) => set("artesAntecedencia", e.target.value)} />
            </Field>
            <Field label="Cobertura de eventos (dias)">
              <Input type="number" min={1} value={form.eventosAntecedencia} onChange={(e) => set("eventosAntecedencia", e.target.value)} />
            </Field>
          </div>
          <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2/40 px-4 py-3.5 cursor-pointer">
            <Checkbox checked={form.silencioAprova} onChange={(e) => set("silencioAprova", e.target.checked)} />
            <span className="text-xs leading-relaxed text-ink">
              <span className="font-semibold">Silêncio conta como aprovação.</span> Se o cliente não responder dentro do
              prazo, o material é considerado aprovado pra não travar o calendário.
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <GroupLabel>Atendimento e relatórios</GroupLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Canais oficiais">
              <Input value={form.canais} onChange={(e) => set("canais", e.target.value)} placeholder="WhatsApp e e-mail" />
            </Field>
            <Field label="Horário de atendimento">
              <Input value={form.horario} onChange={(e) => set("horario", e.target.value)} placeholder="das 09h00 às 18h00, de segunda a sexta" />
            </Field>
            <Field label="Resposta em até (horas úteis)">
              <Input type="number" min={1} value={form.prazoResposta} onChange={(e) => set("prazoResposta", e.target.value)} />
            </Field>
            <Field label="Relatório (periodicidade)">
              <Input value={form.relatorio} onChange={(e) => set("relatorio", e.target.value)} placeholder="mensal" />
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <GroupLabel>Pagamento em atraso</GroupLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Multa sobre a parcela (%)">
              <Input type="number" min={0} step="0.5" value={form.multaAtraso} onChange={(e) => set("multaAtraso", e.target.value)} />
            </Field>
            <Field label="Juros ao mês (%)">
              <Input type="number" min={0} step="0.5" value={form.jurosMes} onChange={(e) => set("jurosMes", e.target.value)} />
            </Field>
            <Field label="Suspender serviço após (dias)">
              <Input type="number" min={1} value={form.suspensaoPagamento} onChange={(e) => set("suspensaoPagamento", e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <GroupLabel>Proteções e suspensão</GroupLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Confidencialidade (anos)">
              <Input type="number" min={1} value={form.confidencialidade} onChange={(e) => set("confidencialidade", e.target.value)} />
            </Field>
            <Field label="Comunicar incidente de dados (horas)">
              <Input type="number" min={1} value={form.incidenteDados} onChange={(e) => set("incidenteDados", e.target.value)} />
            </Field>
            <Field label="Comunicar ocorrência (horas)">
              <Input type="number" min={1} value={form.comunicarOcorrencia} onChange={(e) => set("comunicarOcorrencia", e.target.value)} />
            </Field>
            <Field label="Suspensão máxima (dias)">
              <Input type="number" min={7} value={form.suspensaoMax} onChange={(e) => set("suspensaoMax", e.target.value)} />
            </Field>
            <Field label="Retomada em até (dias)">
              <Input type="number" min={1} value={form.retomada} onChange={(e) => set("retomada", e.target.value)} />
            </Field>
          </div>
        </div>

        {saveError && <p className="text-xs text-danger">{saveError}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Sparkles size={14} /> {saving ? "Gerando..." : "Gerar contrato no modelo"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
