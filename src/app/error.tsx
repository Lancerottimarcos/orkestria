"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RotateCcw } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-app-glow">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-danger/10 blur-[130px]" />
        <div className="absolute bottom-[-12rem] right-[-8rem] w-[26rem] h-[26rem] rounded-full bg-accent-light/[0.06] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center flex flex-col items-center">
        <Logo />

        <p className="mt-12 text-[96px] sm:text-[120px] font-light tracking-tight leading-none text-ink">Ops</p>
        <h1 className="mt-5 text-lg font-semibold text-ink">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed max-w-sm">
          Ocorreu um erro inesperado. Você pode tentar novamente ou voltar para o início.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Button type="button" variant="ghost" size="lg" onClick={() => unstable_retry()}>
            <RotateCcw size={15} /> Tentar novamente
          </Button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors cursor-pointer px-6 py-3 text-sm bg-accent text-black hover:bg-accent-light"
          >
            <Home size={15} /> Início
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 text-[11px] text-muted-2 font-mono">Código: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
