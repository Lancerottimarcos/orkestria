/**
 * Fábrica dos modelos prontos de proposta comercial em legal design - mesmo
 * espírito de src/lib/contracts/templateFactory.ts (gerar por função, não
 * JSON estático), mas sem questionário guiado: cada modelo já sai com copy
 * persuasivo pronto e variáveis inseridas, prontos pra usar ou ajustar.
 *
 * Sem imports: o arquivo precisa rodar tanto no app quanto via tsx no script
 * de seed, então tudo aqui é TypeScript puro (mesma razão do templateFactory).
 */

type Node = Record<string, unknown>;

function t(text: string, ...marks: ("bold" | "italic" | "underline")[]): Node {
  return { type: "text", text, ...(marks.length ? { marks: marks.map((m) => ({ type: m })) } : {}) };
}
function chip(key: string, label: string): Node {
  return { type: "variableChip", attrs: { key, label } };
}
function p(...content: Node[]): Node {
  return { type: "paragraph", content };
}
function h(...content: Node[]): Node {
  return { type: "heading", attrs: { level: 2 }, content };
}
function li(...content: Node[]): Node {
  return { type: "listItem", content: [p(...content)] };
}
function ul(...items: Node[]): Node {
  return { type: "bulletList", content: items };
}
function doc(...content: Node[]): string {
  return JSON.stringify({ type: "doc", content });
}

// Atalhos das variáveis do catálogo (src/lib/proposals/variables.ts)
const V = {
  contratanteContato: chip("contratante.nome_contato", "Nome do contato"),
  contratada: chip("contratada.razao_social", "Razão social"),
  valorTotal: chip("proposta.valor_total", "Valor total"),
  condicaoPagamento: chip("proposta.condicao_pagamento", "Condição de pagamento"),
  validade: chip("proposta.validade", "Válida até"),
  hoje: chip("data.hoje", "Data de hoje"),
};

type Section = { title: string; blocks: Node[] };

function secoes(...sections: Section[]): Node[] {
  return sections.flatMap((section, index) => [h(t(`Seção ${index + 1}ª. ${section.title}`)), ...section.blocks]);
}

// ---------------------------------------------------------------------------
// Blocos compartilhados entre todos os tipos de proposta
// ---------------------------------------------------------------------------

function secaoSobreNos(): Section {
  return {
    title: "Sobre nós",
    blocks: [
      p(
        t("Somos a "),
        V.contratada,
        t(
          ", uma agência que combina estratégia, criatividade e dados pra transformar marcas em resultado de verdade. Não trabalhamos com fórmulas prontas - cada projeto nasce de um diagnóstico real do seu negócio, do seu mercado e do público que você quer alcançar.",
        ),
      ),
      p(
        t(
          "Esta proposta foi preparada especialmente pra você, considerando o momento atual do seu negócio e os objetivos que você nos trouxe.",
        ),
      ),
    ],
  };
}

function secaoDesafio(texto: string): Section {
  return {
    title: "Como enxergamos seu desafio",
    blocks: [p(t(texto))],
  };
}

function secaoMetodologia(pensar: string, criar: string, realizar: string): Section {
  return {
    title: "Nossa metodologia",
    blocks: [
      p(t("Nosso trabalho segue um ciclo contínuo em três frentes:")),
      ul(
        li(t("Pensar. ", "bold"), t(pensar)),
        li(t("Criar. ", "bold"), t(criar)),
        li(t("Realizar. ", "bold"), t(realizar)),
      ),
      p(
        t(
          "Essa metodologia é ajustada ao longo da execução conforme os resultados, sempre com transparência e alinhamento constante com você.",
        ),
      ),
    ],
  };
}

function secaoDiferenciais(itens: Node[]): Section {
  return {
    title: "Por que nos escolher",
    blocks: [p(t("Alguns motivos pra seguir com a gente:")), ul(...itens)],
  };
}

