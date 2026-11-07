"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type AlertOptions = {
  title?: string;
  okLabel?: string;
};

type PendingDialog =
  | ({ kind: "confirm"; message: string; resolve: (value: boolean) => void } & ConfirmOptions)
  | ({ kind: "alert"; message: string; resolve: () => void } & AlertOptions);

type DialogContextValue = {
  confirmDialog: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  alertDialog: (message: string, options?: AlertOptions) => Promise<void>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

/**
 * Substitui window.confirm/window.alert (janela feia do navegador, fora do
 * controle visual do app) por um modal no próprio estilo do Orkestrya.
 * Monta uma vez no layout - qualquer componente chama useConfirmDialog() em
 * vez de confirm()/alert() diretamente.
 */
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingDialog | null>(null);
  // Guarda o último diálogo enquanto o Modal roda a animação de saída, pra
  // não sumir o conteúdo antes do fade/scale terminar (pending já virou
  // null nesse momento, mas o Modal ainda está desmontando aos poucos).
  const [displayed, setDisplayed] = useState<PendingDialog | null>(null);

  useEffect(() => {
    if (pending) setDisplayed(pending);
  }, [pending]);

  const confirmDialog = useCallback((message: string, options?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ kind: "confirm", message, resolve, ...options });
    });
  }, []);

  const alertDialog = useCallback((message: string, options?: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setPending({ kind: "alert", message, resolve, ...options });
    });
  }, []);

  function close() {
    if (pending?.kind === "confirm") pending.resolve(false);
    else if (pending?.kind === "alert") pending.resolve();
    setPending(null);
  }

  function handleConfirm() {
    if (pending?.kind === "confirm") pending.resolve(true);
    setPending(null);
  }

  function handleOk() {
    if (pending?.kind === "alert") pending.resolve();
    setPending(null);
  }

  const isDanger = displayed?.kind === "confirm" && (displayed.tone ?? "danger") === "danger";

  return (
    <DialogContext.Provider value={{ confirmDialog, alertDialog }}>
      {children}
      <Modal
        open={Boolean(pending)}
        onClose={close}
        title={displayed?.title ?? (displayed?.kind === "alert" ? "Aviso" : "Confirmar ação")}
        width="sm"
      >
        {displayed && (
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3">
              <span
                className={
                  isDanger
                    ? "w-9 h-9 rounded-full bg-danger/10 text-danger flex items-center justify-center flex-shrink-0"
                    : "w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center flex-shrink-0"
                }
              >
                {isDanger ? <AlertTriangle size={17} /> : <Info size={17} />}
              </span>
              <p className="text-sm text-ink leading-relaxed pt-1.5">{displayed.message}</p>
            </div>
            <div className="flex justify-end gap-3">
              {displayed.kind === "confirm" ? (
                <>
                  <Button variant="ghost" onClick={close}>
                    {displayed.cancelLabel ?? "Cancelar"}
                  </Button>
                  <Button variant={isDanger ? "danger" : "primary"} onClick={handleConfirm}>
                    {displayed.confirmLabel ?? "Confirmar"}
                  </Button>
                </>
              ) : (
                <Button onClick={handleOk}>{displayed.okLabel ?? "Entendi"}</Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </DialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useConfirmDialog precisa estar dentro de ConfirmDialogProvider");
  return ctx;
}
