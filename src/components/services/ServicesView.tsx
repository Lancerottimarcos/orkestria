"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Briefcase, Tag, ArrowUpDown } from "lucide-react";
import { serviceSchema, type ServiceInput, type ServiceFormValues } from "@/lib/schemas";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatPillRow } from "@/components/ui/StatPills";
import { PillProgress } from "@/components/ui/PillProgress";
import { DottedDivider } from "@/components/ui/Dotted";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { FilterBar, FilterSearch, FilterSelect, FilterClearButton } from "@/components/ui/FilterBar";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/cn";
import { COVER_GRADIENTS, coverGradientByColor } from "@/lib/coverGradient";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type SortKey = "name" | "defaultPrice" | "usage";

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  defaultPrice: number;
  category: string | null;
  coverColor: string | null;
  _count: { projects: number };
};

export function ServicesView({ initialServices }: { initialServices: ServiceRow[] }) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const { confirmDialog } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [coverColor, setCoverColor] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormValues, unknown, ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { defaultPrice: 0 },
  });

  function openCreate() {
    setEditing(null);
    setCoverColor(COVER_GRADIENTS[0].key);
    reset({ name: "", description: "", defaultPrice: 0, category: "" });
    setModalOpen(true);
  }

  function openEdit(service: ServiceRow) {
    setEditing(service);
    setCoverColor(service.coverColor);
    reset({
      name: service.name,
      description: service.description ?? "",
      defaultPrice: service.defaultPrice,
      category: service.category ?? "",
    });
    setModalOpen(true);
  }

  async function onSubmit(data: ServiceInput) {
    setSubmitting(true);
    try {
      const url = editing ? `/api/servicos/${editing.id}` : "/api/servicos";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, coverColor: coverColor ?? "" }),
      });
      if (!res.ok) throw new Error("Falha ao salvar serviço");
      setModalOpen(false);
      const updated = await fetch("/api/servicos").then((r) => r.json());
      setServices(updated);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(service: ServiceRow) {
    if (!(await confirmDialog(`Remover o serviço "${service.name}"?`, { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/servicos/${service.id}`, { method: "DELETE" });
    if (res.ok) {
      setServices((prev) => prev.filter((s) => s.id !== service.id));
      router.refresh();
    }
  }

  const categories = useMemo(
    () => Array.from(new Set(services.map((s) => s.category).filter((c): c is string => !!c))),
    [services],
  );

  const stats = useMemo(() => {
    const avg = services.length
      ? services.reduce((sum, s) => sum + s.defaultPrice, 0) / services.length
      : 0;
    return { total: services.length, avg };
  }, [services]);

  const filtered = useMemo(() => {
    return services
      .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
      .filter((s) => !categoryFilter || s.category === categoryFilter)
      .sort((a, b) => {
        if (sortKey === "defaultPrice") return b.defaultPrice - a.defaultPrice;
        if (sortKey === "usage") return b._count.projects - a._count.projects;
        return a.name.localeCompare(b.name);
      });
  }, [services, search, categoryFilter, sortKey]);

  const maxUsage = Math.max(1, ...services.map((s) => s._count.projects));

  return (
    <div>
      <PageHeader
        title="Serviços"
        description="Catálogo de serviços e valores praticados pela agência"
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} /> Novo serviço
          </Button>
        }
      />

      {services.length > 0 && (
        <StatPillRow
          className="mb-8"
          items={[
            { label: "Total de serviços", display: stats.total, tone: "dark", weight: stats.total },
            { label: "Categorias", display: categories.length, tone: "hatch", weight: Math.max(categories.length, 1) },
            { label: "Ticket médio", display: formatCurrency(stats.avg), tone: "accent", weight: Math.max(stats.total, 2) },
          ]}
        />
      )}

      {services.length > 0 && (
        <FilterBar>
          <FilterSearch
            placeholder="Buscar serviço..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {categories.length > 0 && (
            <FilterSelect icon={Tag} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="max-w-48">
              <option value="">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </FilterSelect>
          )}
          <FilterSelect
            icon={ArrowUpDown}
            neutralValue="name"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="max-w-48"
          >
            <option value="name">Ordenar por nome</option>
            <option value="defaultPrice">Ordenar por valor</option>
            <option value="usage">Ordenar por uso</option>
          </FilterSelect>
          {(search || categoryFilter) && (
            <FilterClearButton
              onClick={() => {
                setSearch("");
                setCategoryFilter("");
              }}
            />
          )}
        </FilterBar>
      )}

      {filtered.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Briefcase size={20} />}
            title={services.length === 0 ? "Nenhum serviço cadastrado" : "Nenhum serviço encontrado"}
            description={
              services.length === 0
                ? "Cadastre os serviços que a agência oferece e seus valores padrão."
                : "Tente ajustar a busca ou os filtros."
            }
            action={
              services.length === 0 && (
                <Button size="sm" onClick={openCreate}>
                  <Plus size={14} /> Novo serviço
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filtered.map((service) => (
            <Card
              key={service.id}
              padding="none"
              className="overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex flex-col"
            >
              <div className="p-3 pb-0">
                <div className="relative h-32 rounded-[20px] overflow-hidden">
                  <div className={cn("absolute inset-0 bg-gradient-to-br", coverGradientByColor(service.coverColor, service.id))} />
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <button
                      onClick={() => openEdit(service)}
                      className="text-white bg-black/30 hover:bg-black/50 p-2 rounded-full backdrop-blur-sm transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(service)}
                      className="text-white bg-black/30 hover:bg-danger p-2 rounded-full backdrop-blur-sm transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {service.category && (
                    <div className="absolute top-3 left-3">
                      <Badge className="shadow-sm">{service.category}</Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 pb-6 flex-1 flex flex-col">
                <div className="relative w-fit -mt-8 mb-4">
                  <div className="w-14 h-14 rounded-full bg-ink text-accent border-4 border-surface flex items-center justify-center shadow-md">
                    <Briefcase size={22} strokeWidth={1.8} />
                  </div>
                </div>

                <p className="text-[17px] font-semibold text-ink truncate">{service.name}</p>

                {service.description && (
                  <p className="text-[13px] text-muted line-clamp-1 mt-1">{service.description}</p>
                )}

                <div className="mt-5">
                  <p className="text-[13px] font-medium text-muted">Valor padrão</p>
                  <p className="text-[26px] font-light tracking-tight leading-none text-ink mt-1.5">
                    {formatCurrency(service.defaultPrice)}
                  </p>
                </div>

                <div className="mt-auto pt-5">
                  <DottedDivider />
                  <div className="pt-4">
                    <PillProgress
                      value={(service._count.projects / maxUsage) * 100}
                      label={`${service._count.projects} ${service._count.projects === 1 ? "projeto" : "projetos"}`}
                      size="sm"
                      tone={service._count.projects > 0 ? "dark" : "muted"}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar" : "Novo"}
        titleAccent="serviço"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <p className="text-[13px] font-medium text-muted mb-2">Cor de capa</p>
            <div
              className={cn(
                "h-16 w-full rounded-2xl bg-gradient-to-br",
                coverGradientByColor(coverColor, editing?.id ?? "new"),
              )}
            />
            <div className="flex flex-wrap gap-2 mt-2.5">
              {COVER_GRADIENTS.map((g) => (
                <button
                  key={g.key}
                  type="button"
                  title="Escolher degradê"
                  onClick={() => setCoverColor(g.key)}
                  className={cn(
                    "w-7 h-7 rounded-full bg-gradient-to-br cursor-pointer transition-transform hover:scale-110",
                    g.classes,
                    coverColor === g.key && "ring-2 ring-offset-2 ring-offset-surface ring-ink",
                  )}
                />
              ))}
            </div>
          </div>

          <Field label="Nome do serviço" error={errors.name?.message}>
            <Input {...register("name")} placeholder="Ex: Gestão de redes sociais" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <Input {...register("category")} placeholder="Ex: Social Media" />
            </Field>
            <Field label="Valor padrão (R$)" error={errors.defaultPrice?.message}>
              <Input type="number" step="0.01" min="0" {...register("defaultPrice")} />
            </Field>
          </div>

          <Field label="Descrição">
            <Textarea {...register("description")} placeholder="O que está incluso neste serviço..." />
          </Field>

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