function secaoComoComecamos(): Section {
  return {
    title: "Como começamos",
    blocks: [
      p(t("Depois que esta proposta for aceita, o próximo passo é simples:")),
      ul(
        li(t("Você confere e assina o contrato, direto por aqui, sem precisar de e-mail ou papelada;")),
        li(t("Nosso time entra em contato pra alinhar os primeiros detalhes e prazos;")),
        li(t("Damos início ao trabalho já com a estratégia inicial definida junto com você.")),
      ),
      p(t("Sem burocracia - do aceite ao início do projeto, tudo acontece dentro do mesmo fluxo.")),
    ],
  };
}

function secaoTermosGerais(): Section {
  return {
    title: "Termos gerais",
    blocks: [
      p(
        t("O investimento total desta proposta é de "),
        V.valorTotal,
        t(", na condição "),
        V.condicaoPagamento,
        t("."),
      ),
      p(t("Esta proposta é válida até "), V.validade, t(", e reflete as condições apresentadas nesta data.")),
      p(
        t(
          "Os valores e o escopo detalhados nesta proposta fazem parte integrante do contrato gerado no momento do aceite.",
        ),
      ),
    ],
  };
}

// ---------------------------------------------------------------------------
// Catálogo de modelos prontos
// ---------------------------------------------------------------------------

export type ProposalTemplateKind = "redes-sociais" | "trafego-pago" | "marketing-360" | "criacao-conteudo" | "geral";

export const PROPOSAL_TEMPLATE_KINDS: { kind: ProposalTemplateKind; name: string }[] = [
  { kind: "redes-sociais", name: "Proposta de Gestão de Redes Sociais" },
  { kind: "trafego-pago", name: "Proposta de Gestão de Tráfego Pago" },
  { kind: "marketing-360", name: "Proposta de Marketing 360" },
  { kind: "criacao-conteudo", name: "Proposta de Criação de Conteúdo" },
  { kind: "geral", name: "Proposta Comercial Padrão" },
];

