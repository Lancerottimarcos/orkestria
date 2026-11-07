import type { Metadata } from "next";
import {
  ShieldCheck,
  Building2,
  Database,
  Settings2,
  Share2,
  Lock,
  Trash2,
  UserCheck,
  Cookie,
  History,
  Mail,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider } from "@/components/ui/Dotted";
import {
  InstagramIcon,
  TikTokIcon as TikTokGlyph,
  YouTubeIcon as YouTubeGlyphIcon,
  LinkedInIcon as LinkedInGlyphIcon,
  ThreadsIcon as ThreadsGlyphIcon,
} from "@/components/kanban/SocialIcons";

function InstagramGlyph({ size, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return <InstagramIcon size={size} className={className} />;
}

function TikTokIcon({ size, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return <TikTokGlyph size={size} className={className} />;
}

function YouTubeIcon({ size, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return <YouTubeGlyphIcon size={size} className={className} />;
}

function LinkedInIcon({ size, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return <LinkedInGlyphIcon size={size} className={className} />;
}

function ThreadsIcon({ size, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return <ThreadsGlyphIcon size={size} className={className} />;
}

export const metadata: Metadata = {
  title: "Política de Privacidade — Orkestrya",
  description:
    "Como o Orkestrya coleta, usa, compartilha e protege dados dentro do sistema de gestão de agências, incluindo as integrações com Instagram, Facebook, TikTok, YouTube, LinkedIn e Threads.",
};

const LAST_UPDATED = "22 de agosto de 2026";

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <div className="flex items-center gap-3 mb-4">
        <IconChip tone="accent" size="sm">
          <Icon size={15} strokeWidth={2} />
        </IconChip>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
      </div>
      <div className="flex flex-col gap-3 text-sm text-muted leading-relaxed pl-11">{children}</div>
    </section>
  );
}

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="min-h-screen bg-app-glow">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Logo />

        <div className="mt-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full">
            <ShieldCheck size={12} strokeWidth={2.2} /> Privacidade
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-light tracking-tight text-ink leading-tight">
            Política de Privacidade
          </h1>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            Esta política explica como o <strong className="text-ink font-semibold">Orkestrya</strong>, sistema de
            gestão de agências desenvolvido e operado pelo Portal Publicitário, coleta, usa, compartilha e protege
            dados de contas de usuários, clientes cadastrados e das integrações com redes sociais.
          </p>
          <p className="mt-3 text-xs text-muted-2">Última atualização: {LAST_UPDATED}</p>
        </div>

        <div className="mt-10 bg-surface rounded-card shadow-sm shadow-black/5 p-6 sm:p-10 flex flex-col gap-10">
            <Section id="introducao" icon={ShieldCheck} title="Introdução">
              <p>
                O Orkestrya é um sistema de gestão voltado para agências de publicidade e marketing, usado para
                organizar clientes, projetos, demandas, propostas, financeiro, equipe e o agendamento de conteúdo
                para redes sociais. Esta política descreve, de forma direta, quais dados passam pelo sistema e o
                que fazemos com eles.
              </p>
              <p>
                Ao usar o Orkestrya, seja como colaborador de uma agência ou como cliente com acesso ao portal, você
                concorda com as práticas descritas aqui.
              </p>
            </Section>

            <DottedDivider />

            <Section id="controlador" icon={Building2} title="Quem é o controlador dos dados">
              <p>
                O Orkestrya é operado pelo <strong className="text-ink font-semibold">Portal Publicitário</strong>,
                que atua como controlador dos dados para as agências que contratam o sistema, e como operador dos
                dados que essas agências cadastram sobre os próprios clientes delas.
              </p>
              <p>
                Cada agência é responsável por garantir que tem base legal para cadastrar dados de seus clientes,
                colaboradores e contas de redes sociais dentro do sistema.
              </p>
            </Section>

            <DottedDivider />

            <Section id="dados-coletados" icon={Database} title="Quais dados coletamos">
              <p>Dependendo de como o sistema é usado, coletamos:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5 marker:text-accent">
                <li>
                  <strong className="text-ink font-medium">Dados de conta:</strong> nome, e-mail e senha (armazenada
                  com hash) de cada usuário e cliente com acesso ao sistema ou ao portal.
                </li>
                <li>
                  <strong className="text-ink font-medium">Dados de clientes da agência:</strong> informações
                  cadastrais, projetos, demandas, anexos, notas, checklists, propostas comerciais e histórico
                  financeiro registrados pela equipe.
                </li>
                <li>
                  <strong className="text-ink font-medium">Conteúdo enviado:</strong> imagens, vídeos e textos
                  anexados a demandas, propostas ou agendamentos de posts.
                </li>
                <li>
                  <strong className="text-ink font-medium">Dados de integrações:</strong> tokens de acesso e
                  identificadores de contas conectadas do Instagram, Facebook, TikTok, YouTube, LinkedIn e Threads,
                  descritos em detalhe nas seções seguintes.
                </li>
                <li>
                  <strong className="text-ink font-medium">Dados técnicos:</strong> registros de acesso e uso do
                  sistema, necessários para segurança e diagnóstico de problemas.
                </li>
              </ul>
            </Section>

            <DottedDivider />

            <Section id="integracao-meta" icon={InstagramGlyph} title="Integração com Instagram e Facebook">
              <p>
                O Orkestrya oferece uma integração opcional com a API da Meta para agendar e publicar conteúdo
                diretamente no Instagram e no Facebook das contas conectadas por cada agência.
              </p>
              <p>Quando uma conta é conectada, através do fluxo oficial de login da Meta, armazenamos:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5 marker:text-accent">
                <li>O token de acesso de longa duração emitido pela Meta para a Página do Facebook e/ou conta
                  profissional do Instagram autorizada.</li>
                <li>Identificadores da Página e da conta do Instagram (nome, foto e ID), para exibir qual conta
                  está conectada.</li>
                <li>O conteúdo e os metadados (rede, data e horário) de cada publicação agendada pela agência.</li>
              </ul>
              <p>
                Esses dados são usados exclusivamente para publicar o conteúdo agendado pela própria agência nas
                contas que ela mesma conectou e autorizou. O Orkestrya não acessa, lê ou coleta dados de outras
                contas do Instagram ou Facebook além das explicitamente conectadas por cada agência, e não usa
                esses dados para fins de publicidade.
              </p>
              <p>
                A conexão pode ser desfeita a qualquer momento pela própria agência, na tela de integrações do
                sistema, o que revoga o acesso e apaga o token armazenado.
              </p>
            </Section>

            <DottedDivider />

            <Section id="integracao-tiktok" icon={TikTokIcon} title="Integração com TikTok">
              <p>
                O Orkestrya também oferece uma integração opcional com a Content Posting API do TikTok, para
                agendar e publicar conteúdo diretamente na conta do TikTok conectada por cada agência.
              </p>
              <p>Quando uma conta é conectada, através do fluxo oficial de login do TikTok (Login Kit), armazenamos:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5 marker:text-accent">
                <li>O token de acesso e o token de renovação (refresh token) emitidos pelo TikTok para a conta
                  autorizada.</li>
                <li>O identificador da conta (open id), nome e nome de usuário exibidos, para identificar qual
                  conta está conectada.</li>
                <li>O conteúdo e os metadados (data e horário) de cada publicação agendada pela agência.</li>
              </ul>
              <p>
                Assim como na integração com a Meta, esses dados são usados exclusivamente para publicar o conteúdo
                agendado pela própria agência na conta que ela mesma conectou e autorizou. O Orkestrya não acessa,
                lê ou coleta dados de outras contas do TikTok além da explicitamente conectada por cada agência, e
                não usa esses dados para fins de publicidade.
              </p>
              <p>
                A conexão pode ser desfeita a qualquer momento pela própria agência, na tela de integrações do
                sistema, o que revoga o acesso e apaga os tokens armazenados.
              </p>
            </Section>

            <DottedDivider />

            <Section id="integracao-youtube" icon={YouTubeIcon} title="Integração com YouTube">
              <p>
                O Orkestrya também oferece uma integração opcional com a YouTube Data API v3 (Google), para agendar
                e publicar vídeos diretamente no canal conectado por cada agência.
              </p>
              <p>
                Quando um canal é conectado, através do fluxo oficial de login do Google (OAuth 2.0), solicitamos o
                escopo <code className="text-xs bg-surface-2 px-1.5 py-0.5 rounded">youtube.force-ssl</code>, que
                permite enviar, atualizar e apagar vídeos no canal autorizado, e armazenamos:
              </p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5 marker:text-accent">
                <li>O token de acesso e o token de renovação (refresh token) emitidos pelo Google para o canal
                  autorizado.</li>
                <li>O identificador do canal (channel ID) e o nome exibido, para identificar qual canal está
                  conectado.</li>
                <li>O conteúdo e os metadados (título, descrição, data e horário) de cada vídeo agendado pela
                  agência.</li>
              </ul>
              <p>
                Assim como nas demais integrações, esses dados são usados exclusivamente para publicar o conteúdo
                agendado pela própria agência no canal que ela mesma conectou e autorizou. O Orkestrya não acessa,
                lê ou coleta dados de outros canais do YouTube além do explicitamente conectado por cada agência,
                não usa esses dados para fins de publicidade, e não os usa para treinar modelos de inteligência
                artificial.
              </p>
              <p>
                A conexão pode ser desfeita a qualquer momento pela própria agência, na tela de integrações do
                sistema, o que revoga o acesso e apaga os tokens armazenados.
              </p>
            </Section>

            <DottedDivider />

            <Section id="integracao-linkedin" icon={LinkedInIcon} title="Integração com LinkedIn">
              <p>
                O Orkestrya também oferece uma integração opcional com a API do LinkedIn (Posts API), para agendar
                e publicar conteúdo diretamente na Company Page conectada por cada agência.
              </p>
              <p>Quando uma Company Page é conectada, através do fluxo oficial de login do LinkedIn, armazenamos:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5 marker:text-accent">
                <li>O token de acesso emitido pelo LinkedIn para a Company Page autorizada.</li>
                <li>O identificador da organização (organization ID) e o nome exibido, para identificar qual
                  página está conectada.</li>
                <li>O conteúdo e os metadados (data e horário) de cada publicação agendada pela agência.</li>
              </ul>
              <p>
                Esses dados são usados exclusivamente para publicar o conteúdo agendado pela própria agência na
                Company Page que ela mesma conectou e autorizou. O Orkestrya não acessa, lê ou coleta dados de
                outras páginas do LinkedIn além da explicitamente conectada por cada agência, e não usa esses dados
                para fins de publicidade.
              </p>
              <p>
                A conexão pode ser desfeita a qualquer momento pela própria agência, na tela de integrações do
                sistema, o que revoga o acesso e apaga o token armazenado.
              </p>
            </Section>

            <DottedDivider />

            <Section id="integracao-threads" icon={ThreadsIcon} title="Integração com Threads">
              <p>
                O Orkestrya também oferece uma integração opcional com a API do Threads (Meta), para agendar e
                publicar conteúdo diretamente no perfil conectado por cada agência.
              </p>
              <p>Quando um perfil é conectado, através do fluxo oficial de login do Threads, armazenamos:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5 marker:text-accent">
                <li>O token de acesso emitido pelo Threads para o perfil autorizado.</li>
                <li>O identificador do perfil (Threads user ID) e o nome de usuário, para identificar qual conta
                  está conectada.</li>
                <li>O conteúdo e os metadados (data e horário) de cada publicação agendada pela agência.</li>
              </ul>
              <p>
                Esses dados são usados exclusivamente para publicar o conteúdo agendado pela própria agência no
                perfil que ela mesma conectou e autorizou. O Orkestrya não acessa, lê ou coleta dados de outros
                perfis do Threads além do explicitamente conectado por cada agência, e não usa esses dados para
                fins de publicidade.
              </p>
              <p>
                A conexão pode ser desfeita a qualquer momento pela própria agência, na tela de integrações do
                sistema, o que revoga o acesso e apaga o token armazenado.
              </p>
            </Section>

            <DottedDivider />

            <Section id="uso-dos-dados" icon={Settings2} title="Como usamos os dados">
              <ul className="list-disc pl-5 flex flex-col gap-1.5 marker:text-accent">
                <li>Operar as funcionalidades do sistema: gestão de clientes, projetos, kanban, aprovações,
                  financeiro, propostas, chat interno e agendamento de conteúdo.</li>
                <li>Autenticar usuários e controlar permissões de acesso por perfil e módulo.</li>
                <li>Publicar, na data e hora agendadas, o conteúdo que a própria agência preparou para as contas
                  de redes sociais que ela conectou.</li>
                <li>Gerar relatórios e indicadores de desempenho dentro da própria agência.</li>
                <li>Diagnosticar falhas técnicas e manter a segurança do sistema.</li>
              </ul>
              <p>Não vendemos dados a terceiros, nem os usamos para treinar modelos de terceiros.</p>
            </Section>

            <DottedDivider />

            <Section id="compartilhamento" icon={Share2} title="Compartilhamento com terceiros">
              <p>Os dados são compartilhados apenas nas seguintes situações:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5 marker:text-accent">
                <li>
                  <strong className="text-ink font-medium">Meta Platforms, Inc.:</strong> exclusivamente para
                  publicar o conteúdo agendado nas contas de Instagram e Facebook conectadas, através da API
                  oficial da Meta.
                </li>
                <li>
                  <strong className="text-ink font-medium">TikTok Pte. Ltd.:</strong> exclusivamente para publicar
                  o conteúdo agendado na conta de TikTok conectada, através da Content Posting API oficial do
                  TikTok.
                </li>
                <li>
                  <strong className="text-ink font-medium">Google LLC (YouTube):</strong> exclusivamente para
                  publicar o conteúdo agendado no canal do YouTube conectado, através da YouTube Data API v3
                  oficial.
                </li>
                <li>
                  <strong className="text-ink font-medium">LinkedIn Corporation:</strong> exclusivamente para
                  publicar o conteúdo agendado na Company Page do LinkedIn conectada, através da Posts API oficial
                  do LinkedIn.
                </li>
                <li>
                  <strong className="text-ink font-medium">Meta Platforms, Inc. (Threads):</strong> exclusivamente
                  para publicar o conteúdo agendado no perfil do Threads conectado, através da API oficial do
                  Threads.
                </li>
                <li>
                  <strong className="text-ink font-medium">Provedores de infraestrutura:</strong> o servidor onde o
                  sistema roda e onde os dados ficam armazenados.
                </li>
                <li>
                  <strong className="text-ink font-medium">Obrigação legal:</strong> quando exigido por lei ou
                  ordem judicial.
                </li>
              </ul>
            </Section>

            <DottedDivider />

            <Section id="seguranca" icon={Lock} title="Segurança da informação">
              <ul className="list-disc pl-5 flex flex-col gap-1.5 marker:text-accent">
                <li>Senhas nunca são armazenadas em texto puro.</li>
                <li>Tokens de acesso das integrações com redes sociais são armazenados criptografados
                  (AES-256-GCM), e não em texto legível, mesmo dentro do banco de dados.</li>
                <li>O acesso a áreas administrativas e de configuração é restrito por perfil de usuário.</li>
                <li>A comunicação entre o navegador e o servidor é feita sempre por conexão criptografada
                  (HTTPS).</li>
              </ul>
            </Section>

            <DottedDivider />

            <Section id="retencao-exclusao" icon={Trash2} title="Retenção e exclusão de dados">
              <p>
                Os dados ficam armazenados enquanto a conta da agência ou do cliente estiver ativa no sistema, ou
                pelo prazo necessário para cumprir obrigações legais e fiscais.
              </p>
              <p>Você pode solicitar a exclusão dos seus dados, ou a desconexão de uma conta de rede social conectada, a qualquer momento. Veja como em{" "}
                <a href="/exclusao-de-usuario" className="text-accent hover:underline">Exclusão de dados do usuário</a>.
              </p>
            </Section>

            <DottedDivider />

            <Section id="direitos-titular" icon={UserCheck} title="Direitos do titular (LGPD)">
              <p>Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode solicitar, a qualquer momento:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1.5 marker:text-accent">
                <li>Confirmação da existência de tratamento e acesso aos seus dados.</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade.</li>
                <li>Portabilidade dos dados a outro fornecedor.</li>
                <li>Revogação do consentimento e eliminação dos dados tratados com base nele.</li>
              </ul>
              <p>Essas solicitações podem ser feitas pelo canal de contato ao final desta página.</p>
            </Section>

            <DottedDivider />

            <Section id="cookies" icon={Cookie} title="Cookies e sessão">
              <p>
                O Orkestrya usa cookies essenciais para manter a sessão de login e lembrar preferências de exibição
                (como tema claro/escuro e formato do menu). Não usamos cookies de rastreamento publicitário nem
                compartilhamos esses dados com redes de anúncios.
              </p>
            </Section>

            <DottedDivider />

            <Section id="alteracoes" icon={History} title="Alterações desta política">
              <p>
                Esta política pode ser atualizada para refletir mudanças no sistema ou na legislação aplicável. A
                data no topo desta página indica a versão mais recente. Mudanças relevantes serão comunicadas às
                agências usuárias por e-mail ou aviso dentro do sistema.
              </p>
            </Section>

            <DottedDivider />

            <Section id="contato" icon={Mail} title="Contato">
              <p>
                Dúvidas sobre esta política ou solicitações relacionadas aos seus dados podem ser enviadas para:
              </p>
              <a
                href="mailto:contato@suaagencia.com.br"
                className="inline-flex items-center gap-2 w-fit px-4 py-2.5 rounded-full bg-accent/10 text-accent text-sm font-semibold hover:bg-accent/15 transition-colors"
              >
                <Mail size={14} strokeWidth={2.2} /> contato@suaagencia.com.br
              </a>
            </Section>
        </div>
      </div>
    </div>
  );
}
