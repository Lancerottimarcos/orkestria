"use client";

import { useState } from "react";
import { CheckCircle2, Star, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/cn";
import type { FieldType } from "./types";

type Field = { id: string; label: string; type: FieldType; required: boolean; options: string[] };

type Form = {
  id: string;
  title: string;
  description: string | null;
  active: boolean;
  fields: Field[];
};

export function FormPublicView({ token, initialForm }: { token: string; initialForm: Form }) {
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [checkboxValues, setCheckboxValues] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setValue(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function toggleCheckbox(fieldId: string, option: string) {
    setCheckboxValues((prev) => {
      const current = prev[fieldId] ?? [];
      const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
      return { ...prev, [fieldId]: next };
    });
  }

  async function handleSubmit() {
    setError(null);

    const responses = initialForm.fields.map((field) => {
      const value = field.type === "CHECKBOX" ? (checkboxValues[field.id] ?? []).join(", ") : values[field.id] ?? "";
      return { fieldId: field.id, value };
    });

    const missing = initialForm.fields.find((f) => f.required && !responses.find((r) => r.fieldId === f.id)?.value);
    if (missing) {
      setError(`Preencha o campo "${missing.label}"`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/formulario/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respondentName, respondentEmail, responses }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Não foi possível enviar sua resposta");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 relative overflow-hidden bg-bg">
      <div className="absolute inset-0">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-accent/10 blur-[130px]" />
        <div className="absolute bottom-[-12rem] right-[-8rem] w-[26rem] h-[26rem] rounded-full bg-accent-light/[0.08] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl py-8">
        <div className="text-center mb-8">
          <p className="text-xl font-semibold tracking-tight text-ink">
            Or<span className="text-accent">kestrya</span>
          </p>
        </div>

        <div className="bg-surface rounded-card overflow-hidden shadow-2xl shadow-black/20">
          <div className="p-8 sm:p-12 flex flex-col gap-7">
            {!initialForm.active ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <span className="w-16 h-16 rounded-full bg-surface-2 text-muted-2 flex items-center justify-center">
                  <Lock size={26} strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-lg font-semibold text-ink">Formulário encerrado</p>
                  <p className="text-sm text-muted mt-1">Este formulário não está mais recebendo respostas.</p>
                </div>
              </div>
            ) : submitted ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <span className="w-16 h-16 rounded-full bg-success/10 text-success flex items-center justify-center">
                  <CheckCircle2 size={30} strokeWidth={1.8} />
                </span>
                <p className="text-lg font-semibold text-ink">Resposta enviada com sucesso!</p>
                <p className="text-sm text-muted">Obrigado por preencher o formulário.</p>
              </div>
            ) : (
              <>
                <div>
                  <h1 className="text-[28px] sm:text-[34px] font-light tracking-tight leading-tight text-ink">
                    {initialForm.title}
                  </h1>
                  {initialForm.description && <p className="text-sm text-muted mt-2">{initialForm.description}</p>}
                </div>

                <div className="border-t border-dotted border-border-2" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="respondent-name" className="text-[13px] font-medium text-muted pl-1.5">
                      Seu nome
                    </label>
                    <Input
                      id="respondent-name"
                      value={respondentName}
                      onChange={(e) => setRespondentName(e.target.value)}
                      placeholder="Seu nome"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="respondent-email" className="text-[13px] font-medium text-muted pl-1.5">
                      Seu e-mail
                    </label>
                    <Input
                      id="respondent-email"
                      type="email"
                      value={respondentEmail}
                      onChange={(e) => setRespondentEmail(e.target.value)}
                      placeholder="Seu e-mail"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {initialForm.fields.map((field) => (
                    <div key={field.id} className="flex flex-col gap-2">
                      <label className="text-[13px] font-medium text-muted pl-1.5">
                        {field.label}
                        {field.required && <span className="text-danger"> *</span>}
                      </label>

                      {field.type === "TEXT" && (
                        <Input value={values[field.id] ?? ""} onChange={(e) => setValue(field.id, e.target.value)} />
                      )}

                      {field.type === "TEXTAREA" && (
                        <Textarea value={values[field.id] ?? ""} onChange={(e) => setValue(field.id, e.target.value)} />
                      )}

                      {field.type === "DATE" && (
                        <Input type="date" value={values[field.id] ?? ""} onChange={(e) => setValue(field.id, e.target.value)} />
                      )}

                      {field.type === "SELECT" && (
                        <select
                          value={values[field.id] ?? ""}
                          onChange={(e) => setValue(field.id, e.target.value)}
                          className="w-full bg-surface-2 border border-border rounded-full px-5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent cursor-pointer"
                        >
                          <option value="">Selecione...</option>
                          {field.options.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      )}

                      {field.type === "RADIO" && (
                        <div className="flex flex-col gap-2">
                          {field.options.map((o) => (
                            <label
                              key={o}
                              className={cn(
                                "flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm text-ink cursor-pointer transition-colors",
                                values[field.id] === o
                                  ? "border-accent bg-accent/10"
                                  : "border-border bg-surface-2 hover:border-border-2",
                              )}
                            >
                              <input
                                type="radio"
                                name={field.id}
                                checked={values[field.id] === o}
                                onChange={() => setValue(field.id, o)}
                                className="accent-accent cursor-pointer"
                              />
                              {o}
                            </label>
                          ))}
                        </div>
                      )}

                      {field.type === "CHECKBOX" && (
                        <div className="flex flex-col gap-2">
                          {field.options.map((o) => (
                            <label
                              key={o}
                              className={cn(
                                "flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm text-ink cursor-pointer transition-colors",
                                (checkboxValues[field.id] ?? []).includes(o)
                                  ? "border-accent bg-accent/10"
                                  : "border-border bg-surface-2 hover:border-border-2",
                              )}
                            >
                              <Checkbox checked={(checkboxValues[field.id] ?? []).includes(o)} onChange={() => toggleCheckbox(field.id, o)} />
                              {o}
                            </label>
                          ))}
                        </div>
                      )}

                      {field.type === "RATING" && (
                        <div className="flex items-center gap-1.5 pl-1.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              aria-label={`${n} de 5 estrelas`}
                              onClick={() => setValue(field.id, String(n))}
                              className={cn(
                                "w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-colors",
                                Number(values[field.id]) >= n ? "bg-accent/10" : "bg-surface-2 hover:bg-surface-3",
                              )}
                            >
                              <Star
                                size={20}
                                className={cn(
                                  Number(values[field.id]) >= n ? "fill-accent text-accent" : "text-border-2",
                                )}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {error && <p className="text-xs text-danger pl-1.5">{error}</p>}

                <Button type="button" size="lg" onClick={handleSubmit} disabled={submitting} className="w-full">
                  {submitting ? "Enviando..." : "Enviar resposta"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
