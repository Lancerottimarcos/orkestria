/**
 * Fábrica dos modelos de contrato em legal design. A mesma construção é usada
 * pelo script de seed (com as respostas padrão) e pelo fluxo guiado interno,
 * onde a pessoa responde as perguntas e o resultado é salvo direto no modelo.
 * TUDO que é alterável no texto (prazos, multas, percentuais, janelas) vem
 * das respostas - preencheu o formulário, o contrato sai 100%.
 *
 * Sem imports: o arquivo precisa rodar tanto no app quanto via tsx no script
 * de seed, então tudo aqui é TypeScript puro.
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

// Atalhos das variáveis do catálogo (src/lib/contracts/variables.ts)
const V = {
  contratante: chip("contratante.razao_social", "Razão social"),
  contratanteContato: chip("contratante.nome_contato", "Nome do contato"),
  contratanteDoc: chip("contratante.documento", "CNPJ/CPF"),
  contratanteEnd: chip("contratante.endereco", "Endereço"),
  contratanteEmail: chip("contratante.email", "Email"),
  contratanteTel: chip("contratante.telefone", "Telefone"),
  contratada: chip("contratada.razao_social", "Razão social"),
  contratadaDoc: chip("contratada.documento", "CNPJ"),
  contratadaEnd: chip("contratada.endereco", "Endereço"),
  contratadaEmail: chip("contratada.email", "Email"),
  contratadaTel: chip("contratada.telefone", "Telefone"),
  contratadaPix: chip("contratada.pix", "Chave PIX"),
  servicoNome: chip("servico.nome", "Nome do serviço"),
  servicoEscopo: chip("servico.escopo", "Escopo"),
  servicoValor: chip("servico.valor", "Valor"),
  servicoPeriodo: chip("servico.periodo", "Período"),
  servicoInicio: chip("servico.data_inicio", "Data de início"),
  servicoRenovacao: chip("servico.data_renovacao", "Data de renovação"),
  hoje: chip("data.hoje", "Data de hoje"),
};

// ---------------------------------------------------------------------------
// Perguntas do fluxo guiado - TUDO que é alterável no texto do contrato
// ---------------------------------------------------------------------------

export type TemplateKind =
  | "redes-sociais"
  | "trafego-pago"
  | "instagram"
  | "social-trafego"
  | "marketing-360"
  | "criacao-conteudo";

export type TemplateAnswers = {
  // Vigência e permanência
  /** Tempo mínimo de permanência em meses (null = sem permanência mínima) */
  permanenciaMeses: number | null;
  /** Multa por rompimento antes da permanência mínima (ex: "uma mensalidade"; vazio = sem multa) */
  multaRompimento: string;
  /** Aviso prévio pra não renovar automaticamente, em dias */
  avisoRenovacaoDias: number;
  /** Aviso prévio de cancelamento, em dias */
  avisoCancelamentoDias: number;

  // Aprovações e produção
  /** Antecedência de envio do material pra aprovação, em dias úteis */
  envioAntecedenciaDias: number;
  /** Prazo do cliente pra aprovar conteúdos, em horas úteis */
  prazoAprovacaoHoras: number;
  /** Rodadas de revisão incluídas por conteúdo */
  rodadasRevisao: number;
  /** Silêncio após o prazo conta como aprovação? */
  silencioAprova: boolean;
  /** Prazo pra apresentar o primeiro planejamento após a assinatura, em dias */
  primeiroPlanejamentoDias: number;
  /** Janela pra pedir alteração no cronograma após a reunião, em horas */
  alteracaoCronogramaHoras: number;
  /** Antecedência mínima pra solicitar artes avulsas, em dias úteis */
  artesAntecedenciaDias: number;
  /** Antecedência mínima pra solicitar cobertura de eventos, em dias */
  eventosAntecedenciaDias: number;

  // Atendimento e relatórios
  /** Canais oficiais de atendimento (ex: "WhatsApp e e-mail") */
  canais: string;
  /** Horário de atendimento (ex: "das 09h00 às 18h00, de segunda a sexta-feira") */
  horarioAtendimento: string;
  /** Prazo de resposta das mensagens, em horas úteis */
  prazoRespostaHoras: number;
  /** Periodicidade do relatório (ex: "mensal") */
  relatorioPeriodicidade: string;

  // Pagamento
  /** Multa sobre parcela em atraso, em % */
  multaAtrasoPercent: number;
  /** Juros ao mês sobre atraso, em % */
  jurosMesPercent: number;
  /** Dias de atraso que autorizam suspender o serviço */
  suspensaoPagamentoDias: number;

  // Proteções e suspensão
  /** Anos de confidencialidade após o fim do contrato */
  confidencialidadeAnos: number;
  /** Prazo pra comunicar incidente com dados pessoais, em horas */
  incidenteDadosHoras: number;
  /** Prazo pra comunicar ocorrência de suspensão, em horas */
  comunicarOcorrenciaHoras: number;
  /** Tempo máximo de suspensão temporária, em dias */
  suspensaoMaxDias: number;
  /** Prazo de retomada após o fim da suspensão, em dias */
  retomadaDias: number;
};

export const DEFAULT_ANSWERS: TemplateAnswers = {
  permanenciaMeses: null,
  multaRompimento: "",
  avisoRenovacaoDias: 30,
  avisoCancelamentoDias: 30,
  envioAntecedenciaDias: 3,
  prazoAprovacaoHoras: 24,
  rodadasRevisao: 2,
  silencioAprova: true,
  primeiroPlanejamentoDias: 7,
  alteracaoCronogramaHoras: 48,
  artesAntecedenciaDias: 2,
  eventosAntecedenciaDias: 15,
  canais: "WhatsApp e e-mail",
  horarioAtendimento: "das 09h00 às 18h00, de segunda a sexta-feira, exceto feriados",
  prazoRespostaHoras: 24,
  relatorioPeriodicidade: "mensal",
  multaAtrasoPercent: 2,
  jurosMesPercent: 1,
  suspensaoPagamentoDias: 10,
  confidencialidadeAnos: 2,
  incidenteDadosHoras: 24,
  comunicarOcorrenciaHoras: 48,
  suspensaoMaxDias: 60,
  retomadaDias: 15,
};