export function buildProposalTemplate(kind: ProposalTemplateKind): { name: string; bodyJson: string } {
  const name = PROPOSAL_TEMPLATE_KINDS.find((k) => k.kind === kind)?.name ?? "Proposta comercial";

  const montar = (titulo: string, sections: Section[]) => ({
    name,
    bodyJson: doc(h(t(titulo)), ...secoes(...sections)),
  });

  if (kind === "trafego-pago") {
    return montar("Proposta de Gestão de Tráfego Pago", [
      secaoSobreNos(),
      secaoDesafio(
        "Atrair a atenção certa, no momento certo, sem desperdiçar orçamento com público desqualificado, é o desafio de quem depende de anúncios pra crescer. Sem uma gestão ativa, campanhas perdem performance rápido - e cada real mal investido é uma oportunidade perdida.",
      ),
      secaoMetodologia(
        "Planejamento estratégico de campanhas, definição de públicos, funis e orçamentos alinhados aos seus objetivos de negócio.",
        "Criativos e textos pensados pra parar o scroll e converter, testados continuamente pra encontrar o que funciona melhor pro seu público.",
        "Otimização constante com análise de dados reais, ajustes de lances e públicos, e relatórios claros sobre o retorno de cada campanha.",
      ),
      secaoDiferenciais([
        li(t("Gestão ativa e diária das campanhas, não só configuração inicial;")),
        li(t("Decisões baseadas em dados, não em achismo;")),
        li(t("Relatórios claros, sem jargão técnico desnecessário;")),
        li(t("Comunicação direta e transparente sobre o que está funcionando e o que não está.")),
      ]),
      secaoComoComecamos(),
      secaoTermosGerais(),
    ]);
  }

  if (kind === "marketing-360") {
    return montar("Proposta de Marketing 360", [
      secaoSobreNos(),
      secaoDesafio(
        "Marketing que funciona de verdade não vem de ações isoladas - vem de uma estratégia única que conecta conteúdo, anúncios, posicionamento e resultado. Sem essa visão integrada, esforços se sobrepõem, a mensagem se perde e o retorno fica difícil de medir.",
      ),
      secaoMetodologia(
        "Diagnóstico completo do seu negócio, posicionamento de marca e definição de uma estratégia integrada entre todas as frentes de marketing.",
        "Produção de conteúdo, campanhas e materiais alinhados a uma única linha estratégica, sem ações soltas ou desconectadas.",
        "Gestão contínua de todas as frentes, com acompanhamento de resultado unificado e ajustes constantes na estratégia como um todo.",
      ),
      secaoDiferenciais([
        li(t("Uma equipe só cuidando de toda a sua presença de marketing, sem ruído entre fornecedores;")),
        li(t("Estratégia única, aplicada de forma consistente em todos os canais;")),
        li(t("Visão de resultado de negócio, não só de métricas soltas por canal;")),
        li(t("Um ponto de contato único pra tudo.")),
      ]),
      secaoComoComecamos(),
      secaoTermosGerais(),
    ]);
  }

  if (kind === "criacao-conteudo") {
    return montar("Proposta de Criação de Conteúdo", [
      secaoSobreNos(),
      secaoDesafio(
        "Conteúdo bom não é só bonito - precisa comunicar a mensagem certa, pra pessoa certa, no formato certo. Produzir isso com consistência, sem perder qualidade nem a identidade da marca, é o que trava a maioria dos negócios que tentam fazer sozinhos.",
      ),
      secaoMetodologia(
        "Definição de linha editorial e identidade visual alinhadas à sua marca e ao público que você quer alcançar.",
        "Produção de fotos, vídeos e artes com direção criativa própria, sempre revisados com você antes da publicação.",
        "Organização e entrega dentro do calendário combinado, com ajustes conforme o desempenho de cada formato.",
      ),
      secaoDiferenciais([
        li(t("Produção própria, sem depender de bancos de imagem genéricos;")),
        li(t("Identidade visual consistente em todo o material entregue;")),
        li(t("Revisão e aprovação simples, direto com você;")),
        li(t("Conteúdo pensado pra performance, não só pra estética.")),
      ]),
      secaoComoComecamos(),
      secaoTermosGerais(),
    ]);
  }

  if (kind === "geral") {
    return montar("Proposta Comercial Padrão", [
      secaoSobreNos(),
      secaoDesafio(
        "Todo negócio enfrenta o mesmo dilema em algum momento: crescer exige atenção especializada que, sem o parceiro certo, acaba disputando espaço com a operação do dia a dia. É aí que entra o trabalho de quem já vive esse tipo de desafio na prática.",
      ),
      secaoMetodologia(
        "Diagnóstico do momento atual do seu negócio e definição clara dos objetivos que essa parceria precisa entregar.",
        "Construção das entregas combinadas com atenção aos detalhes e alinhamento constante com você.",
        "Execução acompanhada de perto, com ajustes ao longo do caminho conforme o que os resultados mostrarem.",
      ),
      secaoDiferenciais([
        li(t("Atendimento próximo e transparente, do início ao fim do projeto;")),
        li(t("Entregas alinhadas aos seus objetivos de negócio, não a métricas soltas;")),
        li(t("Flexibilidade pra ajustar o plano conforme o que for aparecendo pelo caminho.")),
      ]),
      secaoComoComecamos(),
      secaoTermosGerais(),
    ]);
  }

  // redes-sociais (padrão)
  return montar("Proposta de Gestão de Redes Sociais", [
    secaoSobreNos(),
    secaoDesafio(
      "Manter uma presença de qualidade nas redes sociais, com constância e estratégia, exige tempo e um olhar técnico que a rotina do dia a dia raramente permite. O resultado, sem isso, costuma ser um perfil parado ou sem direção clara.",
    ),
    secaoMetodologia(
      "Estratégia de conteúdo com planejamento editorial, definição de pilares e tom de voz alinhados à sua marca.",
      "Produção de posts, roteiros e artes que conversam de verdade com o seu público, sempre aprovados por você antes de ir ao ar.",
      "Publicação, acompanhamento de métricas e ajustes constantes de estratégia com base no que performa melhor.",
    ),
    secaoDiferenciais([
      li(t("Planejamento editorial pensado pro seu negócio, não um modelo genérico;")),
      li(t("Aprovação simples de todo o conteúdo antes da publicação;")),
      li(t("Relatórios claros de desempenho, sem enrolação;")),
      li(t("Time dedicado acompanhando suas redes de perto, todos os dias.")),
    ]),
    secaoComoComecamos(),
    secaoTermosGerais(),
  ]);
}
