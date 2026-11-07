import type { ReactNode } from "react";
import {
  Award,
  Banknote,
  Clock,
  Barcode,
  BarChart3,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  HeartHandshake,
  Landmark,
  LifeBuoy,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  PauseCircle,
  Phone,
  QrCode,
  Rocket,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  UserRound,
  FileX,
  Briefcase,
} from "lucide-react";
import type { TipTapNode } from "@/lib/contracts/pdfNodes";
import { renderInline } from "@/lib/contracts/htmlNodes";
import { formatCurrency, formatDate } from "@/lib/format";
import { signatureFontClass } from "@/lib/signatureFonts";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/components/propostas/types";
import { cn } from "@/lib/cn";

/**
 * Renderização "Visual Law" do contrato na tela: em vez de uma parede de
 * texto corrido, o mesmo documento TipTap dos modelos vira cartões de
 * partes, quadro resumo com régua de pagamento, índice navegável e
 * cláusulas numeradas em cards com ícone - sem mudar nada no editor nem
 * nos modelos, só na leitura.
 */

// ---------------------------------------------------------------------------
// Parser: divide o documento TipTap em seções a partir dos headings
// ---------------------------------------------------------------------------

export type ContractSection = {
  /** Número extraído de "Cláusula 4ª. ..." - null pra seções sem numeração */
  number: string | null;
  title: string;
  anchorId: string;
  blocks: TipTapNode[];
};

export type ParsedContract = {
  docTitle: string | null;
  sections: ContractSection[];
};

function textOf(nodes: TipTapNode[] | undefined, vars: Record<string, string>): string {
  if (!nodes) return "";
  return nodes
    .map((n) => {
      if (n.type === "text") return n.text ?? "";
      if (n.type === "variableChip") {
        const key = String(n.attrs?.key ?? "");
        return vars[key] ?? "";
      }
      return "";
    })
    .join("");
}

const CLAUSE_RE = /^cl[áa]usula\s+(\d+)ª?\.?\s*(.*)$/i;
const PARTIES_RE = /identifica[çc][ãa]o\s+das\s+partes/i;

export function parseContract(doc: TipTapNode, vars: Record<string, string>, anchorPrefix: string): ParsedContract {
  const sections: ContractSection[] = [];
  let docTitle: string | null = null;
  let current: ContractSection | null = null;

  for (const node of doc.content ?? []) {
    if (node.type === "heading") {
      const raw = textOf(node.content, vars).trim();
      if (docTitle === null && sections.length === 0 && !current) {
        docTitle = raw;
        continue;
      }
      const match = raw.match(CLAUSE_RE);
      current = {
        number: match ? match[1] : null,
        title: match ? match[2] || raw : raw,
        anchorId: `${anchorPrefix}-s${sections.length + 1}`,
        blocks: [],
      };
      sections.push(current);
      continue;
    }
    if (!current) {
      // conteúdo antes de qualquer heading de seção vira uma seção sem título
      current = { number: null, title: "", anchorId: `${anchorPrefix}-s${sections.length + 1}`, blocks: [] };
      sections.push(current);
    }
    current.blocks.push(node);
  }

  return { docTitle, sections };
}

/** Seção de identificação das partes - substituída pelos cards de partes, não renderizada como texto. */
export function isPartiesSection(section: ContractSection) {
  return PARTIES_RE.test(section.title);
}

// ---------------------------------------------------------------------------
// Ícone por assunto da cláusula
// ---------------------------------------------------------------------------

