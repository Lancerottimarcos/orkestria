import type { Metadata } from "next";
import { Trash2, Smartphone, Mail, Search } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider } from "@/components/ui/Dotted";

export const metadata: Metadata = {
  title: "Exclusão de dados do usuário — Orkestrya",
  description: "Como solicitar a exclusão dos seus dados conectados ao Orkestrya via Instagram, Facebook ou TikTok.",
};

function Step({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <IconChip tone="accent" size="sm" className="mt-0.5">
        <Icon size={15} strokeWidth={2} />
      </IconChip>
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <div className="mt-1.5 text-sm text-muted leading-relaxed flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}

export default function ExclusaoDeUsuarioPage() {
  return (
    <div className="min-h-screen bg-app-glow">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Logo />

        <div className="mt-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full">
            <Trash2 size={12} strokeWidth={2.2} /> Seus dados
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-light tracking-tight text-ink leading-tight">
            Exclusão de dados do usuário
          </h1>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            Quando uma conta do Instagram, Facebook ou TikTok é conectada ao Orkestrya, guardamos o token de acesso
            dessa conta e os posts agendados por ela. Esta página explica como pedir a exclusão desses dados.
          </p>
        </div>

        <div className="mt-10 bg-surface rounded-card shadow-sm shadow-black/5 p-6 sm:p-10 flex flex-col gap-8">
          <Step icon={Smartphone} title="Pelas configurações do Facebook, Instagram ou TikTok">
            <p>
              Vá em <strong className="text-ink font-medium">Configurações → Aplicativos e sites</strong> (no
              Facebook) ou <strong className="text-ink font-medium">Configurações → Apps e sites conectados</strong>{" "}
              (no Instagram), encontre <strong className="text-ink font-medium">Orkestrya</strong> na lista e
              escolha remover o app e excluir os dados.
            </p>
            <p>
              Isso aciona automaticamente a exclusão do token de acesso e de todas as publicações agendadas dessa
              conta no nosso sistema, e a Meta mostra um link para acompanhar o status do pedido.
            </p>
            <p>
              No TikTok, o caminho é{" "}
              <strong className="text-ink font-medium">Configurações e privacidade → Segurança e login → Apps e sites conectados</strong>,
              encontre <strong className="text-ink font-medium">Orkestrya</strong> na lista e remova o acesso. Isso
              revoga o token do lado do TikTok, mas não apaga automaticamente o que já está guardado no nosso
              sistema - pra isso, use uma das opções abaixo.
            </p>
          </Step>

          <DottedDivider />

          <Step icon={Search} title="Consultar o status de um pedido">
            <p>
              Se você recebeu um código de confirmação da Meta ao pedir a exclusão, pode conferir o status em{" "}
              <span className="font-mono text-xs bg-surface-2 px-1.5 py-0.5 rounded text-ink">
                suaagencia.com.br/solicitacoes-exclusao-dados/&lt;código&gt;
              </span>
              .
            </p>
          </Step>

          <DottedDivider />

          <Step icon={Mail} title="Diretamente com a gente">
            <p>
              Também pode desconectar a conta a qualquer momento pela tela de Integrações dentro do Orkestrya
              (quem administra a agência tem acesso a isso), ou pedir por e-mail:
            </p>
            <a
              href="mailto:contato@suaagencia.com.br"
              className="inline-flex items-center gap-2 w-fit px-4 py-2.5 rounded-full bg-accent/10 text-accent text-sm font-semibold hover:bg-accent/15 transition-colors"
            >
              <Mail size={14} strokeWidth={2.2} /> contato@suaagencia.com.br
            </a>
            <p>Pedidos por e-mail são atendidos em até 15 dias úteis.</p>
          </Step>
        </div>
      </div>
    </div>
  );
}
