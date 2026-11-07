import { NotebookText } from "lucide-react";

export default function NotasPage() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
      <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-muted">
        <NotebookText size={20} />
      </div>
      <div>
        <p className="text-sm font-bold text-ink">Selecione uma nota</p>
        <p className="text-xs text-muted mt-1 max-w-xs">
          Escolha uma nota na lista ao lado ou crie uma nova para começar a escrever.
        </p>
      </div>
    </div>
  );
}
