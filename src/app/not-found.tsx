import Link from "next/link";
import { Home } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-app-glow">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-accent/10 blur-[130px]" />
        <div className="absolute bottom-[-12rem] right-[-8rem] w-[26rem] h-[26rem] rounded-full bg-accent-light/[0.06] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center flex flex-col items-center">
        <Logo />

        <p className="mt-12 text-[110px] sm:text-[140px] font-light tracking-tight leading-none text-ink">404</p>
        <h1 className="mt-5 text-lg font-semibold text-ink">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          A página que você procura não existe ou foi movida.
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors cursor-pointer px-6 py-3 text-sm bg-accent text-black hover:bg-accent-light"
        >
          <Home size={15} /> Voltar para o início
        </Link>
      </div>
    </div>
  );
}
