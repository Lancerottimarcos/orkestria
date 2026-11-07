import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  CalendarClock,
  CalendarDays,
  Clock,
  CheckCircle2,
  MessageSquareWarning,
  XCircle,
  ExternalLink,
  LayoutList,
  Compass,
  ChevronRight,
  UserRound,
  Wallet,
  Briefcase,
  StickyNote,
} from "lucide-react";
import { auth } from "@/auth";
import { requireModulePage } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card, Panel } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider, DottedRow } from "@/components/ui/Dotted";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/PageHeader";
import { SocialAccountsPanel } from "@/components/clients/SocialAccountsPanel";
import { ClientMetricsSection } from "@/components/clients/ClientMetricsSection";
import { ContractedServicesPanel } from "@/components/clients/ContractedServicesPanel";
import { ClientPortalUsersPanel } from "@/components/clients/ClientPortalUsersPanel";
import { ClientCredentialsPanel } from "@/components/clients/ClientCredentialsPanel";
import { ClientDetailTabs } from "@/components/clients/ClientDetailTabs";
import { hasModule } from "@/lib/modules";
import { formatCurrency, formatDate } from "@/lib/format";
import { computeClientMargin } from "@/lib/clientMargin";
import { resolveClientAccess } from "@/lib/clientAccess";
import { getNpsSummary } from "@/lib/nps";
import { NpsPanel } from "@/components/clients/NpsPanel";
import { resolveClientCoverColor } from "@/lib/clientCover";
import { clientIconFor } from "@/lib/clientIcons";
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_TONE,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONE,
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_STATUS_TONE,
} from "@/lib/labels";

type Params = { params: Promise<{ id: string }> };

const POST_STATUS_META: Record<
  string,
  { label: string; tone: "muted" | "success" | "danger"; icon: typeof Clock }
> = {
  PENDING: { label: "Pendente", tone: "muted", icon: Clock },
  APPROVED: { label: "Aprovado", tone: "success", icon: CheckCircle2 },
  CHANGES_REQUESTED: { label: "Alterações solicitadas", tone: "danger", icon: MessageSquareWarning },
  REJECTED: { label: "Reprovado", tone: "danger", icon: XCircle },
};

