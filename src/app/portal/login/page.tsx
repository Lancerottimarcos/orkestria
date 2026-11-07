"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Button } from "@/components/ui/Button";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider } from "@/components/ui/Dotted";
import { Checkbox } from "@/components/ui/Checkbox";
import { LogIn, ClipboardCheck, Clock3, MessageSquareWarning, Smartphone, CheckCircle2 } from "lucide-react";

function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const empresa = searchParams.get("empresa");
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("client-credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError("Email ou senha inválidos.");
      return;
    }

    await fetch("/api/auth/persist-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remember: rememberMe }),
    });

    setLoading(false);
    const callbackUrl = searchParams.get("callbackUrl") || "/portal";
    router.push(callbackUrl);
    router.refresh();
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
        <div className="flex flex-col gap-5">
          <IconChip tone="accent" size="lg">
            <ClipboardCheck size={20} strokeWidth={1.8} />
          </IconChip>
          <div>
            <h1 className="text-[28px] font-light tracking-tight leading-tight text-ink">
              {empresa ? `Portal de ${empresa}` : "Portal do Cliente"}
            </h1>
            <p className="text-sm text-muted mt-2.5">Acompanhe suas aprovações de posts</p>
          </div>
        </div>

        <DottedDivider className="my-6" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Email">
            <Input
              type="email"
              required
              autoFocus={!email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@suaempresa.com"
              className="focus:ring-4 focus:ring-accent/10"
            />
          </Field>
          <Field label="Senha">
            <PasswordInput
              required
              autoFocus={!!email}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="focus:ring-4 focus:ring-accent/10"
            />
          </Field>

          <div className="flex items-center justify-between gap-3 mt-1 pl-1.5">
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink cursor-pointer">
              <Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              Manter-me conectado
            </label>
            <Link
              href="/portal/esqueci-senha"
              className="text-[13px] font-medium text-muted hover:text-accent transition-colors"
            >
              Esqueci minha senha
            </Link>
          </div>

          {error && (
            <p className="rounded-full bg-danger/10 text-danger text-[13px] font-medium px-4 py-2.5 text-center">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full">
            <LogIn size={16} />
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={null}>
      <PortalLoginForm />
    </Suspense>
  );
}
