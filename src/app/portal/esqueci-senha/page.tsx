"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, CheckCircle2, ClipboardCheck, Clock3, MessageSquareWarning, Smartphone } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider } from "@/components/ui/Dotted";

export default function PortalEsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/clientes/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      headline="Acompanhe e aprove o conteúdo da sua marca em um só lugar."
      description="Veja tudo o que está aguardando sua aprovação, peça alterações e acompanhe o histórico, sem precisar de email ou WhatsApp."
      bullets={[
        { icon: ClipboardCheck, label: "Aprovar ou reprovar posts com um clique" },
        { icon: MessageSquareWarning, label: "Pedir alterações com comentários" },
        { icon: Clock3, label: "Acompanhar o status de cada peça" },
        { icon: Smartphone, label: "Aprovação simples, direto do celular" },
      ]}
      highlight={{
        icon: CheckCircle2,
        title: "Post aprovado agora mesmo",
        subtitle: "Decisões registradas em tempo real",
      }}
    >
      <div className="bg-surface rounded-card p-6 sm:p-10 shadow-xl shadow-black/10">
        {submitted ? (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <span className="w-14 h-14 rounded-full bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 size={26} strokeWidth={1.8} />
            </span>
            <h1 className="text-[28px] font-light tracking-tight leading-none text-ink">Pedido enviado</h1>
            <p className="text-sm text-muted leading-relaxed">
              Se esse email existir, a agência foi notificada e vai te enviar uma nova senha em breve.
            </p>
            <Link
              href="/portal/login"
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-semibold bg-surface-2 text-ink hover:bg-surface-3 transition-colors mt-2"
            >
              <ArrowLeft size={14} /> Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-5">
              <IconChip tone="accent" size="lg">
                <KeyRound size={20} strokeWidth={1.8} />
              </IconChip>
              <div>
                <h1 className="text-[28px] font-light tracking-tight leading-tight text-ink">Esqueci minha senha</h1>
                <p className="text-sm text-muted mt-2.5 leading-relaxed">
                  Informe o email de acesso ao portal, a agência vai receber o pedido e gerar uma nova senha para você.
                </p>
              </div>
            </div>

            <DottedDivider className="my-6" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Field label="Email">
                <Input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@suaempresa.com"
                  className="focus:ring-4 focus:ring-accent/10"
                />
              </Field>

              <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full">
                <KeyRound size={16} />
                {loading ? "Enviando..." : "Solicitar nova senha"}
              </Button>

              <Link
                href="/portal/login"
                className="inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-muted hover:text-accent transition-colors"
              >
                <ArrowLeft size={14} /> Voltar para o login
              </Link>
            </form>
          </>
        )}
      </div>
    </AuthShell>
  );
}