export const TEMPLATE_KINDS: { kind: TemplateKind; name: string }[] = [
  { kind: "redes-sociais", name: "Gestão de Redes Sociais" },
  { kind: "trafego-pago", name: "Gestão de Tráfego Pago" },
  { kind: "instagram", name: "Gestão de Instagram" },
  { kind: "social-trafego", name: "Gestão de Redes Sociais + Tráfego Pago" },
  { kind: "marketing-360", name: "Gestão de Marketing 360" },
  { kind: "criacao-conteudo", name: "Criação de Conteúdo" },
];

/** Números por extenso pros valores comuns - fallback devolve o algarismo. */
function ext(n: number): string {
  const map: Record<number, string> = {
    1: "um",
    2: "dois",
    3: "três",
    5: "cinco",
    6: "seis",
    7: "sete",
    10: "dez",
    12: "doze",
    15: "quinze",
    24: "vinte e quatro",
    30: "trinta",
    45: "quarenta e cinco",
    48: "quarenta e oito",
    60: "sessenta",
    72: "setenta e duas",
    90: "noventa",
  };
  return map[n] ?? String(n);
}

/**
 * Numeração automática das cláusulas: cada seção declara só o título e os
 * blocos, e o número sai da posição.
 */
type Section = { title: string; blocks: Node[] };

function clausulas(...sections: Section[]): Node[] {
  return sections.flatMap((section, index) => [h(t(`Cláusula ${index + 1}ª. ${section.title}`)), ...section.blocks]);
}

// ---------------------------------------------------------------------------
// Blocos compartilhados - todos parametrizados pelas respostas
// ---------------------------------------------------------------------------

function identificacaoDasPartes(): Node[] {
  return [
    h(t("Identificação das partes")),
    p(
      t("CONTRATANTE: ", "bold"),
      V.contratante,
      t(", inscrito(a) sob o documento "),
      V.contratanteDoc,
      t(", com endereço em "),
      V.contratanteEnd,
      t(", e-mail "),
      V.contratanteEmail,
      t(", telefone "),
      V.contratanteTel,
      t(", neste ato representado(a) por "),
      V.contratanteContato,
      t("."),
    ),
    p(
      t("CONTRATADA: ", "bold"),
      V.contratada,
      t(", inscrita no CNPJ "),
      V.contratadaDoc,
      t(", com endereço em "),
      V.contratadaEnd,
      t(", e-mail "),
      V.contratadaEmail,
      t(", telefone "),
      V.contratadaTel,
      t("."),
    ),
    p(
      t(
        "Para deixar a leitura mais simples, este contrato chama o CONTRATANTE de Cliente e a CONTRATADA de Agência. Este documento foi escrito em linguagem acessível, para ser lido e entendido do começo ao fim, sem juridiquês desnecessário.",
      ),
    ),
  ];
}

function secaoObjeto(descricao: string, notas: Node[] = []): Section {
  return {
    title: "O que você está contratando",
    blocks: [
      p(t("Você está contratando o serviço de "), V.servicoNome, t(". "), t(descricao)),
      p(t("O escopo detalhado do que está incluído é o seguinte:")),
      p(V.servicoEscopo),
      ...notas,
      p(
        t(
          "O que não estiver descrito no escopo acima não faz parte deste contrato. Demandas extras são bem-vindas, mas entram como novo orçamento ou termo aditivo, sempre por escrito e aceito pelas duas partes.",
        ),
      ),
    ],
  };
}

function secaoComoTrabalhamos(pensar: string, criar: string, realizar: string): Section {
  return {
    title: "Como o trabalho acontece",
    blocks: [
      p(t("O serviço segue um ciclo contínuo em três frentes:")),
      ul(
        li(t("Pensar. ", "bold"), t(pensar)),
        li(t("Criar. ", "bold"), t(criar)),
        li(t("Realizar. ", "bold"), t(realizar)),
      ),
      p(
        t(
          "A estratégia da Agência é fundamentada em inteligência de mercado e práticas testadas. A Agência tem autonomia para aplicar e ajustar a própria metodologia ao longo da execução, sempre respeitando os prazos e as metas acordados com o Cliente.",
        ),
      ),
    ],
  };
}

function secaoCompromissosAgencia(itens: Node[]): Section {
  return {
    title: "Compromissos da Agência",
    blocks: [p(t("Durante toda a vigência deste contrato, a Agência se compromete a:")), ul(...itens)],
  };
}

function secaoCompromissosCliente(itens: Node[]): Section {
  return {
    title: "Compromissos do Cliente",
    blocks: [
      p(
        t(
          "O Cliente também tem um papel fundamental no projeto. Para que o serviço aconteça no ritmo combinado, o Cliente se compromete a:",
        ),
      ),
      ul(...itens),
    ],
  };
}

