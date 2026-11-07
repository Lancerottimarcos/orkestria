import { Building2, Compass, Rocket, Scale, Target, ThumbsUp, type LucideIcon } from "lucide-react";
import type { TipTapNode } from "@/lib/contracts/pdfNodes";
import { renderInline } from "@/lib/contracts/htmlNodes";

/**
 * Renderização do corpo narrativo da proposta comercial - propositalmente
 * NÃO segue o visual de cláusula numerada do contrato (VisualLawContract.tsx):
 * proposta é material de venda, não documento legal. Cada seção vira um
 * card com ícone + título (sem numeral de cláusula, sem chip de subitem tipo
 * "2.1", sem cabeçalho com linha inferior) - layout deliberadamente
 * diferente tanto do contrato quanto do cabeçalho "título + linha fina" já
 * usado em "O que está incluído"/"Como pagar", pra ficar claro que é
 * conteúdo à parte. Preço/pagamento/itens nunca vêm daqui - só do que já é
 * renderizado a partir dos dados reais da proposta.
 */

// ---------------------------------------------------------------------------
// Parser: divide o documento TipTap em seções a partir dos headings
// ---------------------------------------------------------------------------

export type ProposalSection = {
  /** Número extraído de "Seção 2ª. ..." - não usado no visual, só de apoio ao parser */
  number: string | null;
  title: string;
  anchorId: string;
  blocks: TipTapNode[];
};

export type ParsedProposal = {
  docTitle: string | null;
  sections: ProposalSection[];
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

const PROPOSAL_SECTION_RE = /^se[çc][ãa]o\s+(\d+)ª?\.?\s*(.*)$/i;

export function parseProposalDoc(doc: TipTapNode, vars: Record<string, string>, anchorPrefix: string): ParsedProposal {
  const sections: ProposalSection[] = [];
  let docTitle: string | null = null;
  let current: ProposalSection | null = null;

  for (const node of doc.content ?? []) {
    if (node.type === "heading") {
      const raw = textOf(node.content, vars).trim();
      if (docTitle === null && sections.length === 0 && !current) {
        docTitle = raw;
        continue;
      }
      const match = raw.match(PROPOSAL_SECTION_RE);
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
      current = { number: null, title: "", anchorId: `${anchorPrefix}-s${sections.length + 1}`, blocks: [] };
      sections.push(current);
    }
    current.blocks.push(node);
  }

  return { docTitle, sections };
}

// ---------------------------------------------------------------------------
// Ícone por assunto da seção - nada de estrela/brilho, só formas neutras
// ---------------------------------------------------------------------------

const SECTION_ICONS: { test: RegExp; icon: LucideIcon }[] = [
  { test: /sobre n[oó]s/i, icon: Building2 },
  { test: /desafio|diagn[oó]stico/i, icon: Target },
  { test: /metodologia|como trabalhamos|como o trabalho/i, icon: Compass },
  { test: /por que|diferenciais|escolher/i, icon: ThumbsUp },
  { test: /como come[çc]amos|cronograma|kickoff/i, icon: Rocket },
  { test: /termos|condi[çc][õo]es|validade/i, icon: Scale },
];

function sectionIcon(title: string): LucideIcon {
  return SECTION_ICONS.find((s) => s.test.test(title))?.icon ?? Target;
}

// ---------------------------------------------------------------------------
// Componentes gráficos de apoio (metodologia em passos, diferenciais em grade)
// ---------------------------------------------------------------------------

/** Extrai o rótulo em negrito de um item de lista ("Pensar. ") do resto do texto. */
function splitLeadLabel(listItem: TipTapNode) {
  const content = listItem.content?.[0]?.content ?? [];
  const first = content[0];
  const isBoldLead = first?.type === "text" && (first.marks ?? []).some((m) => m.type === "bold");
  const label = isBoldLead ? (first.text ?? "").replace(/\.\s*$/, "").trim() : "";
  return { label, rest: isBoldLead ? content.slice(1) : content };
}

/** Fluxo visual de passos numerados (usado na seção de metodologia) - gráfico em vez de lista corrida. */
function MethodologyFlow({ node, vars }: { node: TipTapNode; vars: Record<string, string> }) {
  const items = (node.content ?? []).map((li) => splitLeadLabel(li));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl bg-surface-2/60 p-4 flex flex-col gap-1.5">
          <span className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0 tabular-nums">
            {i + 1}
          </span>
          <p className="text-sm font-bold text-ink mt-1">{item.label}</p>
          <p className="text-[12.5px] leading-[1.6] text-ink/80">{renderInline(item.rest, vars)}</p>
        </div>
      ))}
    </div>
  );
}

/** Grade de diferenciais em 2 colunas com selo de check - gráfico em vez de lista corrida. */
function DifferentiatorsGrid({ node, vars }: { node: TipTapNode; vars: Record<string, string> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {(node.content ?? []).map((item, i) => (
        <div key={i} className="flex items-start gap-2.5 rounded-xl bg-surface-2/60 px-3.5 py-3">
          <span className="w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">
            {i + 1}
          </span>
          <span className="text-[13px] leading-[1.6] text-ink/90 min-w-0">
            {(item.content ?? []).map((child, j) => (
              <span key={j}>{renderInline(child.content, vars)}</span>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function renderSectionBlock(node: TipTapNode, vars: Record<string, string>, key: number) {
  switch (node.type) {
    case "paragraph":
      return (
        <p key={key} className="text-[14px] sm:text-[15px] leading-[1.75] text-ink/90">
          {renderInline(node.content, vars)}
        </p>
      );
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
            <li key={i} className="flex items-start gap-2.5 rounded-lg bg-surface-2/60 px-3 py-2">
              <span className="mt-[7px] w-1.5 h-1.5 rounded-[3px] bg-accent flex-shrink-0" />
              <span className="text-[13px] leading-[1.7] text-ink/90 min-w-0">
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

const METHODOLOGY_RE = /metodologia|como trabalhamos|como o trabalho/i;
const DIFFERENTIATORS_RE = /por que|diferenciais|escolher/i;

export function ProposalNarrative({ parsed, vars }: { parsed: ParsedProposal; vars: Record<string, string> }) {
  const visible = parsed.sections.filter((s) => s.title || s.blocks.length > 0);
  if (visible.length === 0) return null;
  return (
    <>
      {visible.map((section) => {
        const Icon = sectionIcon(section.title);
        const isMethodology = METHODOLOGY_RE.test(section.title);
        const isDifferentiators = DIFFERENTIATORS_RE.test(section.title);
        return (
          <section
            key={section.anchorId}
            id={section.anchorId}
            className="rounded-2xl border border-border bg-surface p-5 sm:p-6 flex flex-col gap-3 scroll-mt-6"
          >
            {(section.title || section.blocks.length > 0) && (
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                  <Icon size={16} strokeWidth={1.8} />
                </span>
                <p className="text-[16px] sm:text-[17px] font-bold tracking-tight text-ink leading-snug">
                  {section.title || "Sobre a proposta"}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {section.blocks.map((block, i) => {
                if (isMethodology && block.type === "bulletList" && (block.content?.length ?? 0) === 3) {
                  return <MethodologyFlow key={i} node={block} vars={vars} />;
                }
                if (isDifferentiators && (block.type === "bulletList" || block.type === "orderedList")) {
                  return <DifferentiatorsGrid key={i} node={block} vars={vars} />;
                }
                return renderSectionBlock(block, vars, i);
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