const CLAUSE_ICONS: { test: RegExp; icon: typeof Target }[] = [
  { test: /contratando|objeto/i, icon: Target },
  { test: /como o trabalho|metodologia/i, icon: Sparkles },
  { test: /compromissos da ag|obriga[çc][õo]es\s+d[ao]\s+contratada/i, icon: Briefcase },
  { test: /compromissos do cliente|obriga[çc][õo]es\s+d[oa]\s+contratante/i, icon: UserCheck },
  { test: /aprova[çc]/i, icon: CheckCircle2 },
  { test: /produ[çc][ãa]o|cronograma/i, icon: CalendarDays },
  { test: /conduta|respeito/i, icon: HeartHandshake },
  { test: /relat[óo]rio/i, icon: BarChart3 },
  { test: /suporte|comunica[çc]/i, icon: LifeBuoy },
  { test: /verba|m[íi]dia/i, icon: Megaphone },
  { test: /resultado|plataforma/i, icon: TrendingUp },
  { test: /ativos|titularidade|propriedade|conte[úu]dos/i, icon: Award },
  { test: /investimento|valor|pagamento/i, icon: Banknote },
  { test: /prote[çc][ãa]o de dados|lgpd/i, icon: ShieldCheck },
  { test: /vig[êe]ncia|renova[çc]/i, icon: CalendarClock },
  { test: /confidencialidade|sigilo/i, icon: Lock },
  { test: /suspens[ãa]o/i, icon: PauseCircle },
  { test: /cancelamento|rescis[ãa]o/i, icon: FileX },
  { test: /finais|foro|disposi[çc][õo]es/i, icon: Scale },
];

function clauseIcon(title: string) {
  return CLAUSE_ICONS.find((c) => c.test.test(title))?.icon ?? FileText;
}

// ---------------------------------------------------------------------------
// Faixa de garantias (assinatura eletrônica, força legal, linguagem acessível)
// ---------------------------------------------------------------------------

const ASSURANCES = [
  {
    icon: ShieldCheck,
    title: "Assinatura eletrônica",
    text: "Assinado digitalmente nesta página, com registro de nome, documento, data e hora.",
  },
  {
    icon: Scale,
    title: "Força legal",
    text: "Contrato com força de título executivo extrajudicial, conforme o art. 784 do CPC.",
  },
  {
    icon: Sparkles,
    title: "Linguagem acessível",
    text: "Escrito pra ser lido e entendido por qualquer pessoa, sem juridiquês desnecessário.",
  },
];