function secaoProducao(a: TemplateAnswers, itensExtras: Node[] = []): Section {
  return {
    title: "Produção e cronograma",
    blocks: [
      p(t("Para a produção acontecer com qualidade e sem correria, as partes seguem estes prazos de rotina:")),
      ul(
        li(
          t(
            `O primeiro planejamento é apresentado em até ${a.primeiroPlanejamentoDias} (${ext(a.primeiroPlanejamentoDias)}) dias após a assinatura deste contrato, em reunião marcada previamente entre as partes;`,
          ),
        ),
        li(
          t(
            `As entregas seguem o cronograma mensal aprovado em reunião. Alterações no cronograma devem ser solicitadas em até ${a.alteracaoCronogramaHoras} (${ext(a.alteracaoCronogramaHoras)}) horas após a reunião;`,
          ),
        ),
        li(
          t(
            `Solicitações de artes avulsas são atendidas por ordem de prioridade e devem ser enviadas com pelo menos ${a.artesAntecedenciaDias} (${ext(a.artesAntecedenciaDias)}) dias úteis de antecedência;`,
          ),
        ),
        li(
          t(
            `Coberturas de eventos devem ser solicitadas com pelo menos ${a.eventosAntecedenciaDias} (${ext(a.eventosAntecedenciaDias)}) dias de antecedência, para a organização da logística;`,
          ),
        ),
        li(t("Quando a estratégia pedir, o Cliente disponibiliza uma pessoa da empresa para gravações e fornece textos, informações e materiais solicitados pela Agência.")),
        ...itensExtras,
      ),
    ],
  };
}

function secaoAprovacoes(a: TemplateAnswers): Section {
  return {
    title: "Aprovações e revisões",
    blocks: [
      p(
        t(
          "Todo material relevante passa pela aprovação do Cliente antes de ir ao ar, por meio da plataforma da Agência. O fluxo funciona assim:",
        ),
      ),
      ul(
        li(
          t(
            `A Agência envia o material com pelo menos ${a.envioAntecedenciaDias} (${ext(a.envioAntecedenciaDias)}) dias úteis de antecedência em relação à data planejada de publicação;`,
          ),
        ),
        li(
          t(`O Cliente aprova ou pede ajustes em até ${a.prazoAprovacaoHoras} (${ext(a.prazoAprovacaoHoras)}) horas úteis após o envio;`),
        ),
        li(
          t(
            `Cada conteúdo tem direito a ${a.rodadasRevisao} (${ext(a.rodadasRevisao)}) rodadas de revisão, desde que os ajustes não fujam do planejamento e da estratégia do mês;`,
          ),
        ),
        li(t("Mudanças significativas em escopo já aprovado podem impactar prazos e ter custos adicionais, sempre combinados por escrito antes;")),
        li(
          t(
            "Atrasos de aprovação por parte do Cliente podem deslocar o calendário de publicações, sem que isso caracterize descumprimento pela Agência.",
          ),
        ),
      ),
      ...(a.silencioAprova
        ? [
            p(
              t("O silêncio do Cliente após o prazo de aprovação será considerado aprovação, ", "bold"),
              t("para que o calendário de publicações possa seguir sem interrupções."),
            ),
          ]
        : []),
    ],
  };
}

function secaoRelatorios(a: TemplateAnswers): Section {
  return {
    title: "Relatórios e transparência",
    blocks: [
      p(
        t(
          `A Agência garante transparência ao fornecer informações sobre o projeto, esclarecendo dúvidas, alinhando estratégias e orientando a execução dos serviços. O Cliente recebe relatório ${a.relatorioPeriodicidade} com os principais indicadores e pode pedir esclarecimentos a qualquer momento, sem custo adicional.`,
        ),
      ),
    ],
  };
}

function secaoSuporte(a: TemplateAnswers): Section {
  return {
    title: "Suporte e comunicação",
    blocks: [
      p(
        t(
          `O atendimento acontece pelos canais oficiais da Agência (${a.canais}), ${a.horarioAtendimento}. As mensagens são respondidas em até ${a.prazoRespostaHoras} (${ext(a.prazoRespostaHoras)}) horas úteis.`,
        ),
      ),
      p(
        t(
          "Um gerente de contas da Agência é o responsável direto pelo acompanhamento do projeto, funcionando como ponto de contato principal entre as partes.",
        ),
      ),
      p(
        t(
          "Alinhamentos importantes são sempre registrados por escrito. Combinados feitos apenas verbalmente não alteram este contrato.",
        ),
      ),
    ],
  };
}

function secaoResultados(texto: string): Section {
  return {
    title: "Sobre resultados",
    blocks: [
      p(t("A Agência usa as melhores técnicas e estratégias disponíveis para o projeto. "), t(texto)),
      p(
        t(
          "Por isso, a obrigação assumida neste contrato é de meio e não de resultado: a Agência se compromete com a qualidade e a constância do trabalho, e não com métricas específicas que dependem de fatores fora do seu controle.",
          "bold",
        ),
      ),
    ],
  };
}

function secaoInvestimento(a: TemplateAnswers, notaMidiaPaga = false): Section {
  return {
    title: "Investimento e pagamento",
    blocks: [
      ...(notaMidiaPaga
        ? [
            p(
              t("Este contrato não inclui verba de mídia paga. ", "bold"),
              t(
                "Investimentos em anúncios (como Meta Ads e Google Ads) são pagos pelo Cliente diretamente às plataformas, nas suas próprias contas, quando houver campanhas.",
              ),
            ),
          ]
        : []),
      p(
        t("Pelo serviço, o Cliente pagará à Agência o valor de "),
        V.servicoValor,
        t(", em regime de cobrança "),
        V.servicoPeriodo,
        t(
          ". As condições de pagamento (entrada, parcelas, datas e formas de pagamento) são as da proposta comercial aceita pelo Cliente, que integra este contrato para todos os fins.",
        ),
      ),
      p(
        t("Pagamentos via PIX devem ser feitos para a chave oficial da Agência: "),
        V.contratadaPix,
        t("."),
      ),
      p(
        t(
          `Em caso de atraso, incidem multa de ${a.multaAtrasoPercent}% sobre a parcela em aberto, juros de ${a.jurosMesPercent}% ao mês e correção proporcional aos dias de atraso. Atraso superior a ${a.suspensaoPagamentoDias} (${ext(a.suspensaoPagamentoDias)}) dias autoriza a Agência a suspender a execução dos serviços até a regularização, sem prejuízo da cobrança dos valores devidos.`,
        ),
      ),
    ],
  };
}

