"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, KeyRound, CheckCircle2, Building2, ClipboardList, Wallet, ClipboardCheck, LayoutGrid } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider } from "@/components/ui/Dotted";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/usuarios/forgot-password", {
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
      headline="Toda a sua agência, organizada em um só lugar."
      description="Clientes, projetos, demandas, financeiro e aprovações, tudo centralizado e sob o controle de quem administra."
      bullets={[
        { icon: Building2, label: "Gestão completa da agência" },
        { icon: ClipboardList, label: "Gestão de Demandas e Conteúdo" },
        { icon: Wallet, label: "Financeiro sob controle" },
        { icon: ClipboardCheck, label: "Aprovação de posts com os clientes" },
      ]}
      highlight={{
        icon: LayoutGrid,
        title: "Tudo o que a agência precisa, em um só lugar",
        subtitle: "Demandas, financeiro e aprovações, sem planilhas soltas",
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
              Se esse email existir no sistema, o administrador foi notificado e vai gerar uma nova senha para você em breve.
            </p>
            <Link
              href="/login"
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
                  Informe seu email, o administrador vai receber o pedido e gerar uma nova senha para você.
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
                  placeholder="voce@agencia.com"
                  className="focus:ring-4 focus:ring-accent/10"
                />
              </Field>

              <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full">
                <KeyRound size={16} />
                {loading ? "Enviando..." : "Solicitar nova senha"}
              </Button>

              <Link
                href="/login"
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
