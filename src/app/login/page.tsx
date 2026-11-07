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
import { LogIn, Building2, ClipboardList, Wallet, ClipboardCheck, LayoutGrid } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    const result = await signIn("credentials", {
      email: cleanEmail,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      console.error("[LOGIN_RESULT]", result);
      if (result.error === "CredentialsSignin") {
        setError("Email ou senha inválidos.");
      } else {
        setError(`Erro ao autenticar: ${result.error}`);
      }
      return;
    }

    await fetch("/api/auth/persist-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remember: rememberMe }),
    });

    setLoading(false);
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    window.location.href = callbackUrl;
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
        <div className="flex flex-col gap-5">
          <IconChip tone="accent" size="lg">
            <LogIn size={20} strokeWidth={1.8} />
          </IconChip>
          <div>
            <h1 className="text-[32px] font-light tracking-tight leading-none text-ink">Entrar</h1>
            <p className="text-sm text-muted mt-2.5">Acesse o painel da sua agência</p>
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
          <Field label="Senha">
            <PasswordInput
              required
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
              href="/esqueci-senha"
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