function secaoProtecaoDeDados(a: TemplateAnswers): Section {
  return {
    title: "Proteção de dados",
    blocks: [
      p(
        t(
          "As partes reconhecem que devem cumprir a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018) em todas as atividades do projeto. Na prática, isso significa que:",
        ),
      ),
      ul(
        li(t("Informações de clientes, leads e contatos só podem ser usadas para os fins previstos neste contrato, sempre de forma transparente e segura;")),
        li(t("O Cliente autoriza a Agência a acessar, exclusivamente para a execução dos serviços, as plataformas e ferramentas necessárias, podendo usar login e senha fornecidos;")),
        li(t("As credenciais compartilhadas devem ser guardadas com segurança pelas duas partes;")),
        li(t("As partes colaboram mutuamente sempre que houver pedidos de informações ou dúvidas sobre o uso de dados pessoais, incluindo solicitações de titulares e de órgãos de fiscalização;")),
        li(
          t(
            `Se houver incidente com dados pessoais, a parte que souber primeiro deve informar a outra em até ${a.incidenteDadosHoras} (${ext(a.incidenteDadosHoras)}) horas, com os detalhes básicos do ocorrido.`,
          ),
        ),
      ),
    ],
  };
}

function secaoConfidencialidade(a: TemplateAnswers): Section {
  return {
    title: "Confidencialidade",
    blocks: [
      p(
        t(
          `Estratégias, números, credenciais, informações comerciais e todo o material trocado durante o projeto são confidenciais. Nenhuma das partes usa ou repassa essas informações para fora do projeto, e esse compromisso continua valendo por ${a.confidencialidadeAnos} (${ext(a.confidencialidadeAnos)}) anos após o fim do contrato.`,
        ),
      ),
      p(
        t(
          "A Agência pode atuar em projetos de outros clientes, inclusive do mesmo segmento, desde que não utilize informações confidenciais deste contrato.",
        ),
      ),
    ],
  };
}

function secaoConduta(): Section {
  return {
    title: "Conduta e respeito",
    blocks: [
      p(t("Respeito e ética profissional são pilares deste contrato. As partes se comprometem a:")),
      ul(
        li(t("Manter comunicação clara, respeitosa e em tom profissional em todas as reuniões e interações;")),
        li(t("Incentivar o diálogo aberto e construtivo para resolver qualquer problema ou desentendimento;")),
        li(t("Não tolerar qualquer tipo de preconceito ou prática abusiva, como linguagem ofensiva, assédio ou intimidação, em nenhum canal de comunicação;")),
        li(t("Tratar as equipes e colaboradores da outra parte com cordialidade e profissionalismo.")),
      ),
    ],
  };
}

function secaoSuspensao(a: TemplateAnswers, itensAutomatica: Node[]): Section {
  return {
    title: "Suspensão do contrato",
    blocks: [
      p(
        t(
          "Alguns recursos são essenciais para o serviço acontecer sem interrupções. A execução fica automaticamente suspensa, sem responsabilidade da Agência, até a regularização, em caso de:",
        ),
      ),
      ul(...itensAutomatica),
      p(t("Além disso, o contrato pode ser suspenso temporariamente, por justo motivo, nas hipóteses abaixo:")),
      ul(
        li(t("Caso fortuito ou força maior, como catástrofes naturais, instabilidades de sistemas e decisões governamentais que impeçam a execução do projeto;")),
        li(t("Doença ou problema familiar grave, documentadamente comprovado, que impeça a continuidade temporária das atividades;")),
        li(t("Indisponibilidade temporária de pessoa-chave de qualquer das partes, essencial para a execução do projeto.")),
      ),
      p(
        t(
          `A parte afetada deve informar a outra em até ${a.comunicarOcorrenciaHoras} (${ext(a.comunicarOcorrenciaHoras)}) horas sobre a ocorrência, para juntas encontrarem a melhor solução. Nessas hipóteses, o contrato pode ficar suspenso por até ${a.suspensaoMaxDias} (${ext(a.suspensaoMaxDias)}) dias. Restabelecida a situação, as partes retomam suas responsabilidades em até ${a.retomadaDias} (${ext(a.retomadaDias)}) dias. Passado o prazo de suspensão sem solução, qualquer das partes pode encerrar o contrato sem penalidades.`,
        ),
      ),
    ],
  };
}

function secaoVigencia(a: TemplateAnswers): Section {
  return {
    title: "Vigência e renovação",
    blocks: [
      p(
        t("Este contrato vigora a partir de "),
        V.servicoInicio,
        t(", com renovação prevista para "),
        V.servicoRenovacao,
        t(
          `. Ele se renova automaticamente por iguais períodos, a menos que uma das partes avise a outra, por escrito, com pelo menos ${a.avisoRenovacaoDias} (${ext(a.avisoRenovacaoDias)}) dias de antecedência.`,
        ),
      ),
      ...(a.permanenciaMeses
        ? [
            p(
              t(
                `A constância é fundamental para alcançar resultados, o que se traduz em tempo e investimento. Por isso, este contrato tem um tempo mínimo de permanência de ${a.permanenciaMeses} (${ext(a.permanenciaMeses)}) meses.`,
                "bold",
              ),
            ),
          ]
        : []),
    ],
  };
}