export function ContractAssurances() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {ASSURANCES.map((a) => (
        <div key={a.title} className="rounded-2xl bg-panel text-panel-ink px-4 py-4 flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/70">
            <a.icon size={12} className="text-accent" /> {a.title}
          </span>
          <p className="text-[11px] leading-relaxed text-white/60">{a.text}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cards das partes (contratante x contratada)
// ---------------------------------------------------------------------------

type PartySignature = { name: string; font?: string | null; signedAt: string | null } | null;

function PartyCard({
  role,
  accent,
  name,
  document,
  address,
  email,
  phone,
  contact,
  signature,
  signaturePlaceholder,
}: {
  role: string;
  accent: boolean;
  name: string;
  document: string;
  address: string;
  email: string;
  phone: string;
  contact?: string;
  signature: PartySignature;
  signaturePlaceholder: string;
}) {
  const rows = [
    { icon: MapPin, value: address },
    { icon: Mail, value: email },
    { icon: Phone, value: phone },
  ].filter((r) => r.value && r.value !== "-");

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex flex-col gap-3">
      <span
        className={cn(
          "self-start inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em]",
          accent ? "bg-accent text-white" : "bg-panel text-panel-ink",
        )}
      >
        {accent ? <UserRound size={10} /> : <Building2 size={10} />} {role}
      </span>
      <div>
        <p className="text-[15px] font-semibold text-ink leading-snug">{name}</p>
        {document && document !== "-" && <p className="text-xs text-muted mt-0.5 tabular-nums">{document}</p>}
        {contact && contact !== "-" && <p className="text-xs text-muted mt-0.5">Representante: {contact}</p>}
      </div>
      {rows.length > 0 && (
        <div className="flex flex-col gap-1">
          {rows.map((r, i) => (
            <p key={i} className="text-[11px] text-muted-2 flex items-center gap-1.5 min-w-0">
              <r.icon size={11} className="flex-shrink-0" /> <span className="truncate">{r.value}</span>
            </p>
          ))}
        </div>
      )}
      <div className="mt-auto pt-2 border-t border-dashed border-border-2">
        {signature ? (
          <div className="flex items-end justify-between gap-2">
            <p className={cn("text-[22px] text-ink leading-none truncate", signatureFontClass(signature.font))}>
              {signature.name}
            </p>
            {signature.signedAt && (
              <p className="text-[9px] text-muted-2 uppercase tracking-wide flex-shrink-0">{formatDate(signature.signedAt)}</p>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-muted-2 uppercase tracking-[0.12em] py-1.5">{signaturePlaceholder}</p>
        )}
      </div>
    </div>
  );
}

export function ContractParties({
  vars,
  clientSignature,
  agencySignature,
}: {
  vars: Record<string, string>;
  clientSignature: PartySignature;
  agencySignature: PartySignature;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-2">As partes</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PartyCard
          role="Contratante"
          accent
          name={vars["contratante.razao_social"] ?? "-"}
          document={vars["contratante.documento"] ?? ""}
          address={vars["contratante.endereco"] ?? ""}
          email={vars["contratante.email"] ?? ""}
          phone={vars["contratante.telefone"] ?? ""}
          contact={vars["contratante.nome_contato"]}
          signature={clientSignature}
          signaturePlaceholder="Assina ao final desta página"
        />
        <PartyCard
          role="Contratada"
          accent={false}
          name={vars["contratada.razao_social"] ?? "-"}
          document={vars["contratada.documento"] ?? ""}
          address={vars["contratada.endereco"] ?? ""}
          email={vars["contratada.email"] ?? ""}
          phone={vars["contratada.telefone"] ?? ""}
          signature={agencySignature}
          signaturePlaceholder="Contra-assina após a sua assinatura"
        />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Quadro resumo (serviços, condições de pagamento e régua de parcelas)
// ---------------------------------------------------------------------------

const PAYMENT_METHOD_ICON: Record<PaymentMethod, typeof QrCode> = {
  PIX: QrCode,
  BOLETO: Barcode,
  CARD: CreditCard,
  TRANSFER: Landmark,
};

export type SummaryService = {
  name: string;
  valueLabel: string;
  periodLabel: string;
  startLabel: string;
  renewalLabel: string;
};

export function ContractSummary({
  services,
  paymentCondition,
  setupFee,
  paymentMethods,
  installments,
}: {
  services: SummaryService[];
  paymentCondition: "CASH" | "INSTALLMENTS";
  setupFee: number | null;
  paymentMethods: PaymentMethod[];
  installments: { id: string; dueDate: string; value: number }[];
}) {
  const first = services[0];
  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="p-5 flex flex-col gap-4">
          {services.map((s, i) => (
            <div key={i} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink leading-snug">{s.name}</p>
                <p className="text-[11px] text-muted-2 mt-0.5">Cobrança {s.periodLabel.toLowerCase()}</p>
              </div>
              <p className="text-[17px] font-light tracking-tight text-ink tabular-nums flex-shrink-0">{s.valueLabel}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border-t border-border">
          <div className="px-4 py-3 flex flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">Início</span>
            <span className="text-xs font-semibold text-ink tabular-nums">{first?.startLabel ?? "-"}</span>
          </div>
          <div className="px-4 py-3 flex flex-col gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">Renovação</span>
            <span className="text-xs font-semibold text-ink tabular-nums">{first?.renewalLabel ?? "-"}</span>
          </div>
          <div className="px-4 py-3 flex flex-col gap-0.5 border-t sm:border-t-0 border-border">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">Condição</span>
            <span className="text-xs font-semibold text-ink">
              {paymentCondition === "INSTALLMENTS" && installments.length > 0 ? `${installments.length}x` : "À vista"}
            </span>
          </div>
          <div className="px-4 py-3 flex flex-col gap-0.5 border-t sm:border-t-0 border-border">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">Entrada/Setup</span>
            <span className="text-xs font-semibold text-ink tabular-nums">{setupFee ? formatCurrency(setupFee) : "Sem entrada"}</span>
          </div>
        </div>

        {paymentMethods.length > 0 && (
          <div className="border-t border-border px-5 py-3.5 flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2 mr-1">Formas de pagamento</span>
            {paymentMethods.map((m) => {
              const MethodIcon = PAYMENT_METHOD_ICON[m];
              return (
                <span
                  key={m}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-semibold text-ink"
                >
                  <MethodIcon size={11} className="text-accent" /> {PAYMENT_METHOD_LABELS[m]}
                </span>
              );
            })}
          </div>
        )}

        {installments.length > 1 && (
          <div className="border-t border-border px-5 py-4 flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">Régua de pagamento</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {installments.map((inst, i) => (
                <div
                  key={inst.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-surface-2/70 px-3 py-2"
                >
                  <span className="text-[10px] font-semibold text-muted flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-accent/15 text-accent flex items-center justify-center text-[9px] font-bold tabular-nums">
                      {i + 1}
                    </span>
                    {formatDate(inst.dueDate)}
                  </span>
                  <span className="text-[11px] font-semibold text-ink tabular-nums">{formatCurrency(inst.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Corpo do contrato: cláusulas numeradas em cards
// ---------------------------------------------------------------------------

const CLOSING_RE = /^e,?\s+por\s+estarem/i;

/** Chip de numeração de subitem ("10.1") - discreto, sem borda, no tom do texto de apoio. */
function SubChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] font-semibold text-muted tabular-nums flex-shrink-0 mt-[4px]">
      {label}
    </span>
  );
}

function renderClauseBlock(node: TipTapNode, vars: Record<string, string>, key: number, subLabel: string | null): ReactNode {
  switch (node.type) {
    case "paragraph": {
      const plain = textOf(node.content, vars).trim();
      if (CLOSING_RE.test(plain)) {
        return (
          <p key={key} className="text-[12.5px] leading-relaxed text-muted italic border-t border-dashed border-border-2 pt-3 mt-1">
            {renderInline(node.content, vars)}
          </p>
        );
      }
      // Parágrafo que abre com negrito = destaque do contrato → vira callout
      const isCallout = node.content?.[0]?.type === "text" && (node.content[0].marks ?? []).some((m) => m.type === "bold");
      if (isCallout) {
        return (
          <div key={key} className="flex items-start gap-2.5 rounded-xl bg-accent/[0.07] border border-accent/20 px-4 py-3.5">
            {subLabel && <SubChip label={subLabel} />}
            <p className="text-[13px] leading-[1.7] text-ink min-w-0">{renderInline(node.content, vars)}</p>
          </div>
        );
      }
      return (
        <div key={key} className="flex items-start gap-2.5">
          {subLabel && <SubChip label={subLabel} />}
          <p className="text-[13px] leading-[1.75] text-ink/90 min-w-0">{renderInline(node.content, vars)}</p>
        </div>
      );
    }
    case "heading":
      return (
        <p key={key} className="text-sm font-bold text-ink mt-1">
          {renderInline(node.content, vars)}
        </p>
      );
    case "bulletList":
    case "orderedList":
      return (
        <ul key={key} className="flex flex-col gap-1.5">
          {(node.content ?? []).map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 rounded-lg bg-surface-2/50 px-3 py-2">
              <span className="mt-[7px] w-1.5 h-1.5 rounded-[3px] bg-accent flex-shrink-0" />
              <span className="text-[12.5px] leading-[1.7] text-ink/90 min-w-0">
                {(item.content ?? []).map((child, j) => (
                  <span key={j}>{renderInline(child.content, vars)}</span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

/** Linha do tempo do contrato - renderizada na cláusula de vigência, como nos contratos de legal design. */
function ContractTimeline({ start, renewal }: { start: string; renewal: string }) {
  const points = [
    { label: "Início", value: start, dot: "bg-accent" },
    { label: "Renovação", value: renewal, dot: "bg-ink" },
    { label: "Renova automático", value: "a cada período", dot: "border-2 border-ink bg-surface" },
  ];
  return (
    <div className="rounded-xl bg-surface-2/70 px-4 py-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2 mb-3">Linha do tempo do contrato</p>
      <div className="relative">
        <div className="absolute left-1.5 right-1.5 top-[5px] h-0.5 bg-border-2" />
        <div className="relative flex items-start justify-between gap-2">
          {points.map((point, i) => (
            <div key={i} className={cn("flex flex-col gap-1.5", i === 0 ? "items-start" : i === points.length - 1 ? "items-end text-right" : "items-center text-center")}>
              <span className={cn("w-3 h-3 rounded-full flex-shrink-0", point.dot)} />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide text-muted-2">{point.label}</p>
                <p className="text-[11px] font-semibold text-ink tabular-nums">{point.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Painel de atendimento - renderizado na cláusula de suporte, com os dias da semana em destaque. */
function SupportPanel() {
  const days = [
    { label: "seg", active: true },
    { label: "ter", active: true },
    { label: "qua", active: true },
    { label: "qui", active: true },
    { label: "sex", active: true },
    { label: "sáb", active: false },
    { label: "dom", active: false },
  ];
  return (
    <div className="rounded-xl bg-surface-2/70 px-4 sm:px-5 py-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
          <LifeBuoy size={13} strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2 leading-none">Dias de atendimento</p>
          <p className="text-[11px] text-muted mt-1 leading-none">Fora desses dias, respondemos no próximo dia útil</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface border border-border px-2.5 py-1.5 flex-shrink-0">
          <Clock size={11} className="text-accent" />
          <span className="text-[11px] font-bold text-ink tabular-nums">09h00 às 18h00</span>
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => (
          <span
            key={i}
            className={cn(
              "h-8 rounded-lg flex items-center justify-center text-[10px] font-bold",
              day.active ? "bg-accent text-white" : "bg-surface text-muted-2 border border-border",
            )}
          >
            {day.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Painel do investimento - um bloco único e claro com valor, cobrança e chave PIX, renderizado na cláusula de investimento. */
function InvestmentHighlight({ vars }: { vars: Record<string, string> }) {
  const valor = vars["servico.valor"];
  const periodo = vars["servico.periodo"];
  const pix = vars["contratada.pix"];
  if (!valor) return null;
  return (
    <div className="rounded-xl border border-accent/25 bg-accent/[0.05] overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] sm:divide-x divide-y sm:divide-y-0 divide-accent/15">
        <div className="px-4 sm:px-5 py-4 flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-accent">Investimento</span>
          <span className="text-[24px] font-semibold tracking-tight text-ink tabular-nums leading-tight">{valor}</span>
        </div>
        {periodo && (
          <div className="px-4 sm:px-5 py-4 flex flex-col gap-0.5 justify-center sm:min-w-[140px]">
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-2">Cobrança</span>
            <span className="text-[15px] font-semibold text-ink leading-tight">{periodo}</span>
          </div>
        )}
      </div>
      {pix && pix !== "-" && (
        <div className="border-t border-accent/15 bg-surface px-4 sm:px-5 py-3 flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-2">
            <QrCode size={12} className="text-accent" /> Chave PIX
          </span>
          <span className="text-[13px] font-semibold text-ink font-mono break-all">{pix}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Agrupamento temático das cláusulas - vira as barras de capítulo entre os
 * cards, como as páginas de abertura dos contratos de legal design.
 */
const CLAUSE_GROUPS: { test: RegExp; label: string }[] = [
  { test: /contratando|objeto|como o trabalho|compromissos|obriga[çc]/i, label: "O serviço" },
  { test: /aprova[çc]|produ[çc][ãa]o|cronograma|revis|relat[óo]rio|suporte|resultado/i, label: "Rotina de trabalho" },
  { test: /investimento|valor|verba|m[íi]dia|ativos|titularidade|propriedade/i, label: "Investimento e propriedade" },
  { test: /prote[çc][ãa]o de dados|lgpd|confidencial|sigilo|conduta|respeito/i, label: "Proteções" },
  { test: /suspens|vig[êe]ncia|renova|cancelamento|rescis|finais|foro|disposi/i, label: "Duração e encerramento" },
];

function clauseGroup(title: string) {
  return CLAUSE_GROUPS.find((g) => g.test.test(title))?.label ?? null;
}

/** Cabeçalho de capítulo: tipográfico e minimalista - só o título com um fio até a borda. */
function GroupBar({ label }: { label: string; index: number; total: number }) {
  return (
    <div className="mt-6 first:mt-0 px-1 flex items-center gap-4">
      <p className="text-[20px] sm:text-[22px] font-extrabold tracking-tight text-ink leading-none whitespace-nowrap min-w-0">
        {label}
      </p>
      <span className="flex-1 h-px bg-border-2" />
    </div>
  );
}

export function ContractClauses({ parsed, vars }: { parsed: ParsedContract; vars: Record<string, string> }) {
  const visible = parsed.sections.filter((s) => !isPartiesSection(s));
  const groupSequence: string[] = [];
  for (const section of visible) {
    const group = section.number ? clauseGroup(section.title) : null;
    if (group && !groupSequence.includes(group)) groupSequence.push(group);
  }
  // Pré-computa em qual seção cada barra de capítulo aparece (primeira
  // seção de cada grupo) - derivação pura antes do JSX, sem mutação no map.
  const groupBars = new Map<string, { label: string; index: number }>();
  let previousGroup: string | null = null;
  for (const section of visible) {
    const group = section.number ? clauseGroup(section.title) : null;
    if (group && group !== previousGroup && groupSequence.length > 1) {
      groupBars.set(section.anchorId, { label: group, index: groupSequence.indexOf(group) });
    }
    if (group) previousGroup = group;
  }
  return (
    <div className="flex flex-col gap-3">
      {visible.map((section) => {
        const bar = groupBars.get(section.anchorId) ?? null;
        const Icon = clauseIcon(section.title);
        const isVigencia = /vig[êe]ncia/i.test(section.title);
        const isSuporte = /suporte/i.test(section.title);
        const isInvestimento = /investimento|valor e/i.test(section.title);
        let subCount = 0;
        return (
          <div key={section.anchorId} className="contents">
            {bar && <GroupBar label={bar.label} index={bar.index} total={groupSequence.length} />}
          <article
            id={section.anchorId}
            className="rounded-2xl border border-border bg-surface p-5 sm:p-6 scroll-mt-6"
          >
            {(section.number || section.title) && (
              <header className="flex items-center gap-3.5 mb-4 pb-3.5 border-b border-border">
                {section.number && (
                  <span className="text-[26px] font-extralight text-accent tabular-nums leading-none tracking-tight flex-shrink-0">
                    {section.number.padStart(2, "0")}
                  </span>
                )}
                <h3 className="text-[15px] font-bold tracking-tight text-ink leading-snug min-w-0 flex-1">
                  {section.title || "Disposições"}
                </h3>
                <Icon size={17} strokeWidth={1.7} className="text-muted-2 flex-shrink-0" />
              </header>
            )}
            <div className="flex flex-col gap-2.5">
              {isInvestimento && <InvestmentHighlight vars={vars} />}
              {section.blocks.map((block, i) => {
                let subLabel: string | null = null;
                if (block.type === "paragraph" && section.number) {
                  const plain = textOf(block.content, vars).trim();
                  if (!CLOSING_RE.test(plain)) {
                    subCount += 1;
                    subLabel = `${section.number}.${subCount}`;
                  }
                }
                return renderClauseBlock(block, vars, i, subLabel);
              })}
              {isVigencia && (
                <ContractTimeline
                  start={vars["servico.data_inicio"] ?? "-"}
                  renewal={vars["servico.data_renovacao"] ?? "-"}
                />
              )}
              {isSuporte && <SupportPanel />}
            </div>
          </article>
          </div>
        );
      })}
    </div>
  );
}

/** Card de fechamento - "última página" dos contratos de legal design. */
export function ContractClosing() {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/50 px-6 py-9 flex flex-col items-center gap-3 text-center">
      <span className="w-11 h-11 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
        <Rocket size={19} strokeWidth={1.8} />
      </span>
      <p className="text-[19px] font-light tracking-tight text-ink leading-snug">
        <span className="font-semibold text-accent">O começo</span> da nossa jornada.
      </p>
      <p className="text-[11px] text-muted-2 max-w-[300px]">
        Assinando abaixo, esse contrato deixa de ser um documento e vira o primeiro passo do projeto.
      </p>
    </div>
  );
}

/** Título do documento (o primeiro heading do modelo) - tipográfico, sem caixa, pra não competir com os capítulos. */
export function ContractDocTitle({ title }: { title: string }) {
  return (
    <div className="text-center py-3 flex flex-col items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-2">
        <FileText size={11} className="text-accent" /> Documento
      </span>
      <p className="text-[17px] sm:text-[19px] font-bold tracking-tight text-ink leading-snug">{title}</p>
    </div>
  );
}
