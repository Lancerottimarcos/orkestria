import type { Metadata } from "next";
import {
  FileText,
  UserCheck,
  Building2,
  ShieldAlert,
  Share2,
  Ban,
  History,
  Scale,
  Mail,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider } from "@/components/ui/Dotted";

export const metadata: Metadata = {
  title: "Termos de Uso — Orkestrya",
  description: "Termos que regem o uso do Orkestrya, sistema de gestão de agências operado pelo Portal Publicitário.",
};

const LAST_UPDATED = "21 de agosto de 2026";

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

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-app-glow">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Logo />

        <div className="mt-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full">
            <FileText size={12} strokeWidth={2.2} /> Termos
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-light tracking-tight text-ink leading-tight">Termos de Uso</h1>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            Estes termos regem o uso do <strong className="text-ink font-semibold">Orkestrya</strong>, sistema de
            gestão de agências desenvolvido e operado pelo Portal Publicitário. Ao acessar ou usar o sistema, você
            concorda com o que está descrito aqui.
          </p>
          <p className="mt-3 text-xs text-muted-2">Última atualização: {LAST_UPDATED}</p>
        </div>

        <div className="mt-10 bg-surface rounded-card shadow-sm shadow-black/5 p-6 sm:p-10 flex flex-col gap-10">
          <Section id="o-servico" icon={FileText} title="O que é o Orkestrya">
            <p>
              O Orkestrya é um sistema de gestão voltado para agências de publicidade e marketing: organização de
              clientes, projetos, demandas, propostas comerciais, financeiro, equipe, aprovação de conteúdo e
              agendamento de publicações em redes sociais (Instagram, Facebook e TikTok).
            </p>
            <p>O sistema é oferecido “como está”, podendo receber atualizações, correções e novas funcionalidades a qualquer momento.</p>
          </Section>

          <DottedDivider />

          <Section id="contas-e-acesso" icon={UserCheck} title="Contas e acesso">
            <ul className="list-disc pl-5 flex flex-col gap-1.5 marker:text-accent">
              <li>O acesso é concedido por convite/cadastro feito por um administrador da agência.</li>
              <li>Cada pessoa é responsável por manter sua senha em sigilo e por toda atividade realizada com sua conta.</li>
              <li>Clientes de uma agência podem receber acesso a um portal próprio, com permissões restritas ao que a agência autorizar.</li>
            </ul>
          </Section>

          <DottedDivider />

          <Section id="responsabilidade-agencia" icon={Building2} title="Responsabilidade de cada agência">
            <p>
              Cada agência que usa o Orkestrya é responsável pelos dados que cadastra sobre seus próprios clientes,
              projetos e conteúdos, e por ter base legal para tratá-los (inclusive dados pessoais de terceiros).
            </p>
            <p>
              As integrações com Instagram, Facebook e TikTok publicam conteúdo diretamente nas contas que a própria
              agência conectou e autorizou - o Orkestrya não publica, acessa ou modifica nenhuma conta de rede
              social que não tenha sido explicitamente conectada por quem administra o sistema.
            </p>
          </Section>

          <DottedDivider />

          <Section id="uso-aceitavel" icon={Ban} title="Uso aceitável">
            <p>Ao usar o Orkestrya, você concorda em não:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 marker:text-accent">
              <li>Usar o sistema para publicar conteúdo ilegal, enganoso ou que viole direitos de terceiros.</li>
              <li>Tentar acessar contas, dados ou áreas do sistema sem autorização.</li>
              <li>Usar as integrações com redes sociais de forma que viole os termos de uso da Meta ou do TikTok.</li>
              <li>Interferir no funcionamento do sistema ou tentar contornar suas medidas de segurança.</li>
            </ul>
          </Section>

          <DottedDivider />

          <Section id="integracoes-terceiros" icon={Share2} title="Integrações com redes sociais">
            <p>
              O agendamento e a publicação de conteúdo via Instagram, Facebook e TikTok dependem das respectivas
              APIs desses serviços, que podem mudar, ficar indisponíveis ou exigir reconexão da conta a qualquer
              momento, por decisão dessas plataformas e fora do controle do Orkestrya.
            </p>
            <p>
              Detalhes sobre quais dados essas integrações armazenam e como são usados estão na{" "}
              <a href="/politica-de-privacidade" className="text-accent hover:underline">Política de Privacidade</a>.
            </p>
          </Section>

          <DottedDivider />

          <Section id="limitacao-responsabilidade" icon={ShieldAlert} title="Limitação de responsabilidade">
            <p>
              O Orkestrya é fornecido sem garantias de disponibilidade ininterrupta. Não nos responsabilizamos por
              perdas decorrentes de indisponibilidade do sistema, falhas nas APIs de terceiros (Meta, TikTok) ou uso
              indevido das ferramentas por parte de uma agência ou de seus clientes.
            </p>
          </Section>

          <DottedDivider />

          <Section id="alteracoes" icon={History} title="Alterações destes termos">
            <p>
              Estes termos podem ser atualizados para refletir mudanças no sistema ou na legislação aplicável. A
              data no topo desta página indica a versão mais recente.
            </p>
          </Section>

          <DottedDivider />

          <Section id="lei-aplicavel" icon={Scale} title="Lei aplicável">
            <p>Estes termos são regidos pelas leis da República Federativa do Brasil.</p>
          </Section>

          <DottedDivider />

          <Section id="contato" icon={Mail} title="Contato">
            <p>Dúvidas sobre estes termos podem ser enviadas para:</p>
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