function secaoCancelamento(a: TemplateAnswers): Section {
  const aviso = a.avisoCancelamentoDias;
  return {
    title: "Cancelamento",
    blocks: [
      p(
        t(
          `Qualquer das partes pode encerrar este contrato avisando a outra por escrito com ${aviso} (${ext(aviso)}) dias de antecedência. Nesse período, o serviço segue normalmente e os valores correspondentes continuam devidos.`,
        ),
      ),
      ul(
        li(t("Tudo o que foi executado até a data efetiva do encerramento é devido integralmente;")),
        li(t("Não há multa surpresa: as únicas penalidades deste contrato são as que estão escritas nele;")),
        li(t("O descumprimento de qualquer cláusula autoriza a parte prejudicada a encerrar o contrato de imediato, sem o aviso prévio;")),
        li(t("Encerrado o contrato, a Agência envia um termo de encerramento registrando a devolução de acessos e a exclusão de grupos, pastas e materiais compartilhados.")),
      ),
      ...(a.permanenciaMeses && a.multaRompimento.trim()
        ? [
            p(
              t("Se o Cliente encerrar o contrato antes do tempo mínimo de permanência, sem justo motivo, ", "bold"),
              t(`paga uma multa equivalente a ${a.multaRompimento.trim()}, em até 72 (setenta e duas) horas do encerramento.`),
            ),
          ]
        : []),
    ],
  };
}

function secaoFinais(): Section {
  return {
    title: "Disposições finais",
    blocks: [
      ul(
        li(t("Este contrato não cria vínculo empregatício, sociedade ou representação entre as partes;")),
        li(t("Ele só pode ser modificado por termo aditivo escrito e aceito por ambas as partes, prevalecendo sobre acordos anteriores em qualquer outro documento;")),
        li(t("Se uma das partes tolerar algum descumprimento pontual, isso não significa renúncia de direitos;")),
        li(t("Qualquer mudança de endereço, e-mail ou telefone de contato deve ser informada à outra parte, sob pena de as comunicações se presumirem recebidas;")),
        li(t("Este contrato tem força de título executivo extrajudicial, conforme o art. 784 do Código de Processo Civil;")),
        li(t("Fica eleito o foro da comarca da Agência para resolver qualquer controvérsia que não seja solucionada por conversa direta entre as partes, que é sempre o primeiro caminho.")),
      ),
    ],
  };
}

