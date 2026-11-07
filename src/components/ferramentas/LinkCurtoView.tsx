"use client";

import { useMemo, useState } from "react";
import { Link2, Check, Trash2, ExternalLink, MousePointerClick } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, Panel } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { formatDate } from "@/lib/format";
import { copyToClipboard } from "@/lib/clipboard";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type ShortLink = { id: string; slug: string; targetUrl: string; clicks: number; createdAt: string };

function buildUrlWithUtm(base: string, utm: Record<string, string>) {
  if (!base.trim()) return "";
  try {
    const url = new URL(base);
    for (const [key, value] of Object.entries(utm)) {
      if (value.trim()) url.searchParams.set(key, value.trim());
    }
    return url.toString();
  } catch {
    return base;
  }
}

export function LinkCurtoView({ initialLinks }: { initialLinks: ShortLink[] }) {
  const [links, setLinks] = useState(initialLinks);
  const { confirmDialog } = useConfirmDialog();
  const [targetUrl, setTargetUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const finalUrl = useMemo(
    () => buildUrlWithUtm(targetUrl, { utm_source: utmSource, utm_medium: utmMedium, utm_campaign: utmCampaign }),
    [targetUrl, utmSource, utmMedium, utmCampaign],
  );

  const totalClicks = useMemo(() => links.reduce((sum, l) => sum + l.clicks, 0), [links]);

  async function refresh() {
    const res = await fetch("/api/link-curto");
    if (res.ok) setLinks(await res.json());
  }

  async function handleCreate() {
    setError(null);
    if (!finalUrl) {
      setError("Informe uma URL válida");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/link-curto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: finalUrl, slug: customSlug }),
      });
      if (res.ok) {
        setTargetUrl("");
        setCustomSlug("");
        setUtmSource("");
        setUtmMedium("");
        setUtmCampaign("");
        await refresh();
      } else {
        setError("Não foi possível criar o link");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirmDialog("Excluir este link?", { confirmLabel: "Excluir" }))) return;
    const res = await fetch(`/api/link-curto/${id}`, { method: "DELETE" });
    if (res.ok) setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  function copyLink(link: ShortLink) {
    const url = `${window.location.origin}/l/${link.slug}`;
    copyToClipboard(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 1800);
  }

  return (
    <div>
      <PageHeader title="Link Curto" description="Crie links curtos e rastreáveis com parâmetros UTM para suas campanhas." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card padding="lg" className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <IconChip tone="accent">
              <Link2 size={18} strokeWidth={1.8} />
            </IconChip>
            <h2 className="text-base font-semibold text-ink">Novo link</h2>
          </div>

          <Field label="URL de destino">
            <Input value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://seusite.com.br/pagina" />
          </Field>

          <Field label="Slug personalizado" hint="Opcional, gerado automaticamente se vazio">
            <Input value={customSlug} onChange={(e) => setCustomSlug(e.target.value)} placeholder="promo-verao" />
          </Field>

          <div className="border-t border-dotted border-border-2" />

          <div>
            <p className="text-[13px] font-medium text-muted mb-2 pl-1">Parâmetros UTM (opcional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input value={utmSource} onChange={(e) => setUtmSource(e.target.value)} placeholder="utm_source (ex: instagram)" />
              <Input value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} placeholder="utm_medium (ex: social)" />
              <Input value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} placeholder="utm_campaign (ex: promo-verao)" />
            </div>
          </div>

          {finalUrl && <p className="text-xs text-muted-2 break-all">Destino final: {finalUrl}</p>}
          {error && <p className="text-xs text-danger">{error}</p>}

          <Button type="button" size="lg" onClick={handleCreate} disabled={submitting} className="self-start">
            {submitting ? "Criando..." : "Criar link curto"}
          </Button>
        </Card>

        {links.length === 0 ? (
          <Card padding="none">
            <EmptyState icon={<Link2 size={20} />} title="Nenhum link ainda" description="Crie seu primeiro link curto acima." />
          </Card>
        ) : (
          <Panel padding="lg">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div className="flex flex-col gap-1.5">
                <span className="text-[40px] font-light leading-none tracking-tight text-panel-ink">{links.length}</span>
                <span className="text-sm text-panel-muted">{links.length === 1 ? "link criado" : "links criados"}</span>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-[40px] font-light leading-none tracking-tight text-panel-ink">{totalClicks}</span>
                <span className="flex items-center gap-1.5 text-sm text-panel-muted">
                  <MousePointerClick size={14} /> cliques
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              {links.map((link, index) => (
                <div key={link.id}>
                  {index > 0 && <div className="border-t border-dotted border-panel-2" />}
                  <div className="flex items-center gap-3 py-4">
                    <IconChip tone="panel" size="sm">
                      <Link2 size={14} strokeWidth={2} />
                    </IconChip>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-accent">/l/{link.slug}</p>
                      <p className="text-xs text-panel-muted truncate">{link.targetUrl}</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-panel-ink bg-panel-2 rounded-full px-3 py-1.5 flex-shrink-0">
                      <MousePointerClick size={12} /> {link.clicks}
                    </span>
                    <p className="text-xs text-panel-muted flex-shrink-0 hidden sm:block">{formatDate(link.createdAt)}</p>
                    <button
                      type="button"
                      onClick={() => copyLink(link)}
                      className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-panel-muted hover:text-accent hover:bg-panel-2 cursor-pointer transition-colors"
                      title="Copiar link"
                    >
                      {copiedId === link.id ? <Check size={14} className="text-success" /> : <Link2 size={14} />}
                    </button>
                    <a
                      href={link.targetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-panel-muted hover:text-accent hover:bg-panel-2 cursor-pointer transition-colors"
                      title="Abrir destino"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(link.id)}
                      className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-panel-muted hover:text-danger hover:bg-danger/10 cursor-pointer transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