export default async function ClienteDetailPage({ params }: Params) {
  // Diferente da listagem, essa página faltava a checagem de módulo - dava
  // pra abrir o perfil completo de qualquer cliente só tendo acesso a outro
  // módulo que linka pra cá (ex: Kanban, Contratos).
  await requireModulePage("clientes");
  const { id } = await params;
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const currentUser = session?.user
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { moduleAccess: true, clientAccess: true } })
    : null;
  const canSeeCredentials = !!session?.user && hasModule(session.user.role, currentUser?.moduleAccess, "senhas");

  if (session?.user && !isAdmin) {
    const visibleClientIds = resolveClientAccess(session.user.role, currentUser?.clientAccess);
    if (visibleClientIds !== null && !visibleClientIds.includes(id)) notFound();
  }
  const credentials = canSeeCredentials
    ? await prisma.clientCredential.findMany({
        where: { clientId: id },
        orderBy: { createdAt: "desc" },
        select: { id: true, label: true, username: true, url: true, notes: true },
      })
    : [];

  const [client, companySettings, contractTemplates, margin, npsSummary] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      omit: { portalPasswordHash: true },
      include: {
        projects: { orderBy: { createdAt: "desc" }, include: { service: true } },
        transactions: { orderBy: { dueDate: "desc" }, take: 12 },
        posts: {
          orderBy: { createdAt: "desc" },
          include: { demandType: true },
          take: 40,
        },
        kanbanCards: {
          orderBy: [{ completedAt: "asc" }, { dueDate: "asc" }],
          include: { column: true, assignee: true, demandType: true },
          take: 20,
        },
        contractedServices: { orderBy: { startDate: "desc" } },
        portalUsers: {
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, role: true, email: true, active: true, lastLoginAt: true, createdAt: true },
        },
      },
    }),
    prisma.companySettings.findFirst(),
    prisma.contractTemplate.findMany({ select: { id: true, name: true, bodyJson: true }, orderBy: { name: "asc" } }),
    computeClientMargin(id),
    getNpsSummary(id),
  ]);

  if (!client) notFound();

  const pendingPosts = client.posts.filter(
    (p) => p.status === "PENDING" || p.status === "CHANGES_REQUESTED",
  );
  const resolvedPosts = client.posts.filter(
    (p) => p.status === "APPROVED" || p.status === "REJECTED",
  );
  const activeDemands = client.kanbanCards.filter((c) => !c.completedAt);
  const services = Array.from(
    new Set(client.projects.map((p) => p.service?.name).filter((n): n is string => !!n)),
  );

  const ClientIcon = clientIconFor(client.icon);

  // Conteúdo das abas da ficha do cliente: a página inteira era uma rolagem
  // única com Ficha, Contas sociais, Métricas, NPS, Serviços contratados,
  // Credenciais, Usuários do portal, Conteúdos, Projetos, Kanban, Margem e
  // Financeiro empilhados. Aqui agrupamos em 4 abas (ver ClientDetailTabs),
  // preservando exatamente as mesmas condicionais de permissão (isAdmin /
  // canSeeCredentials) que já existiam.
  const geralContent = (
    <>
      <div className="flex items-center gap-3 mb-4">
        <IconChip size="sm">
          <CheckCircle2 size={15} strokeWidth={2} />
        </IconChip>
        <h2 className="text-base font-semibold text-ink">Conteúdos para aprovação</h2>
      </div>
      {pendingPosts.length === 0 ? (
        <Card padding="none" className="mb-6">
          <EmptyState
            icon={<CheckCircle2 size={20} strokeWidth={1.8} />}
            title="Nenhum conteúdo pendente"
            description="Quando houver conteúdos aguardando aprovação deste cliente, eles aparecem aqui."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 mb-6">
          {pendingPosts.map((post) => {
            const meta = POST_STATUS_META[post.status];
            return (
              <a
                key={post.id}
                href={`/aprovacao/${post.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface rounded-card p-6 shadow-sm shadow-black/5 flex flex-col gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink text-sm leading-snug">{post.title}</p>
                  <ExternalLink size={13} className="text-muted-2 flex-shrink-0 mt-0.5" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge tone={meta.tone} icon={<meta.icon size={11} />}>{meta.label}</Badge>
                  {post.demandType && (
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: `${post.demandType.color}20`, color: post.demandType.color }}
                    >
                      {post.demandType.name}
                    </span>
                  )}
                </div>
                {post.scheduledDate && (
                  <p className="text-xs text-muted-2">Agendado para {formatDate(post.scheduledDate)}</p>
                )}
              </a>
            );
          })}
        </div>
      )}

      {resolvedPosts.length > 0 && (
        <details className="mb-6">
          <summary className="text-[13px] font-medium text-muted cursor-pointer hover:text-accent w-fit">
            Outros conteúdos ({resolvedPosts.length})
          </summary>
          <Card padding="none" className="mt-3 px-6 py-2">
            {resolvedPosts.map((post) => {
              const meta = POST_STATUS_META[post.status];
              return (
                <a
                  key={post.id}
                  href={`/aprovacao/${post.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 py-3.5 border-b border-dotted border-border-2 last:border-0 group"
                >
                  <span className="min-w-0 text-sm text-ink truncate group-hover:text-accent transition-colors">{post.title}</span>
                  <span className="flex-shrink-0">
                    <Badge tone={meta.tone} icon={<meta.icon size={11} />}>{meta.label}</Badge>
                  </span>
                </a>
              );
            })}
          </Card>
        </details>
      )}

      <div className="flex items-center gap-3 mt-10 mb-4">
        <IconChip size="sm">
          <Briefcase size={15} strokeWidth={2} />
        </IconChip>
        <h2 className="text-base font-semibold text-ink">Projetos</h2>
      </div>
      {client.projects.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Briefcase size={20} strokeWidth={1.8} />}
            title="Nenhum projeto cadastrado"
            description="Os projetos deste cliente aparecerão aqui assim que forem criados."
          />
        </Card>
      ) : (
        <Table>
          <Thead>
            <Th>Projeto</Th>
            <Th>Serviço</Th>
            <Th>Prazo</Th>
            <Th>Status</Th>
          </Thead>
          <tbody>
            {client.projects.map((project) => (
              <Tr key={project.id}>
                <Td className="font-semibold text-ink">{project.name}</Td>
                <Td className="text-muted">{project.service?.name || "-"}</Td>
                <Td className="text-muted">{project.dueDate ? formatDate(project.dueDate) : "-"}</Td>
                <Td>
                  <Badge tone={PROJECT_STATUS_TONE[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className="flex items-center gap-3 mt-10 mb-4">
        <IconChip size="sm">
          <LayoutList size={15} strokeWidth={2} />
        </IconChip>
        <h2 className="text-base font-semibold text-ink">Demandas do Orkestra</h2>
      </div>
      {client.kanbanCards.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<LayoutList size={20} strokeWidth={1.8} />}
            title="Nenhuma demanda vinculada"
            description="As demandas do Orkestra ligadas a este cliente aparecem aqui."
          />
        </Card>
      ) : (
        <>
          <Table>
            <Thead>
              <Th>Demanda</Th>
              <Th>Coluna</Th>
              <Th>Responsável</Th>
              <Th>Prazo</Th>
            </Thead>
            <tbody>
              {client.kanbanCards.slice(0, 5).map((card) => (
                <Tr key={card.id}>
                  <Td className="font-semibold text-ink">{card.title}</Td>
                  <Td>
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: `${card.column.color ?? "#9a9a9a"}20`,
                        color: card.column.color ?? "#9a9a9a",
                      }}
                    >
                      {card.column.name}
                    </span>
                  </Td>
                  <Td>
                    {card.assignee ? (
                      <span className="inline-flex items-center gap-1.5 text-ink">
                        <Avatar name={card.assignee.name} url={card.assignee.avatarUrl} size={20} />
                        {card.assignee.name}
                      </span>
                    ) : (
                      <span className="text-muted-2">-</span>
                    )}
                  </Td>
                  <Td className="text-muted">{card.dueDate ? formatDate(card.dueDate) : "-"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          {client.kanbanCards.length > 5 && (
            <Link
              href={`/kanban?client=${client.id}`}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline mt-3"
            >
              Ver mais <ChevronRight size={14} />
            </Link>
          )}
        </>
      )}
    </>
  );

  const estrategiaContent = isAdmin ? (
    <>
      <SocialAccountsPanel clientId={client.id} />
      <ClientMetricsSection clientId={client.id} />
      <NpsPanel clientId={client.id} initialSummary={npsSummary} />
    </>
  ) : null;

  const financeiroContent = isAdmin ? (
    <>
      <ContractedServicesPanel
        clientId={client.id}
        initialServices={client.contractedServices.map((s) => ({
          id: s.id,
          name: s.name,
          scope: s.scope,
          value: s.value,
          period: s.period,
          startDate: s.startDate.toISOString(),
          renewalDate: s.renewalDate ? s.renewalDate.toISOString() : null,
          contractUrl: s.contractUrl,
          contractName: s.contractName,
          signedAt: s.signedAt ? s.signedAt.toISOString() : null,
          signerName: s.signerName,
          agencySignedAt: s.agencySignedAt ? s.agencySignedAt.toISOString() : null,
          agencySignerName: s.agencySignerName,
        }))}
        client={{
          name: client.name,
          contactName: client.contactName,
          document: client.document,
          address: client.address,
          email: client.email,
          phone: client.phone,
        }}
        company={{
          name: companySettings?.name ?? "Minha Agência",
          document: companySettings?.document ?? null,
          address: companySettings?.address ?? null,
          email: companySettings?.email ?? null,
          phone: companySettings?.phone ?? null,
          pixKey: companySettings?.pixKey ?? null,
        }}
        templates={contractTemplates}
      />

      <div className="flex items-center gap-3 mt-10 mb-4">
        <IconChip size="sm">
          <Wallet size={15} strokeWidth={2} />
        </IconChip>
        <h2 className="text-base font-semibold text-ink">Margem (últimos 30 dias)</h2>
      </div>
      <Card padding="lg" className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2 mb-1.5">Receita</p>
            <p className="text-2xl font-light tracking-tight text-ink tabular-nums">{formatCurrency(margin.revenue)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2 mb-1.5">Custo alocado</p>
            <p className="text-2xl font-light tracking-tight text-ink tabular-nums">{formatCurrency(margin.cost)}</p>
            <p className="text-xs text-muted mt-1">{margin.totalBillableHours.toFixed(1)}h faturáveis apontadas</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2 mb-1.5">Margem</p>
            <p className={`text-2xl font-light tracking-tight tabular-nums ${margin.margin < 0 ? "text-danger" : "text-success"}`}>
              {formatCurrency(margin.margin)}
            </p>
            {margin.marginPct !== null && (
              <p className="text-xs text-muted mt-1">{margin.marginPct.toFixed(0)}% da receita</p>
            )}
          </div>
        </div>
        {margin.unmatchedHours > 0 && (
          <p className="text-xs text-muted-2 mt-4">
            {margin.unmatchedHours.toFixed(1)}h apontadas por gente sem valor/hora cadastrado em Equipe (mesmo
            e-mail do login) - não entraram no custo acima.
          </p>
        )}
        {margin.byPerson.length > 0 && (
          <>
            <DottedDivider />
            <div className="flex flex-col gap-2.5 mt-4">
              {margin.byPerson.map((p, i) => (
                <div key={`${p.name}-${i}`} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{p.name}{!p.matched && <span className="text-muted-2"> (sem valor/hora)</span>}</span>
                  <span className="text-muted tabular-nums">{p.hours.toFixed(1)}h{p.matched ? ` · ${formatCurrency(p.cost)}` : ""}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <div className="flex items-center gap-3 mt-10 mb-4">
        <IconChip size="sm">
          <Wallet size={15} strokeWidth={2} />
        </IconChip>
        <h2 className="text-base font-semibold text-ink">Financeiro recente</h2>
      </div>
      {client.transactions.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Wallet size={20} strokeWidth={1.8} />}
            title="Nenhum lançamento ainda"
            description="Os lançamentos financeiros deste cliente aparecem aqui."
          />
        </Card>
      ) : (
        <Table>
          <Thead>
            <Th>Descrição</Th>
            <Th>Vencimento</Th>
            <Th>Status</Th>
            <Th className="text-right">Valor</Th>
          </Thead>
          <tbody>
            {client.transactions.map((t) => (
              <Tr key={t.id}>
                <Td className="text-ink">{t.description}</Td>
                <Td className="text-muted">{formatDate(t.dueDate)}</Td>
                <Td>
                  <Badge tone={TRANSACTION_STATUS_TONE[t.status]}>{TRANSACTION_STATUS_LABELS[t.status]}</Badge>
                </Td>
                <Td className="text-right font-semibold text-ink tabular-nums">{formatCurrency(t.amount)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  ) : null;

  const acessosContent = (canSeeCredentials || isAdmin) ? (
    <>
      {canSeeCredentials && <ClientCredentialsPanel clientId={client.id} initialCredentials={credentials} />}
      {isAdmin && (
        <ClientPortalUsersPanel
          clientId={client.id}
          initialUsers={client.portalUsers.map((u) => ({
            id: u.id,
            name: u.name,
            role: u.role,
            email: u.email,
            active: u.active,
            lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
            createdAt: u.createdAt.toISOString(),
          }))}
        />
      )}
    </>
  ) : null;

  return (
    <div>
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors mb-4">
        <ArrowLeft size={14} /> Voltar para Clientes
      </Link>

      <Card padding="none" className="overflow-hidden mb-5">
        <div className="h-32 sm:h-44 w-full relative">
          <div
            className="absolute inset-0"
            style={{ background: resolveClientCoverColor(client.coverColor, client.id) }}
          />
        </div>
        <div className="px-6 sm:px-8 pb-6 sm:pb-8">
          <div className="relative z-10 flex items-end justify-between gap-4 -mt-11 sm:-mt-12 flex-wrap">
            <div className="relative w-fit">
              <Avatar
                name={client.name}
                url={client.avatarUrl}
                size={96}
                className="text-2xl ring-4 ring-surface shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 z-10 w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center ring-4 ring-surface">
                <ClientIcon size={15} />
              </span>
            </div>
            <Badge tone={CLIENT_STATUS_TONE[client.status]} className="mb-1">
              {CLIENT_STATUS_LABELS[client.status]}
            </Badge>
          </div>

          <h1 className="text-[28px] sm:text-[36px] font-light tracking-tight leading-[1.1] text-ink mt-4">
            {client.name}
          </h1>

          {services.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {services.map((service) => (
                <span
                  key={service}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-surface-2 text-muted"
                >
                  {service}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] gap-5 items-start mb-5">
        <Card padding="lg" className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <IconChip tone="accent" size="sm">
              <UserRound size={15} strokeWidth={2} />
            </IconChip>
            <h2 className="text-base font-semibold text-ink">Ficha do cliente</h2>
          </div>

          <div className="flex flex-col gap-4">
            {client.contactName && (
              <DottedRow label="Contato" value={client.contactName} icon={<UserRound size={14} />} />
            )}
            {client.email && (
              <DottedRow label="E-mail" value={client.email} icon={<Mail size={14} />} />
            )}
            {client.phone && (
              <DottedRow label="Telefone" value={client.phone} icon={<Phone size={14} />} />
            )}
            <DottedRow
              label="Cliente desde"
              value={<span className="tabular-nums">{formatDate(client.startDate)}</span>}
              icon={<CalendarClock size={14} />}
            />
            <DottedRow
              label="Mensalidade"
              value={<span className="tabular-nums">{formatCurrency(client.monthlyValue)}</span>}
              icon={<Wallet size={14} />}
            />
            <DottedRow
              label="Cobrança"
              value={<span className="tabular-nums">{`Dia ${client.billingDay}`}</span>}
              icon={<CalendarDays size={14} />}
            />
          </div>

          {client.notes && (
            <>
              <DottedDivider />
              <div>
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-muted mb-2">
                  <StickyNote size={13} /> Observações
                </p>
                <p className="text-sm text-ink leading-relaxed">{client.notes}</p>
              </div>
            </>
          )}
        </Card>

        <Panel padding="lg" className="flex flex-col gap-6">
          <p className="text-[13px] font-medium text-panel-muted">Visão geral</p>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[32px] font-light tracking-tight leading-none text-panel-ink">
                {client.projects.length}
              </p>
              <p className="text-sm text-panel-muted mt-2">Projetos</p>
            </div>
            <div>
              <p className={`text-[32px] font-light tracking-tight leading-none ${pendingPosts.length > 0 ? "text-accent" : "text-panel-ink"}`}>
                {pendingPosts.length}
              </p>
              <p className="text-sm text-panel-muted mt-2">Conteúdos pendentes</p>
            </div>
            <div>
              <p className="text-[32px] font-light tracking-tight leading-none text-panel-ink">
                {activeDemands.length}
              </p>
              <p className="text-sm text-panel-muted mt-2">Demandas ativas</p>
            </div>
          </div>

          <div className="border-t border-dotted border-panel-2" />

          <Link
            href={`/clientes/${client.id}/estrategia`}
            className="flex items-center gap-4 rounded-3xl bg-panel-2 p-4 hover:opacity-90 transition-opacity"
          >
            <IconChip tone="solid">
              <Compass size={18} strokeWidth={1.8} />
            </IconChip>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-panel-ink">Central Estratégica</span>
              <span className="block text-xs text-panel-muted mt-0.5">
                Persona, raio-x do perfil, concorrentes e posicionamento de marca
              </span>
            </span>
            <ChevronRight size={16} className="text-panel-muted flex-shrink-0" />
          </Link>
        </Panel>
      </div>

      <ClientDetailTabs
        pendingCount={pendingPosts.length}
        showEstrategia={isAdmin}
        showFinanceiro={isAdmin}
        showAcessos={canSeeCredentials || isAdmin}
        geral={geralContent}
        estrategia={estrategiaContent}
        financeiro={financeiroContent}
        acessos={acessosContent}
      />
    </div>
  );
}