function fechamento(): Node[] {
  return [
    p(
      t(
        "E, por estarem justas e contratadas, as partes firmam o presente instrumento de forma digital, por meio da plataforma da Agência, na data de ",
      ),
      V.hoje,
      t(", produzindo efeitos legais a assinatura eletrônica registrada com nome, documento, data e hora."),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Seções específicas por tipo de serviço
// ---------------------------------------------------------------------------

function propriedadeConteudos(): Section {
  return {
    title: "Propriedade dos conteúdos",
    blocks: [
      ul(
        li(t("Os conteúdos produzidos e efetivamente pagos passam a integrar o acervo do Cliente, para uso nos seus canais;")),
        li(t("Metodologias, processos internos e modelos de trabalho da Agência permanecem de propriedade exclusiva dela;")),
        li(t("A Agência pode exibir os trabalhos realizados em seu portfólio, salvo pedido expresso em contrário do Cliente;")),
        li(t("O Cliente autoriza o uso da imagem e da voz das pessoas que aparecem nos materiais fornecidos por ele, exclusivamente para os fins deste contrato.")),
      ),
    ],
  };
}

function verbaDeMidia(incluiOffline = false): Section {
  return {
    title: "Verba de mídia",
    blocks: [
      p(
        t("O valor deste contrato remunera exclusivamente o serviço de gestão prestado pela Agência. ", "bold"),
        t(
          incluiOffline
            ? "A verba de mídia, que é o valor investido em anúncios online e em veículos offline, é paga pelo Cliente diretamente às plataformas e aos veículos, e não transita pela Agência em nenhuma hipótese."
            : "A verba de mídia, que é o valor investido nos anúncios, é paga pelo Cliente diretamente às plataformas, nas suas próprias contas de anúncio, e não transita pela Agência em nenhuma hipótese.",
        ),
      ),
      ul(
        li(t("O investimento em anúncios é definido junto com o Cliente e pode ser ajustado ao longo do projeto;")),
        li(t("A Agência avisa quando o saldo ou o meio de pagamento das plataformas precisar de atenção;")),
        li(t("Sem verba de mídia disponível, as campanhas param, e o serviço de gestão continua sendo devido normalmente.")),
      ),
    ],
  };
}

function seusAtivos(): Section {
  return {
    title: "Seus ativos são seus",
    blocks: [
      ul(
        li(t("Contas de anúncio, públicos, pixels, dados de conversão e histórico de campanhas pertencem ao Cliente e permanecem nas contas dele após o fim do contrato;")),
        li(t("Metodologias, processos internos e modelos de trabalho da Agência permanecem de propriedade exclusiva dela;")),
        li(t("A Agência pode citar o projeto e resultados gerais em seu portfólio, salvo pedido expresso em contrário do Cliente.")),
      ),
    ],
  };
}

function custosDeTerceiros(): Section {
  return {
    title: "Custos de terceiros",
    blocks: [
      p(
        t("Custos de fornecedores externos não estão inclusos neste contrato. ", "bold"),
        t(
          "Gráficas, produtoras, brindes, locações, veículos de mídia offline e outros fornecedores necessários às ações são pagos pelo Cliente, sempre com orçamento aprovado por escrito antes de cada ação.",
        ),
      ),
      ul(
        li(t("A Agência coordena os fornecedores envolvidos nas ações quando previsto no escopo;")),
        li(t("Orçamentos de terceiros são apresentados ao Cliente para aprovação antes de qualquer contratação;")),
        li(t("Prazos de fornecedores externos não dependem da Agência e são acompanhados por ela junto ao Cliente.")),
      ),
    ],
  };
}

// Itens reutilizados nas listas de compromissos
const item = {
  credenciais: () => li(t("Zelar pela segurança das credenciais e acessos que lhe forem confiados.")),
  pagamentos: () => li(t("Efetuar os pagamentos nas condições e prazos pactuados.")),
  direct: () => li(t("Responder as perguntas sobre produtos e serviços recebidas no Direct e nas caixas de mensagem, que são responsabilidade exclusiva do Cliente;")),
  estrategia: () => li(t("Avisar a Agência com antecedência sobre mudanças importantes de estratégia, novos produtos, campanhas ou eventos relevantes;")),
  direitos: () => li(t("Garantir que os materiais fornecidos não violam direitos de terceiros, respondendo pelo seu conteúdo;")),
  captacoes: () => li(t("Participar das captações de conteúdo quando previstas no escopo, nas datas combinadas;")),
  aprovacoes: () => li(t("Manter-se disponível para as aprovações dentro dos prazos combinados;")),
  materiais: () => li(t("Fornecer em tempo hábil informações, materiais, produtos e diretrizes necessários à produção;")),
  acessosPerfis: () => li(t("Conceder e manter os acessos necessários aos perfis e contas envolvidos no serviço;")),
  acessosAds: () => li(t("Conceder acessos de administrador às contas de anúncio, páginas, pixel e demais ativos necessários;")),
  saldoAds: () => li(t("Manter meio de pagamento válido e saldo suficiente diretamente junto às plataformas de anúncios;")),
  politicas: () => li(t("Garantir que produtos, serviços e páginas de destino anunciados cumprem as políticas das plataformas e a legislação vigente;")),
  comunicarBloqueios: () => li(t("Comunicar prontamente bloqueios, reprovações de anúncios ou alterações relevantes de política das plataformas;")),
};

const suspensaoBase = {
  pagamento: () => li(t("Falta de pagamento nas condições da cláusula de investimento;")),
  acessos: () => li(t("Falta dos acessos, materiais ou aprovações essenciais à execução do serviço;")),
  saldoAds: () => li(t("Falta de saldo em conta de anúncios ou de meio de pagamento válido nas plataformas;")),
  bloqueio: (oQue: string) =>
    li(t(`Suspensão ou bloqueio ${oQue}, sem culpa das partes. Restabelecida a situação, as partes alinham a retomada em até 7 (sete) dias.`)),
};

// ---------------------------------------------------------------------------
// Montagem por tipo de serviço
// ---------------------------------------------------------------------------

export function buildContractTemplate(kind: TemplateKind, answers: TemplateAnswers): { name: string; bodyJson: string } {
  const a = answers;
  const name = TEMPLATE_KINDS.find((k) => k.kind === kind)?.name ?? "Contrato";

  const montar = (titulo: string, sections: Section[]) => ({
    name,
    bodyJson: doc(h(t(titulo)), ...identificacaoDasPartes(), ...clausulas(...sections), ...fechamento()),
  });

  // Encerramento compartilhado (proteções + duração) - igual em todos
  const proteFinal = (suspensaoItens: Node[]) => [
    secaoProtecaoDeDados(a),
    secaoConfidencialidade(a),
    secaoConduta(),
    secaoSuspensao(a, suspensaoItens),
    secaoVigencia(a),
    secaoCancelamento(a),
    secaoFinais(),
  ];

  if (kind === "trafego-pago") {
    return montar("Contrato de Gestão de Tráfego Pago", [
      secaoObjeto(
        "É a criação, configuração e o gerenciamento contínuo de campanhas de anúncios nas contas do Cliente, nas plataformas definidas no escopo, como Meta Ads e Google Ads.",
      ),
      secaoComoTrabalhamos(
        "Estratégia de campanhas com planejamento estratégico, definição de públicos, funis e orçamentos junto com o Cliente.",
        "Campanhas de anúncios cada vez mais inteligentes e assertivas, com criação aprovada pelo Cliente e alinhada ao seu negócio.",
        "Otimização constante, com análise de dados, ajustes de lances, públicos e criativos conforme o desempenho, e feedback ao Cliente.",
      ),
      secaoCompromissosAgencia([
        li(t("Estruturar, configurar e publicar as campanhas nas plataformas definidas no escopo;")),
        li(t("Definir segmentações de público, criativos e orçamentos das campanhas em conjunto com o Cliente;")),
        li(t("Acompanhar e otimizar continuamente as campanhas ativas conforme o desempenho;")),
        item.comunicarBloqueios(),
        item.credenciais(),
      ]),
      secaoCompromissosCliente([
        item.saldoAds(),
        item.acessosAds(),
        li(t("Fornecer materiais, ofertas e informações do negócio necessários à produção das campanhas;")),
        item.politicas(),
        item.aprovacoes(),
        item.estrategia(),
        item.pagamentos(),
      ]),
      secaoAprovacoes(a),
      secaoRelatorios(a),
      secaoSuporte(a),
      secaoResultados(
        "Ainda assim, os resultados de campanhas dependem de fatores externos como concorrência de leilão, qualidade da oferta, página de destino, sazonalidade e políticas das plataformas. Não há garantia de custo por lead, retorno sobre investimento ou volume de vendas específicos.",
      ),
      secaoInvestimento(a),
      verbaDeMidia(),
      seusAtivos(),
      ...proteFinal([
        suspensaoBase.pagamento(),
        suspensaoBase.saldoAds(),
        suspensaoBase.acessos(),
        suspensaoBase.bloqueio("das contas de anúncios"),
      ]),
    ]);
  }

  if (kind === "instagram") {
    return montar("Contrato de Gestão de Instagram", [
      secaoObjeto(
        "É a gestão completa do perfil de Instagram da sua marca: linha editorial, produção e publicação de conteúdos de feed, stories e reels, otimização do perfil e acompanhamento das métricas.",
      ),
      secaoComoTrabalhamos(
        "Linha editorial e calendário de conteúdo do perfil, alinhados ao posicionamento e aos objetivos da marca.",
        "Produção dos conteúdos de feed, stories e reels com design e copy das legendas, sempre com aprovação prévia do Cliente.",
        "Publicação conforme o calendário, otimização contínua do perfil e análise das métricas para crescimento e performance.",
      ),
      secaoCompromissosAgencia([
        li(t("Definir e manter a linha editorial do perfil, alinhada ao posicionamento e aos objetivos da marca;")),
        li(t("Planejar, produzir e publicar os conteúdos nos formatos e frequência definidos no escopo;")),
        li(t("Otimizar a apresentação do perfil, incluindo biografia, destaques e organização visual do feed;")),
        li(t("Monitorar comentários e mensagens relevantes, sinalizando ao Cliente situações que exijam posicionamento oficial;")),
        li(t("Comunicar prontamente restrições, limitações ou alterações relevantes de política da plataforma;")),
        item.credenciais(),
      ]),
      secaoCompromissosCliente([
        item.materiais(),
        item.aprovacoes(),
        li(t("Responder as perguntas sobre produtos e serviços recebidas no Direct, que são responsabilidade exclusiva do Cliente;")),
        item.estrategia(),
        li(t("Manter a conta do Instagram ativa, conectada e com os acessos necessários concedidos à Agência;")),
        item.direitos(),
        item.captacoes(),
        item.pagamentos(),
      ]),
      secaoProducao(a),
      secaoAprovacoes(a),
      secaoRelatorios(a),
      secaoSuporte(a),
      secaoResultados(
        "Ainda assim, o Instagram é uma plataforma de terceiros, sujeita a alterações de algoritmo, políticas de uso, limitações de alcance e eventuais instabilidades, bloqueios ou restrições de conta alheios ao controle da Agência.",
      ),
      secaoInvestimento(a, true),
      propriedadeConteudos(),
      ...proteFinal([
        suspensaoBase.pagamento(),
        suspensaoBase.acessos(),
        suspensaoBase.bloqueio("da conta de Instagram administrada"),
      ]),
    ]);
  }

  if (kind === "social-trafego") {
    return montar("Contrato de Gestão de Redes Sociais + Tráfego Pago", [
      secaoObjeto(
        "É a gestão integrada de conteúdo e mídia paga: a Agência cuida dos perfis da sua marca nas redes sociais definidas no escopo e, junto, cria e gerencia as campanhas de anúncios nas contas do Cliente, como Meta Ads e Google Ads, com estratégia unificada.",
      ),
      secaoComoTrabalhamos(
        "Linha editorial, calendário de conteúdo e estratégia de campanhas pensados juntos, a partir do posicionamento e dos objetivos da marca.",
        "Produção dos conteúdos e dos anúncios com design e copy, sempre com aprovação prévia do Cliente e alinhados entre si.",
        "Publicação, monitoramento e otimização constante de conteúdo e campanhas, com análise integrada de métricas para crescimento e performance.",
      ),
      secaoCompromissosAgencia([
        li(t("Elaborar o planejamento editorial dos perfis, com pauta de conteúdo alinhada ao posicionamento da marca;")),
        li(t("Criar, revisar e publicar os conteúdos aprovados, nos formatos e frequência definidos no escopo;")),
        li(t("Estruturar, configurar e otimizar continuamente as campanhas de anúncios nas plataformas definidas no escopo;")),
        li(t("Definir segmentações de público, criativos e orçamentos das campanhas em conjunto com o Cliente;")),
        li(t("Monitorar interações relevantes e sinalizar ao Cliente situações que exijam posicionamento oficial;")),
        item.comunicarBloqueios(),
        item.credenciais(),
      ]),
      secaoCompromissosCliente([
        item.materiais(),
        item.aprovacoes(),
        item.direct(),
        item.estrategia(),
        item.acessosPerfis(),
        item.acessosAds(),
        item.saldoAds(),
        item.politicas(),
        item.direitos(),
        item.captacoes(),
        item.pagamentos(),
      ]),
      secaoProducao(a),
      secaoAprovacoes(a),
      secaoRelatorios(a),
      secaoSuporte(a),
      secaoResultados(
        "Ainda assim, redes sociais e plataformas de anúncios são ambientes de terceiros, sujeitos a algoritmos, leilões, políticas e instabilidades fora do controle da Agência, e os resultados também dependem do produto, da oferta, do atendimento e do mercado do Cliente.",
      ),
      secaoInvestimento(a),
      verbaDeMidia(),
      propriedadeConteudos(),
      seusAtivos(),
      ...proteFinal([
        suspensaoBase.pagamento(),
        suspensaoBase.saldoAds(),
        suspensaoBase.acessos(),
        suspensaoBase.bloqueio("das contas, perfis ou contas de anúncios administrados"),
      ]),
    ]);
  }

  if (kind === "marketing-360") {
    return montar("Contrato de Gestão de Marketing 360", [
      secaoObjeto(
        "É a gestão completa do marketing da sua marca, online e offline: estratégia, redes sociais, campanhas digitais, materiais gráficos e ações presenciais, conforme as frentes definidas no escopo.",
        [
          p(
            t(
              "Por ser um serviço 360, as frentes ativas em cada período seguem o planejamento aprovado com o Cliente, sempre dentro do escopo contratado.",
            ),
          ),
        ],
      ),
      secaoComoTrabalhamos(
        "Plano de marketing integrado, unindo as frentes online e offline a partir dos objetivos de negócio do Cliente.",
        "Produção de conteúdos, campanhas, materiais e ações com aprovação prévia do Cliente, mantendo a mesma identidade em todos os canais.",
        "Execução coordenada das frentes, acompanhamento dos indicadores e otimização contínua do que estiver performando melhor.",
      ),
      secaoCompromissosAgencia([
        li(t("Elaborar e manter o plano de marketing integrado, com as frentes, metas e prioridades de cada período;")),
        li(t("Produzir os conteúdos, campanhas e materiais definidos no escopo, mantendo a identidade da marca;")),
        li(t("Coordenar fornecedores e parceiros envolvidos nas ações, quando previsto no escopo;")),
        li(t("Acompanhar os indicadores das frentes ativas e recomendar ajustes de rota;")),
        item.comunicarBloqueios(),
        item.credenciais(),
      ]),
      secaoCompromissosCliente([
        item.materiais(),
        item.aprovacoes(),
        item.estrategia(),
        item.acessosPerfis(),
        item.acessosAds(),
        item.saldoAds(),
        item.direitos(),
        item.captacoes(),
        li(t("Aprovar por escrito os orçamentos de fornecedores externos antes de cada ação;")),
        item.pagamentos(),
      ]),
      secaoProducao(a),
      secaoAprovacoes(a),
      secaoRelatorios(a),
      secaoSuporte(a),
      secaoResultados(
        "Ainda assim, os resultados dependem de fatores externos como mercado, concorrência, sazonalidade, algoritmos e políticas das plataformas, além do produto, do atendimento e da operação do Cliente.",
      ),
      secaoInvestimento(a),
      verbaDeMidia(true),
      custosDeTerceiros(),
      propriedadeConteudos(),
      seusAtivos(),
      ...proteFinal([
        suspensaoBase.pagamento(),
        suspensaoBase.saldoAds(),
        suspensaoBase.acessos(),
        suspensaoBase.bloqueio("das contas, perfis ou contas de anúncios administrados"),
      ]),
    ]);
  }

  if (kind === "criacao-conteudo") {
    return montar("Contrato de Criação de Conteúdo", [
      secaoObjeto(
        "É a produção de conteúdos sob demanda para a sua marca: artes, vídeos, fotos e textos, nos formatos e volumes definidos no escopo.",
        [
          p(
            t("Este contrato cobre a produção dos conteúdos. ", "bold"),
            t(
              "Publicação, gestão de perfis, comunidade e impulsionamento não estão inclusos, salvo previsão expressa no escopo.",
            ),
          ),
        ],
      ),
      secaoComoTrabalhamos(
        "Direção criativa e pauta dos conteúdos, alinhadas ao posicionamento e aos objetivos da marca.",
        "Produção das peças com design, roteiro e copy, sempre com aprovação prévia do Cliente.",
        "Entrega organizada dos arquivos finais nos formatos combinados, prontos para uso nos canais do Cliente.",
      ),
      secaoCompromissosAgencia([
        li(t("Produzir os conteúdos nos formatos, volumes e prazos definidos no escopo;")),
        li(t("Manter a identidade visual e o tom de voz da marca em todas as peças;")),
        li(t("Entregar os arquivos finais organizados, em pasta compartilhada com o Cliente;")),
        li(t("Sinalizar com antecedência qualquer risco de prazo nas entregas;")),
        item.credenciais(),
      ]),
      secaoCompromissosCliente([
        li(t("Fornecer briefing, informações, produtos e materiais necessários à produção de cada conteúdo;")),
        item.aprovacoes(),
        item.estrategia(),
        item.direitos(),
        item.captacoes(),
        item.pagamentos(),
      ]),
      secaoProducao(a, [
        li(t("Os arquivos finais são entregues em formato digital, organizados por pasta, e ficam disponíveis durante a vigência do contrato.")),
      ]),
      secaoAprovacoes(a),
      secaoRelatorios(a),
      secaoSuporte(a),
      secaoResultados(
        "Ainda assim, o desempenho dos conteúdos nos canais do Cliente depende de fatores externos como algoritmos, audiência, oferta e mercado, além do uso que for feito das peças entregues.",
      ),
      secaoInvestimento(a, true),
      propriedadeConteudos(),
      ...proteFinal([
        suspensaoBase.pagamento(),
        suspensaoBase.acessos(),
      ]),
    ]);
  }

  // redes-sociais (padrão)
  return montar("Contrato de Gestão de Redes Sociais", [
    secaoObjeto(
      "É a gestão estratégica e criativa dos perfis da sua marca nas redes sociais definidas no escopo, cuidando do planejamento, da produção e da publicação dos conteúdos.",
    ),
    secaoComoTrabalhamos(
      "Linha editorial e calendário de conteúdo, construídos a partir do posicionamento e dos objetivos da marca.",
      "Produção dos conteúdos com design, copy das legendas e formatos definidos no escopo, sempre com aprovação prévia do Cliente.",
      "Publicação conforme o calendário, monitoramento das interações e análise de métricas para crescimento e performance.",
    ),
    secaoCompromissosAgencia([
      li(t("Elaborar o planejamento editorial dos perfis, com pauta de conteúdo alinhada ao posicionamento da marca;")),
      li(t("Criar, revisar e publicar os conteúdos aprovados, nos formatos e frequência definidos no escopo;")),
      li(t("Monitorar interações relevantes e sinalizar ao Cliente situações que exijam posicionamento oficial;")),
      li(t("Comunicar prontamente bloqueios, restrições ou alterações relevantes de política das plataformas;")),
      item.credenciais(),
    ]),
    secaoCompromissosCliente([
      item.materiais(),
      item.aprovacoes(),
      item.direct(),
      item.estrategia(),
      item.direitos(),
      item.acessosPerfis(),
      item.captacoes(),
      item.pagamentos(),
    ]),
    secaoProducao(a),
    secaoAprovacoes(a),
    secaoRelatorios(a),
    secaoSuporte(a),
    secaoResultados(
      "Ainda assim, as redes sociais são plataformas de terceiros, sujeitas a algoritmos, políticas e instabilidades fora do controle da Agência, e os resultados também dependem do produto, do atendimento e do mercado do Cliente.",
    ),
    secaoInvestimento(a, true),
    propriedadeConteudos(),
    ...proteFinal([
      suspensaoBase.pagamento(),
      suspensaoBase.acessos(),
      suspensaoBase.bloqueio("das contas e perfis administrados"),
    ]),
  ]);
}
