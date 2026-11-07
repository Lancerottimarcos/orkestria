"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, QrCode as QrCodeIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, Panel } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";

export function QrCodeView() {
  const [text, setText] = useState("");
  const [color, setColor] = useState("#000000");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!text.trim()) {
      setDataUrl(null);
      setError(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(text, { width: 400, margin: 2, color: { dark: color, light: "#ffffff" } })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível gerar o QR code");
      });
    return () => {
      cancelled = true;
    };
  }, [text, color]);

  function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "qrcode.png";
    a.click();
  }

  return (
    <div>
      <PageHeader title="Gerador de QR Code" description="Gere QR codes para links, Wi-Fi, textos ou qualquer conteúdo." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <Card padding="lg" className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <IconChip tone="accent">
              <QrCodeIcon size={18} strokeWidth={1.8} />
            </IconChip>
            <h2 className="text-base font-semibold text-ink">Conteúdo do código</h2>
          </div>

          <Field label="Conteúdo" hint="Um link, texto ou qualquer informação">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="https://seusite.com.br" />
          </Field>

          <Field label="Cor">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-11 h-11 rounded-full border border-border cursor-pointer bg-transparent"
              />
              <span className="text-xs text-muted-2 font-mono">{color}</span>
            </div>
          </Field>

          <div className="border-t border-dotted border-border-2" />

          <Button type="button" size="lg" onClick={handleDownload} disabled={!dataUrl} className="self-start">
            <Download size={15} /> Baixar PNG
          </Button>
        </Card>

        <Panel padding="lg" className="flex items-center justify-center min-h-72">
          {error ? (
            <p className="text-sm text-danger">{error}</p>
          ) : dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="QR code gerado" className="w-60 h-60 max-w-full rounded-3xl shadow-lg shadow-black/30" />
          ) : (
            <div className="flex flex-col items-center gap-4 text-panel-muted">
              <IconChip tone="panel" size="lg">
                <QrCodeIcon size={22} strokeWidth={1.8} />
              </IconChip>
              <p className="text-xs">Digite um conteúdo para gerar o QR code</p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
