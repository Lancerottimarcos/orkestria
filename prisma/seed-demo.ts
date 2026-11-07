import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { encryptSecret } from "../src/lib/crypto";
import { buildContractTemplate, DEFAULT_ANSWERS, TEMPLATE_KINDS } from "../src/lib/contracts/templateFactory";

const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

// ---------- helpers ----------

/** Foto de pessoa (banco gratuito pravatar) - índice estável por pessoa. */
function avatar(i: number): string {
  return `https://i.pravatar.cc/300?img=${(i % 70) + 1}`;
}

const LOGO_COLORS = ["FF9F1C", "E14B4B", "3FB56F", "4B9FE1", "A855F7", "EC4899", "EAB308", "14B8A6", "F97316", "6366F1"];
/** Logo de empresa gerado (ui-avatars, gratuito) - iniciais sobre cor da marca. */
function logo(name: string, i: number): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${LOGO_COLORS[i % LOGO_COLORS.length]}&color=fff&size=256&bold=true&format=png`;
}

/** Foto de banco gratuito (picsum) - seed estável pra mesma imagem sempre. */
function photo(seed: string, w = 1080, h = 1080): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

function daysFromNow(n: number, hour = 12, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function monthsAgo(n: number, day = 5): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n, day);
  d.setHours(12, 0, 0, 0);
  return d;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR");

const PERIOD_LABEL: Record<string, string> = {
  MONTHLY: "Mensal",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
  ONE_TIME: "Único",
};

async function main() {
  console.log("Limpando dados de demonstração anteriores...");
  await prisma.columnAutomation.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.checklist.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.kanbanCard.deleteMany();
  await prisma.kanbanColumn.deleteMany();
  await prisma.kanbanBoard.deleteMany();
  await prisma.post.deleteMany();
  await prisma.note.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.proposalView.deleteMany();
  await prisma.salesProposalInstallment.deleteMany();
  await prisma.salesProposalItem.deleteMany();
  await prisma.contractedService.deleteMany();
  await prisma.salesProposal.deleteMany();
  await prisma.salesOpportunity.deleteMany();
  await prisma.salesGoal.deleteMany();
  await prisma.salesStage.deleteMany();
  await prisma.customFormFieldResponse.deleteMany();
  await prisma.customFormSubmission.deleteMany();
  await prisma.customFormField.deleteMany();
  await prisma.customForm.deleteMany();
  await prisma.shortLink.deleteMany();
  await prisma.clientCredential.deleteMany();
  await prisma.clientPortalUser.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatChannelMember.deleteMany();
  await prisma.chatChannel.deleteMany();
  await prisma.squadMember.deleteMany();
  await prisma.squad.deleteMany();
  await prisma.moodboardImage.deleteMany();
  await prisma.moodboard.deleteMany();
  await prisma.keyVisualImage.deleteMany();
  await prisma.keyVisual.deleteMany();
  await prisma.positioningImage.deleteMany();
  await prisma.positioning.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.profileDiagnosis.deleteMany();
  await prisma.persona.deleteMany();
  await prisma.postMetricSnapshot.deleteMany();
  await prisma.socialMetricSnapshot.deleteMany();
  await prisma.socialAccount.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.service.deleteMany();
  await prisma.client.deleteMany();
  await prisma.demandType.deleteMany();
  await prisma.boardTemplateCard.deleteMany();
  await prisma.boardTemplateColumn.deleteMany();
  await prisma.boardTemplate.deleteMany();
  await prisma.user.deleteMany({ where: { email: { endsWith: "@agencia.demo" } } });
  console.log("Base zerada (logins reais preservados).");

  // ---------- Empresa (dados da CONTRATADA - entram em todos os contratos) ----------
  const companyData = {
    name: "Orkestrya Marketing",
    email: "contato@orkestrya.com.br",
    phone: "(11) 4002-8922",
    address: "Av. Faria Lima, 1500, sala 82, Itaim Bibi, São Paulo - SP",
    document: "48.123.456/0001-72",
    pixKey: "48.123.456/0001-72",
  };
  const existingCompany = await prisma.companySettings.findFirst();
  if (existingCompany) await prisma.companySettings.update({ where: { id: existingCompany.id }, data: companyData });
  else await prisma.companySettings.create({ data: companyData });
  console.log("Empresa: dados completos da agência (com chave PIX).");

  // ---------- Users (login demo + equipe com login) ----------
  const demoPasswordHash = await bcrypt.hash("demo1234", 10);
  const demoAdmin = await prisma.user.upsert({
    where: { email: "demo@orkestrya.com.br" },
    update: { passwordHash: demoPasswordHash, role: "ADMIN", avatarUrl: avatar(12), name: "Felipe Demo" },
    create: {
      name: "Felipe Demo",
      email: "demo@orkestrya.com.br",
      passwordHash: demoPasswordHash,
      role: "ADMIN",
      setor: "Direção",
      cargo: "CEO",
      avatarUrl: avatar(12),
    },
  });

  const userDefs = [
    { name: "Bianca Alves", email: "bianca@agencia.demo", setor: "Criação", cargo: "Analista de Redes Sociais", av: 47 },
    { name: "Rafael Costa", email: "rafael@agencia.demo", setor: "Mídia", cargo: "Gestor de Tráfego Pago", av: 59 },
    { name: "Juliana Prado", email: "juliana@agencia.demo", setor: "Criação", cargo: "Designer Gráfico", av: 44 },
    { name: "Marcos Lima", email: "marcos@agencia.demo", setor: "Criação", cargo: "Redator", av: 51 },
    { name: "Camila Torres", email: "camila@agencia.demo", setor: "Atendimento", cargo: "Customer Success", av: 45 },
    { name: "Gustavo Nogueira", email: "gustavo@agencia.demo", setor: "Criação", cargo: "Diretor de Criação", av: 53 },
  ];
  const users: Record<string, string> = { [demoAdmin.name]: demoAdmin.id };
  const otherAdmins = await prisma.user.findMany({ where: { role: "ADMIN", id: { not: demoAdmin.id } } });
  for (const a of otherAdmins) users[a.name] = a.id;
  for (const u of userDefs) {
    const created = await prisma.user.create({
      data: { name: u.name, email: u.email, passwordHash: demoPasswordHash, role: "MEMBER", setor: u.setor, cargo: u.cargo, avatarUrl: avatar(u.av) },
    });
    users[u.name] = created.id;
  }
  const assigneePool = Object.keys(users);
  const pickAssignee = (i: number) => users[assigneePool[i % assigneePool.length]];
  const adminId = demoAdmin.id;
  console.log(`Usuários: login demo + ${userDefs.length} da equipe.`);

  // ---------- Clients (22, com dados completos de contrato) ----------
  const CLIENT_ICON_KEYS = ["shopping", "beauty", "food", "consulting", "fitness", "health", "legal", "education", "realestate", "shopping"];
  const COVER_COLORS = ["#a7b8f0", "#f5c9a0", "#f0d888", "#b8a8e8", "#a0d8c0", "#e8e090", "#ffb870", "#88c8f0", "#ff9f9f", "#98e0b8", "#d0a0f0", "#78c0d8"];
  const clientDefs = [
    { name: "Loja Aurora", contactName: "Marina Duarte", monthlyValue: 5000, status: "ACTIVE", months: 14, city: "São Paulo - SP" },
    { name: "Pele Bonita Cosméticos", contactName: "Rodrigo Nunes", monthlyValue: 8000, status: "ACTIVE", months: 10, city: "Rio de Janeiro - RJ" },
    { name: "Sabor Caseiro Restaurante", contactName: "Helena Ramos", monthlyValue: 3500, status: "ACTIVE", months: 8, city: "Belo Horizonte - MG" },
    { name: "TechFlow Soluções", contactName: "Diego Almeida", monthlyValue: 12000, status: "ACTIVE", months: 6, city: "São Paulo - SP" },
    { name: "Vida Fitness Academia", contactName: "Patrícia Gomes", monthlyValue: 4500, status: "ACTIVE", months: 18, city: "Curitiba - PR" },
    { name: "Doce Encanto Confeitaria", contactName: "Larissa Pinto", monthlyValue: 2800, status: "ACTIVE", months: 5, city: "Campinas - SP" },
    { name: "Construtora Horizonte", contactName: "Eduardo Barros", monthlyValue: 15000, status: "ACTIVE", months: 9, city: "Goiânia - GO" },
    { name: "Clínica Bem Estar", contactName: "Dra. Fernanda Rocha", monthlyValue: 6000, status: "ACTIVE", months: 7, city: "São Paulo - SP" },
    { name: "Advocacia Martins & Souza", contactName: "Dr. André Martins", monthlyValue: 7000, status: "ACTIVE", months: 11, city: "Brasília - DF" },
    { name: "Escola Fluent Idiomas", contactName: "Beatriz Souza", monthlyValue: 4000, status: "ACTIVE", months: 4, city: "Porto Alegre - RS" },
    { name: "Bella Moda Boutique", contactName: "Mariana Duarte", monthlyValue: 3800, status: "ACTIVE", months: 3, city: "São Paulo - SP" },
    { name: "Sabor da Serra Restaurante", contactName: "Ricardo Nogueira", monthlyValue: 1900, status: "ACTIVE", months: 2, city: "Belo Horizonte - MG" },
    { name: "Clínica Vitalis", contactName: "Dra. Camila Freitas", monthlyValue: 7500, status: "ACTIVE", months: 2, city: "Rio de Janeiro - RJ" },
    { name: "AgroForte Insumos", contactName: "João Pedro Sales", monthlyValue: 9000, status: "ACTIVE", months: 12, city: "Ribeirão Preto - SP" },
    { name: "Studio Pilates Corpo Leve", contactName: "Renata Farias", monthlyValue: 2500, status: "ACTIVE", months: 6, city: "Florianópolis - SC" },
    { name: "Auto Center Veloz", contactName: "Ricardo Prado", monthlyValue: 5500, status: "ACTIVE", months: 15, city: "São Paulo - SP" },
    { name: "Hotel Mirante da Serra", contactName: "Sofia Albuquerque", monthlyValue: 8500, status: "ACTIVE", months: 5, city: "Gramado - RS" },
    { name: "Padaria Pão Nosso", contactName: "Antônio Ferreira", monthlyValue: 2200, status: "ACTIVE", months: 20, city: "Osasco - SP" },
    { name: "Ótica Visão Clara", contactName: "Sandra Melo", monthlyValue: 3200, status: "ACTIVE", months: 3, city: "Santos - SP" },
    { name: "Distribuidora Bebidas Já", contactName: "Paulo Vitor", monthlyValue: 6500, status: "ACTIVE", months: 8, city: "Guarulhos - SP" },
    { name: "Pet Feliz", contactName: "Carlos Eduardo", monthlyValue: 3000, status: "PAUSED", months: 13, city: "São Paulo - SP" },
    { name: "Móveis Elegance", contactName: "Simone Castro", monthlyValue: 5500, status: "CHURNED", months: 20, city: "São Bernardo - SP" },
  ] as const;

  const clients: Record<string, string> = {};
  for (let i = 0; i < clientDefs.length; i++) {
    const c = clientDefs[i];
    const slug = c.name.toLowerCase().replace(/[^a-z]+/g, "");
    const created = await prisma.client.create({
      data: {
        name: c.name,
        contactName: c.contactName,
        email: `contato@${slug}.com.br`,
        phone: `(11) 9${String(7000 + i * 111).slice(0, 4)}-${String(2000 + i * 137).slice(0, 4)}`,
        document: `${String(10 + i)}.${String(345 + i * 7).padStart(3, "0")}.${String(600 + i * 13).padStart(3, "0")}/0001-${String(10 + i)}`,
        address: `Rua ${["das Flores", "Bela Vista", "do Comércio", "Sete de Setembro", "das Palmeiras"][i % 5]}, ${100 + i * 37}, ${c.city}`,
        monthlyValue: c.monthlyValue,
        billingDay: [5, 10, 15][i % 3],
        status: c.status,
        startDate: monthsAgo(c.months),
        notes: `Cliente desde ${fmtDate(monthsAgo(c.months))}. Contato preferencial: WhatsApp.`,
        avatarUrl: logo(c.name, i),
        coverColor: COVER_COLORS[i % COVER_COLORS.length],
        icon: CLIENT_ICON_KEYS[i % CLIENT_ICON_KEYS.length],
      },
    });
    clients[c.name] = created.id;
  }
  const clientNameList = clientDefs.map((c) => c.name);
  console.log(`Clientes: ${clientDefs.length} (logo, capa, ícone, CNPJ e endereço).`);

  // ---------- Services (21) ----------
  const serviceDefs = [
    { name: "Gestão de Redes Sociais", category: "Social Media", defaultPrice: 2500 },
    { name: "Gestão de Instagram", category: "Social Media", defaultPrice: 1900 },
    { name: "Tráfego Pago (Meta Ads)", category: "Performance", defaultPrice: 3000 },
    { name: "Tráfego Pago (Google Ads)", category: "Performance", defaultPrice: 3000 },
    { name: "Design Gráfico", category: "Criação", defaultPrice: 1800 },
    { name: "Identidade Visual", category: "Criação", defaultPrice: 4500 },
    { name: "Landing Page", category: "Desenvolvimento", defaultPrice: 2200 },
    { name: "Site Institucional", category: "Desenvolvimento", defaultPrice: 6500 },
    { name: "E-commerce", category: "Desenvolvimento", defaultPrice: 12000 },
    { name: "SEO", category: "Performance", defaultPrice: 2000 },
    { name: "Produção de Vídeo", category: "Audiovisual", defaultPrice: 3500 },
    { name: "Cobertura de Eventos", category: "Audiovisual", defaultPrice: 2800 },
    { name: "Fotografia de Produto", category: "Audiovisual", defaultPrice: 1500 },
    { name: "Copywriting", category: "Conteúdo", defaultPrice: 1200 },
    { name: "Blog e Conteúdo SEO", category: "Conteúdo", defaultPrice: 1800 },
    { name: "Consultoria de Marketing", category: "Consultoria", defaultPrice: 4000 },
    { name: "Mentoria de Social Media", category: "Consultoria", defaultPrice: 1500 },
    { name: "E-mail Marketing", category: "Automação", defaultPrice: 1000 },
    { name: "Automação de WhatsApp", category: "Automação", defaultPrice: 1400 },
    { name: "Marketing 360", category: "Full Service", defaultPrice: 7500 },
    { name: "Assessoria de Imprensa", category: "Comunicação", defaultPrice: 3200 },
  ];
  const services: Record<string, string> = {};
  for (const s of serviceDefs) {
    const created = await prisma.service.create({ data: s });
    services[s.name] = created.id;
  }
  console.log(`Serviços: ${serviceDefs.length}`);

  // ---------- Team members (21, com foto) ----------
  const teamDefs = [
    { name: "Bianca Alves", type: "EMPLOYEE", role: "Analista de Redes Sociais", paymentType: "FIXED_MONTHLY", monthlyValue: 3500, av: 47 },
    { name: "Rafael Costa", type: "EMPLOYEE", role: "Gestor de Tráfego Pago", paymentType: "FIXED_MONTHLY", monthlyValue: 4200, av: 59 },
    { name: "Juliana Prado", type: "EMPLOYEE", role: "Designer Gráfico", paymentType: "FIXED_MONTHLY", monthlyValue: 3800, av: 44 },
    { name: "Marcos Lima", type: "PARTNER", role: "Redator Freelancer", paymentType: "PER_PROJECT", monthlyValue: null, av: 51 },
    { name: "Camila Torres", type: "EMPLOYEE", role: "Customer Success", paymentType: "FIXED_MONTHLY", monthlyValue: 3200, av: 45 },
    { name: "Thiago Mendes", type: "PARTNER", role: "Editor de Vídeo", paymentType: "PER_PROJECT", monthlyValue: null, av: 60 },
    { name: "Larissa Ferreira", type: "EMPLOYEE", role: "Desenvolvedora Front-end", paymentType: "FIXED_MONTHLY", monthlyValue: 5500, av: 48 },
    { name: "Pedro Henrique", type: "PARTNER", role: "Fotógrafo", paymentType: "HOURLY", monthlyValue: null, av: 61 },
    { name: "Amanda Ribeiro", type: "EMPLOYEE", role: "Analista Financeiro", paymentType: "FIXED_MONTHLY", monthlyValue: 4000, av: 49 },
    { name: "Gustavo Nogueira", type: "EMPLOYEE", role: "Diretor de Criação", paymentType: "FIXED_MONTHLY", monthlyValue: 7000, av: 53 },
    { name: "Isabela Santos", type: "EMPLOYEE", role: "Social Media Sênior", paymentType: "FIXED_MONTHLY", monthlyValue: 4500, av: 32 },
    { name: "Lucas Martins", type: "EMPLOYEE", role: "Analista de SEO", paymentType: "FIXED_MONTHLY", monthlyValue: 3900, av: 68 },
    { name: "Fernanda Lopes", type: "EMPLOYEE", role: "Gerente de Contas", paymentType: "FIXED_MONTHLY", monthlyValue: 5200, av: 41 },
    { name: "Bruno Carvalho", type: "PARTNER", role: "Motion Designer", paymentType: "PER_PROJECT", monthlyValue: null, av: 56 },
    { name: "Aline Rodrigues", type: "EMPLOYEE", role: "Analista de Mídia", paymentType: "FIXED_MONTHLY", monthlyValue: 3600, av: 43 },
    { name: "Diego Fernandes", type: "PARTNER", role: "Videomaker", paymentType: "HOURLY", monthlyValue: null, av: 62 },
    { name: "Carolina Mota", type: "EMPLOYEE", role: "Copywriter", paymentType: "FIXED_MONTHLY", monthlyValue: 3400, av: 40 },
    { name: "André Barros", type: "PARTNER", role: "Consultor de Growth", paymentType: "PER_PROJECT", monthlyValue: null, av: 65 },
    { name: "Natália Cunha", type: "EMPLOYEE", role: "Assistente de Atendimento", paymentType: "FIXED_MONTHLY", monthlyValue: 2400, av: 38 },
    { name: "Rodrigo Teixeira", type: "EMPLOYEE", role: "Desenvolvedor Full-stack", paymentType: "FIXED_MONTHLY", monthlyValue: 6800, av: 66 },
    { name: "Vanessa Dias", type: "PARTNER", role: "Ilustradora", paymentType: "PER_PROJECT", monthlyValue: null, av: 36 },
  ] as const;
  const teamMembers: Record<string, string> = {};
  for (const t of teamDefs) {
    const created = await prisma.teamMember.create({
      data: {
        name: t.name,
        type: t.type,
        role: t.role,
        email: `${t.name.split(" ")[0].toLowerCase()}@agencia.demo`,
        phone: `(11) 98${String(100 + teamDefs.indexOf(t) * 7).padStart(3, "0")}-4${String(200 + teamDefs.indexOf(t) * 13).padStart(3, "0")}`,
        paymentType: t.paymentType,
        monthlyValue: t.monthlyValue ?? undefined,
        avatarUrl: avatar(t.av),
      },
    });
    teamMembers[t.name] = created.id;
  }
  console.log(`Equipe: ${teamDefs.length} (com foto).`);

  // ---------- Projects (30+) ----------
  const projectDefs = [
    { client: "Loja Aurora", service: "Gestão de Redes Sociais", name: "Gestão de Redes Sociais 2026", status: "IN_PROGRESS", value: 5000, due: 20 },
    { client: "Loja Aurora", service: "Tráfego Pago (Meta Ads)", name: "Campanha Coleção Inverno", status: "REVIEW", value: 3000, due: 5 },
    { client: "Pele Bonita Cosméticos", service: "Gestão de Redes Sociais", name: "Redes Sociais Pele Bonita", status: "IN_PROGRESS", value: 8000, due: 25 },
    { client: "Pele Bonita Cosméticos", service: "Produção de Vídeo", name: "Vídeos Lançamento Linha Facial", status: "PLANNING", value: 6000, due: 40 },
    { client: "Sabor Caseiro Restaurante", service: "Gestão de Redes Sociais", name: "Redes Sociais Sabor Caseiro", status: "IN_PROGRESS", value: 3500, due: 15 },
    { client: "Sabor Caseiro Restaurante", service: "Design Gráfico", name: "Cardápio Digital", status: "DONE", value: 1800, due: -10 },
    { client: "TechFlow Soluções", service: "Landing Page", name: "Landing Page Produto SaaS", status: "REVIEW", value: 6000, due: 8 },
    { client: "TechFlow Soluções", service: "SEO", name: "SEO Institucional", status: "IN_PROGRESS", value: 4000, due: 30 },
    { client: "Vida Fitness Academia", service: "Gestão de Redes Sociais", name: "Redes Sociais Vida Fitness", status: "IN_PROGRESS", value: 4500, due: 18 },
    { client: "Vida Fitness Academia", service: "Tráfego Pago (Meta Ads)", name: "Campanha Matrículas", status: "PLANNING", value: 2500, due: 35 },
    { client: "Doce Encanto Confeitaria", service: "Gestão de Instagram", name: "Instagram Doce Encanto", status: "IN_PROGRESS", value: 2800, due: 22 },
    { client: "Construtora Horizonte", service: "Consultoria de Marketing", name: "Consultoria de Marketing 360", status: "IN_PROGRESS", value: 15000, due: 45 },
    { client: "Construtora Horizonte", service: "Landing Page", name: "Landing Page Vista Alta", status: "REVIEW", value: 5000, due: 3 },
    { client: "Clínica Bem Estar", service: "Gestão de Redes Sociais", name: "Redes Sociais Clínica Bem Estar", status: "IN_PROGRESS", value: 6000, due: 20 },
    { client: "Clínica Bem Estar", service: "E-mail Marketing", name: "Fluxo de E-mail Pós-Consulta", status: "PLANNING", value: 1500, due: 50 },
    { client: "Advocacia Martins & Souza", service: "SEO", name: "SEO Advocacia", status: "IN_PROGRESS", value: 3500, due: 28 },
    { client: "Advocacia Martins & Souza", service: "Blog e Conteúdo SEO", name: "Conteúdo Blog Jurídico", status: "IN_PROGRESS", value: 1200, due: 12 },
    { client: "Escola Fluent Idiomas", service: "Tráfego Pago (Google Ads)", name: "Campanha Matrículas 2026", status: "IN_PROGRESS", value: 3000, due: 10 },
    { client: "Escola Fluent Idiomas", service: "Design Gráfico", name: "Material Gráfico Institucional", status: "DONE", value: 1800, due: -20 },
    { client: "Bella Moda Boutique", service: "Gestão de Redes Sociais", name: "Social + Ads Bella Moda", status: "IN_PROGRESS", value: 3800, due: 26 },
    { client: "Sabor da Serra Restaurante", service: "Gestão de Instagram", name: "Instagram Sabor da Serra", status: "IN_PROGRESS", value: 1900, due: 24 },
    { client: "Clínica Vitalis", service: "Marketing 360", name: "Marketing 360 Vitalis", status: "PLANNING", value: 7500, due: 38 },
    { client: "AgroForte Insumos", service: "Site Institucional", name: "Novo Site AgroForte", status: "IN_PROGRESS", value: 6500, due: 33 },
    { client: "AgroForte Insumos", service: "Gestão de Redes Sociais", name: "Redes Sociais AgroForte", status: "IN_PROGRESS", value: 3000, due: 17 },
    { client: "Studio Pilates Corpo Leve", service: "Gestão de Instagram", name: "Instagram Corpo Leve", status: "IN_PROGRESS", value: 2500, due: 21 },
    { client: "Auto Center Veloz", service: "Tráfego Pago (Google Ads)", name: "Google Ads Auto Center", status: "IN_PROGRESS", value: 2800, due: 14 },
    { client: "Hotel Mirante da Serra", service: "Fotografia de Produto", name: "Ensaio Fotográfico Suítes", status: "REVIEW", value: 2200, due: 6 },
    { client: "Hotel Mirante da Serra", service: "Gestão de Redes Sociais", name: "Redes Sociais Mirante", status: "IN_PROGRESS", value: 4200, due: 29 },
    { client: "Padaria Pão Nosso", service: "Identidade Visual", name: "Rebranding Pão Nosso", status: "PLANNING", value: 4500, due: 55 },
    { client: "Ótica Visão Clara", service: "E-commerce", name: "Loja Virtual Visão Clara", status: "IN_PROGRESS", value: 12000, due: 60 },
    { client: "Distribuidora Bebidas Já", service: "Automação de WhatsApp", name: "Automação Pedidos WhatsApp", status: "REVIEW", value: 1400, due: 4 },
    { client: "Pet Feliz", service: "Gestão de Redes Sociais", name: "Redes Sociais Pet Feliz", status: "CANCELED", value: 3000, due: -5 },
    { client: "Móveis Elegance", service: "Design Gráfico", name: "Catálogo de Produtos", status: "DONE", value: 2200, due: -90 },
  ] as const;
  const projects: Record<string, string> = {};
  const projectsByClient: Record<string, string[]> = {};
  for (const p of projectDefs) {
    const created = await prisma.project.create({
      data: {
        name: p.name,
        status: p.status,
        value: p.value,
        clientId: clients[p.client],
        serviceId: services[p.service],
        startDate: daysFromNow(p.due - 60),
        dueDate: daysFromNow(p.due),
      },
    });
    projects[p.name] = created.id;
    (projectsByClient[p.client] ??= []).push(created.id);
  }
  console.log(`Projetos: ${projectDefs.length}`);

  // ---------- Financeiro: 6 meses de histórico + lançamentos variados ----------
  const activeClientDefs = clientDefs.filter((c) => c.status === "ACTIVE");
  const fixedTeam = teamDefs.filter((t) => t.paymentType === "FIXED_MONTHLY");
  for (let m = 6; m >= 1; m--) {
    const period = monthsAgo(m);
    const key = monthKey(period);
    for (const c of activeClientDefs) {
      await prisma.transaction.create({
        data: {
          type: "INCOME",
          amount: c.monthlyValue,
          description: `Mensalidade - ${c.name}`,
          dueDate: monthsAgo(m, 5),
          paidDate: monthsAgo(m, 6),
          status: "PAID",
          source: "RECURRING",
          recurrenceKey: `client:${clients[c.name]}:${key}`,
          clientId: clients[c.name],
        },
      });
    }
    for (const t of fixedTeam) {
      await prisma.transaction.create({
        data: {
          type: "EXPENSE",
          amount: t.monthlyValue!,
          description: `Pagamento mensal - ${t.name}`,
          dueDate: monthsAgo(m, 5),
          paidDate: monthsAgo(m, 5),
          status: "PAID",
          source: "RECURRING",
          recurrenceKey: `team:${teamMembers[t.name]}:${key}`,
          teamMemberId: teamMembers[t.name],
        },
      });
    }
  }
  const manualTx = [
    { type: "INCOME", amount: 6000, description: "Landing Page Vista Alta - pagamento final", due: 3, status: "PENDING", client: "Construtora Horizonte", service: "Landing Page" },
    { type: "INCOME", amount: 4500, description: "Setup Identidade Visual - Padaria Pão Nosso", due: 10, status: "PENDING", client: "Padaria Pão Nosso", service: "Identidade Visual" },
    { type: "INCOME", amount: 2200, description: "Ensaio fotográfico - Hotel Mirante (50% final)", due: -4, status: "PENDING", client: "Hotel Mirante da Serra", service: "Fotografia de Produto" },
    { type: "INCOME", amount: 12000, description: "E-commerce Visão Clara - entrada", due: -15, status: "PAID", paid: -14, client: "Ótica Visão Clara", service: "E-commerce" },
    { type: "EXPENSE", amount: 1800, description: "Edição de vídeos - Pele Bonita (freela)", due: 5, status: "PENDING", service: "Produção de Vídeo" },
    { type: "EXPENSE", amount: 900, description: "Assinaturas de ferramentas (Canva, Meta, CRM)", due: -2, status: "PAID", paid: -2 },
    { type: "EXPENSE", amount: 450, description: "Banco de imagens premium (anual)", due: 12, status: "PENDING" },
    { type: "EXPENSE", amount: 2600, description: "Coworking - aluguel mensal", due: 1, status: "PENDING" },
    { type: "EXPENSE", amount: 1200, description: "Impressão de materiais - evento AgroForte", due: -8, status: "PAID", paid: -7, client: "AgroForte Insumos" },
    { type: "INCOME", amount: 3200, description: "Consultoria avulsa - Distribuidora Bebidas Já", due: 7, status: "PENDING", client: "Distribuidora Bebidas Já", service: "Consultoria de Marketing" },
  ] as const;
  for (const t of manualTx) {
    await prisma.transaction.create({
      data: {
        type: t.type,
        amount: t.amount,
        description: t.description,
        dueDate: daysFromNow(t.due),
        paidDate: "paid" in t ? daysFromNow(t.paid) : null,
        status: t.status,
        source: "MANUAL",
        clientId: "client" in t && t.client ? clients[t.client] : undefined,
        serviceId: "service" in t && t.service ? services[t.service] : undefined,
      },
    });
  }
  console.log("Financeiro: 6 meses de histórico + 10 lançamentos manuais.");

  // ---------- Demand types ----------
  const demandTypeDefs = [
    { name: "Post", color: "#ff9f1c" },
    { name: "Reels", color: "#ec4899" },
    { name: "Carrossel", color: "#a855f7" },
    { name: "Stories", color: "#eab308" },
    { name: "Landing Page", color: "#4b9fe1" },
    { name: "Anúncio", color: "#e14b4b" },
    { name: "Material Gráfico", color: "#14b8a6" },
    { name: "Vídeo", color: "#3fb56f" },
  ];
  const demandTypes: Record<string, string> = {};
  for (let i = 0; i < demandTypeDefs.length; i++) {
    const d = demandTypeDefs[i];
    const created = await prisma.demandType.create({ data: { name: d.name, color: d.color, position: i } });
    demandTypes[d.name] = created.id;
  }

  // ---------- Posts: aprovação + agendamentos (24, com fotos reais) ----------
  const postTitles = [
    "Post promoção coleção inverno", "Reels lançamento linha facial", "Carrossel cardápio da semana",
    "Anúncio campanha matrículas", "Post doces de fim de semana", "Stories bastidores obra",
    "Post dicas de saúde", "Anúncio matrículas 2026", "Post institucional aniversário",
    "Carrossel depoimentos de clientes", "Reels look do dia", "Post receita da semana",
    "Carrossel antes e depois", "Stories promoção relâmpago", "Post horário especial feriado",
    "Reels tour pela academia", "Anúncio black friday antecipada", "Post novidade no cardápio",
    "Carrossel 5 dicas jurídicas", "Stories enquete de sabores", "Post inauguração nova unidade",
    "Reels bastidores do ensaio", "Anúncio remarketing carrinho", "Post depoimento de aluno",
  ];
  const postStatuses = ["PENDING", "APPROVED", "APPROVED", "CHANGES_REQUESTED", "APPROVED", "PENDING"] as const;
  const posts: { id: string; title: string; token: string; status: string }[] = [];
  for (let i = 0; i < postTitles.length; i++) {
    const clientName = clientNameList[i % (clientNameList.length - 2)];
    const status = postStatuses[i % postStatuses.length];
    const scheduled = status === "APPROVED" ? daysFromNow((i % 12) + 1, [9, 12, 15, 18][i % 4], [0, 30][i % 2]) : null;
    const created = await prisma.post.create({
      data: {
        title: postTitles[i],
        caption: `${postTitles[i]} - legenda pronta com hashtags e CTA. #marketing #${clientName.split(" ")[0].toLowerCase()}`,
        status,
        priority: (["LOW", "MEDIUM", "HIGH"] as const)[i % 3],
        feedback: status === "CHANGES_REQUESTED" ? "Ajustar a cor do fundo e aumentar o logo no fechamento." : null,
        reviewedAt: status === "PENDING" ? null : daysFromNow(-((i % 5) + 1)),
        scheduledDate: scheduled,
        clientId: clients[clientName],
        projectId: (projectsByClient[clientName] ?? [])[0] ?? null,
        demandTypeId: demandTypes[["Post", "Reels", "Carrossel", "Stories", "Anúncio"][i % 5]],
        createdById: pickAssignee(i),
      },
    });
    const nImages = (i % 3) + 1;
    for (let j = 0; j < nImages; j++) {
      await prisma.attachment.create({
        data: {
          url: photo(`post-${i}-${j}`, 1080, 1080),
          type: "IMAGE",
          name: `${postTitles[i]} ${j + 1}`,
          position: j,
          postId: created.id,
          status: status === "PENDING" ? "PENDING" : status,
          feedback: status === "CHANGES_REQUESTED" && j === 0 ? "Ajustar a cor do fundo." : null,
          reviewedAt: status === "PENDING" ? null : daysFromNow(-2),
        },
      });
    }
    posts.push({ id: created.id, title: postTitles[i], token: created.token, status });
  }
  console.log(`Posts: ${postTitles.length} (aprovação + agendamentos com data e hora, fotos reais).`);

  // ---------- Kanban: 6 quadros com ~20 cards cada ----------
  const boardDefs = [
    { name: "Social Media", client: null as string | null, columns: ["Ideias", "Em Produção", "Aprovação Cliente", "Agendado", "Publicado"] },
    { name: "Tráfego Pago", client: null, columns: ["Backlog", "Configurando", "Rodando", "Otimização", "Relatório Entregue"] },
    { name: "Design & Criação", client: null, columns: ["Briefing", "Em Produção", "Revisão Interna", "Aprovação Cliente", "Entregue"] },
    { name: "Audiovisual", client: null, columns: ["Roteiro", "Gravação", "Edição", "Revisão", "Entregue"] },
    { name: "Web & Dev", client: null, columns: ["To Do", "Em Desenvolvimento", "Revisão", "Homologação", "Publicado"] },
    { name: "TechFlow - Site & LPs", client: "TechFlow Soluções", columns: ["To Do", "Em Desenvolvimento", "Revisão", "Homologação", "Publicado"] },
  ];
  const priorities = ["LOW", "MEDIUM", "HIGH"] as const;
  const activeClientNames = clientNameList.filter((n) => n !== "Móveis Elegance" && n !== "Pet Feliz");
  const demandTypeNames = Object.keys(demandTypes);
  let cardCounter = 0;
  const allCardIds: string[] = [];
  const socialColumns: Record<string, string> = {};
  for (let bi = 0; bi < boardDefs.length; bi++) {
    const b = boardDefs[bi];
    const board = await prisma.kanbanBoard.create({
      data: { name: b.name, position: bi, clientId: b.client ? clients[b.client] : null },
    });
    const columnIds: string[] = [];
    for (let ci = 0; ci < b.columns.length; ci++) {
      const col = await prisma.kanbanColumn.create({ data: { name: b.columns[ci], position: ci, boardId: board.id } });
      columnIds.push(col.id);
      if (b.name === "Social Media") socialColumns[b.columns[ci]] = col.id;
    }
    const cardsPerColumn = [6, 5, 4, 3, 3];
    for (let ci = 0; ci < columnIds.length; ci++) {
      for (let k = 0; k < (cardsPerColumn[ci] ?? 3); k++) {
        cardCounter++;
        const clientName = activeClientNames[cardCounter % activeClientNames.length];
        const demandTypeName = demandTypeNames[cardCounter % demandTypeNames.length];
        const isLastColumn = ci === columnIds.length - 1;
        const isApprovalColumn = b.columns[ci].toLowerCase().includes("aprovação");
        const linkedPost = isApprovalColumn || isLastColumn ? posts[cardCounter % posts.length] : null;
        const clientProjects = projectsByClient[clientName] ?? [];
        const card = await prisma.kanbanCard.create({
          data: {
            title: `${demandTypeName} - ${clientName.split(" ")[0]} #${cardCounter}`,
            description: `Demanda de ${demandTypeName.toLowerCase()} para ${clientName}. Alinhar com o cliente antes de publicar.`,
            priority: priorities[cardCounter % priorities.length],
            dueDate: daysFromNow((cardCounter % 21) - 5, [9, 14, 17][cardCounter % 3]),
            completedAt: isLastColumn && cardCounter % 2 === 0 ? daysFromNow(-2) : null,
            position: k,
            columnId: columnIds[ci],
            clientId: clients[clientName],
            projectId: clientProjects.length > 0 ? clientProjects[cardCounter % clientProjects.length] : null,
            assigneeId: pickAssignee(cardCounter),
            demandTypeId: demandTypes[demandTypeName],
            postId: linkedPost ? linkedPost.id : null,
          },
        });
        allCardIds.push(card.id);
      }
    }
  }
  console.log(`Kanban: ${boardDefs.length} quadros, ${cardCounter} cards.`);

  // Comentários e checklists em cards
  const commentTexts = [
    "Cliente pediu para adiantar a entrega.", "Já enviei o rascunho para aprovação interna.",
    "Aguardando material do cliente.", "Ficou ótimo, só ajustar a legenda.",
    "Podemos agendar para amanhã às 10h?", "Revisado e aprovado internamente.",
    "Briefing atualizado no anexo.", "Cliente aprovou por WhatsApp, segue print.",
  ];
  for (let i = 0; i < 14; i++) {
    const cardId = allCardIds[i * 7 % allCardIds.length];
    await prisma.comment.create({
      data: { cardId, text: commentTexts[i % commentTexts.length], authorId: pickAssignee(i), isAutomated: false },
    });
    if (i % 2 === 0) {
      const checklist = await prisma.checklist.create({ data: { title: "Itens para revisão", cardId } });
      await prisma.checklistItem.createMany({
        data: [
          { checklistId: checklist.id, text: "Revisar texto", position: 0, done: true },
          { checklistId: checklist.id, text: "Revisar imagens", position: 1, done: true },
          { checklistId: checklist.id, text: "Aprovação do cliente", position: 2, done: false },
        ],
      });
    }
  }

  // ---------- Timesheet (36 apontamentos nos últimos 14 dias) ----------
  const timesheetNotes = [
    "Criação de artes do calendário", "Reunião de alinhamento com o cliente", "Configuração de campanha",
    "Edição de vídeo", "Redação de legendas", "Otimização de anúncios", "Relatório mensal", "Ajustes pós-feedback",
  ];
  for (let i = 0; i < 36; i++) {
    await prisma.timeEntry.create({
      data: {
        minutes: [30, 45, 60, 90, 120, 150, 180, 240][i % 8],
        date: daysFromNow(-(i % 14), [9, 11, 14, 16][i % 4]),
        note: timesheetNotes[i % timesheetNotes.length],
        cardId: allCardIds[(i * 3) % allCardIds.length],
        userId: pickAssignee(i + 2),
      },
    });
  }
  console.log("Timesheet: 36 apontamentos de horas.");

  // ---------- Conteúdos agendados (aba Agendamentos: rede, data, hora e capa) ----------
  const networks = ["INSTAGRAM", "INSTAGRAM", "INSTAGRAM", "FACEBOOK", "LINKEDIN", "TIKTOK", "YOUTUBE", "THREADS"] as const;
  const scheduleTitles = [
    "Post look da semana", "Reels bastidores da produção", "Carrossel dicas do especialista",
    "Stories promoção do dia", "Post depoimento de cliente", "Reels antes e depois",
    "Carrossel novidades do mês", "Post oferta relâmpago", "Reels tour pelo espaço",
    "Post curiosidade do nicho", "Carrossel passo a passo", "Stories enquete interativa",
    "Post frase inspiracional", "Reels tendência da semana", "Post lançamento oficial",
    "Carrossel perguntas frequentes", "Post meme do nicho", "Reels desafio viral",
    "Post aviso de horário especial", "Carrossel resultados do trimestre",
  ];
  const scheduleHours: [number, number][] = [[8, 30], [11, 0], [12, 30], [15, 0], [17, 30], [19, 0], [20, 30]];
  let scheduledCount = 0;
  // 20 agendados pros próximos 21 dias
  for (let i = 0; i < 20; i++) {
    const clientName = activeClientNames[(i * 3) % activeClientNames.length];
    const [h, min] = scheduleHours[i % scheduleHours.length];
    const card = await prisma.kanbanCard.create({
      data: {
        title: `${scheduleTitles[i]} - ${clientName.split(" ")[0]}`,
        description: `Conteúdo aprovado pelo cliente e agendado. Legenda e hashtags na pasta do projeto.`,
        priority: "MEDIUM",
        position: 100 + i,
        columnId: socialColumns["Agendado"],
        clientId: clients[clientName],
        assigneeId: pickAssignee(i + 1),
        demandTypeId: demandTypes[["Post", "Reels", "Carrossel", "Stories"][i % 4]],
        scheduledNetwork: networks[i % networks.length],
        scheduledAt: daysFromNow(i + 1 - Math.floor(i / 4), h, min),
        publishStatus: "PENDING",
      },
    });
    await prisma.attachment.create({
      data: { url: photo(`agenda-${i}`, 1080, 1350), type: "IMAGE", name: `${scheduleTitles[i]} - capa`, position: 0, cardId: card.id },
    });
    scheduledCount++;
  }
  // 7 já publicados (últimos dias)
  for (let i = 0; i < 7; i++) {
    const clientName = activeClientNames[(i * 5 + 2) % activeClientNames.length];
    const [h, min] = scheduleHours[(i + 3) % scheduleHours.length];
    const when = daysFromNow(-(i + 1), h, min);
    const card = await prisma.kanbanCard.create({
      data: {
        title: `${scheduleTitles[(i + 12) % scheduleTitles.length]} - ${clientName.split(" ")[0]}`,
        description: "Publicado automaticamente pela integração.",
        priority: "MEDIUM",
        position: 200 + i,
        columnId: socialColumns["Publicado"],
        clientId: clients[clientName],
        assigneeId: pickAssignee(i + 4),
        demandTypeId: demandTypes[["Post", "Reels", "Carrossel"][i % 3]],
        scheduledNetwork: networks[(i + 2) % networks.length],
        scheduledAt: when,
        publishStatus: "PUBLISHED",
        publishedAt: when,
        completedAt: when,
      },
    });
    await prisma.attachment.create({
      data: { url: photo(`publicado-${i}`, 1080, 1350), type: "IMAGE", name: "Capa publicada", position: 0, cardId: card.id },
    });
    scheduledCount++;
  }
  // 1 com falha de publicação (realismo)
  const failedCard = await prisma.kanbanCard.create({
    data: {
      title: "Reels oferta de inauguração - Ótica",
      description: "Reagendar após reconectar a conta.",
      priority: "HIGH",
      position: 300,
      columnId: socialColumns["Agendado"],
      clientId: clients["Ótica Visão Clara"],
      assigneeId: pickAssignee(3),
      demandTypeId: demandTypes["Reels"],
      scheduledNetwork: "INSTAGRAM",
      scheduledAt: daysFromNow(-1, 18, 0),
      publishStatus: "FAILED",
      publishError: "Token da conta expirou. Reconecte o Instagram no painel de integrações.",
    },
  });
  await prisma.attachment.create({
    data: { url: photo("agenda-falha", 1080, 1350), type: "IMAGE", name: "Capa", position: 0, cardId: failedCard.id },
  });
  scheduledCount++;
  console.log(`Conteúdos agendados: ${scheduledCount} (20 futuros com hora marcada, 7 publicados, 1 com falha).`);


  // ---------- Notes (22) e Checklists avulsos (21) ----------
  const noteFolder = await prisma.folder.create({ data: { name: "Reuniões e Briefings", kind: "NOTE" } });
  const ideasFolder = await prisma.folder.create({ data: { name: "Ideias de Conteúdo", kind: "NOTE" } });
  const checklistFolder = await prisma.folder.create({ data: { name: "Processos Internos", kind: "CHECKLIST" } });

  const noteDefs = [
    { title: "Briefing - Loja Aurora Coleção Inverno", content: "Paleta de cores: tons terrosos. Público: mulheres 25-40 anos. Foco em promoções da coleção nova.", client: "Loja Aurora", folder: noteFolder.id },
    { title: "Ata reunião mensal - Pele Bonita", content: "Cliente aprovou aumento de verba de tráfego pago para R$1.500/mês. Novo lançamento em agosto.", client: "Pele Bonita Cosméticos", folder: noteFolder.id },
    { title: "Ideias de conteúdo - Sabor Caseiro", content: "Fazer série 'bastidores da cozinha'. Testar reels de receitas rápidas.", client: "Sabor Caseiro Restaurante", folder: ideasFolder.id },
    { title: "Onboarding TechFlow", content: "Acesso ao Google Analytics e Search Console solicitado. Aguardando retorno do time de TI do cliente.", client: "TechFlow Soluções", folder: noteFolder.id },
    { title: "Pauta semanal - time de criação", content: "Revisar prioridades da semana: Loja Aurora, Vida Fitness e Construtora Horizonte.", client: null, folder: noteFolder.id },
    { title: "Feedback geral - Vida Fitness", content: "Cliente satisfeito com engajamento do último mês. Pediu mais vídeos curtos.", client: "Vida Fitness Academia", folder: noteFolder.id },
    { title: "Ideias campanha matrículas - Fluent", content: "Testar oferta 'primeira aula grátis'. Criar landing page dedicada.", client: "Escola Fluent Idiomas", folder: ideasFolder.id },
    { title: "Tom de voz - Advocacia Martins", content: "Tom formal, sem gírias. Sempre revisar termos jurídicos com o cliente antes de publicar.", client: "Advocacia Martins & Souza", folder: noteFolder.id },
    { title: "Kickoff Bella Moda", content: "Reunião de onboarding feita. Coleta de acessos concluída. Primeira pauta aprovada.", client: "Bella Moda Boutique", folder: noteFolder.id },
    { title: "Cronograma editorial - Sabor da Serra", content: "3 posts/semana + 4 stories. Reservas pelo Direct viram meta do trimestre.", client: "Sabor da Serra Restaurante", folder: noteFolder.id },
    { title: "Plano 360 - Clínica Vitalis", content: "Fase 1: presença digital. Fase 2: captação paga. Fase 3: materiais impressos da recepção.", client: "Clínica Vitalis", folder: noteFolder.id },
    { title: "Pesquisa de mercado - AgroForte", content: "Concorrentes fortes em Google Ads. Oportunidade em conteúdo técnico para engenheiros agrônomos.", client: "AgroForte Insumos", folder: noteFolder.id },
    { title: "Ideias de reels - Corpo Leve", content: "Série 'pilates em 60 segundos'. Depoimentos de alunas. Desafio de 30 dias.", client: "Studio Pilates Corpo Leve", folder: ideasFolder.id },
    { title: "Roteiro vídeo institucional - Auto Center", content: "Abertura com drone, depoimento do dono, oficina em ação, oferta de revisão gratuita no final.", client: "Auto Center Veloz", folder: ideasFolder.id },
    { title: "Pauta de inverno - Hotel Mirante", content: "Pacotes românticos, gastronomia de montanha, lareira e vinhos. Parceria com influenciadores de viagem.", client: "Hotel Mirante da Serra", folder: ideasFolder.id },
    { title: "Rebranding Pão Nosso - anotações", content: "Manter o vermelho tradicional. Modernizar tipografia. Cliente quer manter o slogan histórico.", client: "Padaria Pão Nosso", folder: noteFolder.id },
    { title: "Migração e-commerce Visão Clara", content: "Plataforma escolhida. Catálogo com 340 produtos pra cadastrar. Prazo de 60 dias.", client: "Ótica Visão Clara", folder: noteFolder.id },
    { title: "Fluxo WhatsApp - Bebidas Já", content: "Menu principal: pedidos, promoções, atendente. Integrar com catálogo do WhatsApp Business.", client: "Distribuidora Bebidas Já", folder: noteFolder.id },
    { title: "Retrospectiva do trimestre", content: "Crescimento de 18% na receita recorrente. 4 clientes novos. Meta do próximo trimestre: 6 contratos.", client: null, folder: noteFolder.id },
    { title: "Ideias para o Dia das Mães", content: "Campanhas temáticas pra Loja Aurora, Doce Encanto, Pele Bonita e Hotel Mirante. Iniciar produção 30 dias antes.", client: null, folder: ideasFolder.id },
    { title: "Processo de aprovação de posts", content: "Todo post passa por: revisão interna > link de aprovação pro cliente > agendamento. Prazo de 24h úteis pro cliente.", client: null, folder: noteFolder.id },
    { title: "Banco de hashtags por segmento", content: "Moda, gastronomia, saúde, fitness, jurídico e educação. Atualizar mensalmente conforme desempenho.", client: null, folder: ideasFolder.id },
  ] as const;
  for (let i = 0; i < noteDefs.length; i++) {
    const n = noteDefs[i];
    await prisma.note.create({
      data: { title: n.title, content: n.content, folderId: n.folder, clientId: n.client ? clients[n.client] : null, authorId: pickAssignee(i) },
    });
  }
  console.log(`Notas: ${noteDefs.length}`);

  const standaloneChecklistDefs = [
    { title: "Onboarding de novo cliente", items: ["Reunião de briefing", "Acesso às redes sociais", "Definir cronograma", "Enviar contrato assinado", "Criar quadro no Kanban"], done: 3 },
    { title: "Checklist de gravação de vídeo", items: ["Confirmar local", "Levar equipamento extra", "Roteiro aprovado", "Autorização de imagem"], done: 4 },
    { title: "Publicação semanal de posts", items: ["Aprovar arte com cliente", "Agendar no Meta Business", "Conferir legendas", "Responder comentários"], done: 2 },
    { title: "Fechamento mensal financeiro", items: ["Conferir mensalidades pagas", "Emitir notas fiscais", "Atualizar planilha de despesas"], done: 1 },
    { title: "Relatório de tráfego pago", items: ["Exportar métricas do Meta Ads", "Exportar métricas do Google Ads", "Montar apresentação", "Agendar call com cliente"], done: 2 },
    { title: "Auditoria de SEO trimestral", items: ["Analisar palavras-chave", "Revisar backlinks", "Checar velocidade do site", "Atualizar meta descriptions"], done: 0 },
    { title: "Checklist de lançamento de campanha", items: ["Pixel instalado", "Públicos configurados", "Criativos aprovados", "Orçamento definido", "UTMs configuradas"], done: 5 },
    { title: "Preparação de reunião mensal", items: ["Montar relatório", "Separar destaques do mês", "Listar próximos passos", "Enviar convite"], done: 3 },
    { title: "Checklist de cobertura de evento", items: ["Confirmar horário e acesso", "Bateria e cartões extras", "Lista de takes obrigatórios", "Stories ao vivo"], done: 1 },
    { title: "Offboarding de cliente", items: ["Exportar relatórios finais", "Devolver acessos", "Termo de encerramento", "Backup de materiais"], done: 0 },
    { title: "Revisão de identidade visual", items: ["Conferir uso do logo", "Validar paleta", "Checar tipografia nas peças"], done: 2 },
    { title: "Rotina diária de social media", items: ["Responder comentários", "Responder Directs", "Conferir agendamentos do dia", "Monitorar menções"], done: 4 },
    { title: "Setup de automação de e-mail", items: ["Configurar domínio", "Criar fluxo de boas-vindas", "Testar disparos", "Ativar automação"], done: 2 },
    { title: "Checklist de landing page", items: ["Copy revisada", "Formulário testado", "Pixel e Analytics", "Versão mobile", "Velocidade OK"], done: 3 },
    { title: "Preparação de proposta comercial", items: ["Levantar escopo", "Precificar", "Montar proposta no sistema", "Enviar link pro lead"], done: 4 },
    { title: "Checklist de pauta mensal", items: ["Datas comemorativas do mês", "Lançamentos do cliente", "Conteúdo educativo", "Prova social"], done: 2 },
    { title: "Manutenção mensal de sites", items: ["Backup completo", "Atualizar plugins", "Testar formulários", "Verificar SSL"], done: 1 },
    { title: "Rotina de report semanal", items: ["Números da semana", "Destaques e alertas", "Enviar no grupo do cliente"], done: 3 },
    { title: "Checklist de contratação de freela", items: ["Portfólio avaliado", "Teste prático", "Contrato assinado", "Acessos liberados"], done: 2 },
    { title: "Organização de arquivos no Drive", items: ["Pastas por cliente", "Padronizar nomes", "Limpar duplicados"], done: 1 },
    { title: "Checklist de fim de ano", items: ["Recesso comunicado aos clientes", "Agendamentos antecipados", "Confraternização", "Planejamento do próximo ano"], done: 0 },
  ];
  for (const c of standaloneChecklistDefs) {
    const checklist = await prisma.checklist.create({ data: { title: c.title, folderId: checklistFolder.id } });
    await prisma.checklistItem.createMany({
      data: c.items.map((text, i) => ({ checklistId: checklist.id, text, position: i, done: i < c.done })),
    });
  }
  console.log(`Checklists avulsos: ${standaloneChecklistDefs.length}`);

  // ---------- Squads (6) ----------
  const squadDefs = [
    { name: "Squad Social Media", color: "#ff9f1c", icon: "sparkles", lead: "Bianca Alves", members: ["Bianca Alves", "Marcos Lima", "Isabela Santos", "Carolina Mota"] },
    { name: "Squad Performance", color: "#4b9fe1", icon: "target", lead: "Rafael Costa", members: ["Rafael Costa", "Aline Rodrigues", "Lucas Martins", "André Barros"] },
    { name: "Squad Criação", color: "#a855f7", icon: "star", lead: "Gustavo Nogueira", members: ["Gustavo Nogueira", "Juliana Prado", "Vanessa Dias", "Bruno Carvalho"] },
    { name: "Squad Audiovisual", color: "#ec4899", icon: "camera", lead: "Thiago Mendes", members: ["Thiago Mendes", "Pedro Henrique", "Diego Fernandes"] },
    { name: "Squad Web & Growth", color: "#3fb56f", icon: "rocket", lead: "Larissa Ferreira", members: ["Larissa Ferreira", "Rodrigo Teixeira", "Lucas Martins"] },
    { name: "Squad Atendimento", color: "#eab308", icon: "heart", lead: "Fernanda Lopes", members: ["Fernanda Lopes", "Camila Torres", "Natália Cunha", "Amanda Ribeiro"] },
  ] as const;
  const squads: Record<string, string> = {};
  for (let i = 0; i < squadDefs.length; i++) {
    const s = squadDefs[i];
    const created = await prisma.squad.create({
      data: { name: s.name, color: s.color, icon: s.icon, position: i, leadId: teamMembers[s.lead] },
    });
    squads[s.name] = created.id;
    for (const memberName of s.members) {
      await prisma.squadMember.create({ data: { squadId: created.id, teamMemberId: teamMembers[memberName] } });
    }
  }
  const squadNames = Object.keys(squads);
  const projectNames = Object.keys(projects);
  for (let i = 0; i < projectNames.length; i++) {
    await prisma.project.update({ where: { id: projects[projectNames[i]] }, data: { squadId: squads[squadNames[i % squadNames.length]] } });
  }
  console.log(`Squads: ${squadDefs.length} (todos os projetos distribuídos).`);

  // ---------- CRM: estágios + 24 oportunidades (dados completos de contrato) ----------
  const stageDefs = [
    { name: "Novo Lead", color: "#6b7280", isWon: false, isLost: false },
    { name: "Contato Feito", color: "#4b9fe1", isWon: false, isLost: false },
    { name: "Proposta Enviada", color: "#eab308", isWon: false, isLost: false },
    { name: "Negociação", color: "#a855f7", isWon: false, isLost: false },
    { name: "Ganho", color: "#3fb56f", isWon: true, isLost: false },
    { name: "Perdido", color: "#e14b4b", isWon: false, isLost: true },
  ];
  const stages: Record<string, string> = {};
  for (let i = 0; i < stageDefs.length; i++) {
    const created = await prisma.salesStage.create({ data: { ...stageDefs[i], position: i } });
    stages[stageDefs[i].name] = created.id;
  }
  const oppDefs = [
    { name: "Studio Vetor Arquitetura", contact: "Renata Vaz", stage: "Novo Lead", value: 4500, source: "Indicação", days: 20 },
    { name: "Café Raiz", contact: "Bruno Alencar", stage: "Novo Lead", value: 2800, source: "Instagram", days: 15 },
    { name: "Espaço Kids Alegria", contact: "Tatiane Rosa", stage: "Novo Lead", value: 2400, source: "Site", days: 25 },
    { name: "Oficina do Chef", contact: "Vinícius Prado", stage: "Novo Lead", value: 3600, source: "Google", days: 30 },
    { name: "Ótica Vista Bela", contact: "Sandra Melo", stage: "Contato Feito", value: 3200, source: "Site", days: 10 },
    { name: "Barbearia Nobre", contact: "Léo Fontes", stage: "Contato Feito", value: 2200, source: "Indicação", days: 12 },
    { name: "Studio Hair Glamour", contact: "Patrícia Melo", stage: "Contato Feito", value: 2600, source: "Instagram", days: 14 },
    { name: "Colégio Saber Viver", contact: "Direção Acadêmica", stage: "Contato Feito", value: 8800, source: "Indicação", days: 18 },
    { name: "Imobiliária Chave de Ouro", contact: "Marcelo Tavares", stage: "Proposta Enviada", value: 9000, source: "LinkedIn", days: 7 },
    { name: "Clínica Odonto Prime", contact: "Dra. Camila Reis", stage: "Proposta Enviada", value: 6500, source: "Site", days: 5 },
    { name: "Pousada Mar Azul", contact: "Rogério Santos", stage: "Proposta Enviada", value: 5200, source: "Google", days: 9 },
    { name: "Empório Natural", contact: "Luana Freitas", stage: "Proposta Enviada", value: 3100, source: "Instagram", days: 6 },
    { name: "Grupo Sabor & Cia", contact: "Fábio Ramalho", stage: "Negociação", value: 11000, source: "Indicação", days: 3 },
    { name: "Farmácia Bem Viver", contact: "Ana Paula Souza", stage: "Negociação", value: 4000, source: "Instagram", days: 4 },
    { name: "Transportadora Rota Sul", contact: "Cláudio Bastos", stage: "Negociação", value: 7200, source: "LinkedIn", days: 8 },
    { name: "Academia Corpo em Foco", contact: "Débora Luz", stage: "Negociação", value: 4800, source: "Site", days: 5 },
    { name: "Auto Peças Rodar Bem", contact: "Ricardo Nogueira", stage: "Ganho", value: 5500, source: "Indicação", days: -5 },
    { name: "Restaurante Fogo de Lenha", contact: "Seu Joaquim", stage: "Ganho", value: 3900, source: "Instagram", days: -8 },
    { name: "Clínica Sorriso Pleno", contact: "Dr. Henrique Vale", stage: "Ganho", value: 6100, source: "Indicação", days: -12 },
    { name: "Boutique Charme Fino", contact: "Elisa Camargo", stage: "Ganho", value: 3400, source: "Site", days: -15 },
    { name: "Espaço Zen Yoga", contact: "Priscila Andrade", stage: "Perdido", value: 1800, source: "Site", days: -10 },
    { name: "Padoca do Bairro", contact: "Nelson Dias", stage: "Perdido", value: 1500, source: "Google", days: -18 },
    { name: "Marmoraria Pedra Forte", contact: "Osvaldo Lima", stage: "Perdido", value: 2900, source: "Indicação", days: -22 },
    { name: "Loja Bem Casa", contact: "Regina Portes", stage: "Novo Lead", value: 3300, source: "Instagram", days: 28 },
  ] as const;
  const opportunities: Record<string, string> = {};
  for (let i = 0; i < oppDefs.length; i++) {
    const o = oppDefs[i];
    const isClosed = o.stage === "Ganho" || o.stage === "Perdido";
    const slug = o.name.toLowerCase().replace(/[^a-z]+/g, "");
    const created = await prisma.salesOpportunity.create({
      data: {
        name: o.name,
        contactName: o.contact,
        email: `contato@${slug}.com.br`,
        phone: `(11) 9${String(6100 + i * 89).slice(0, 4)}-${String(3000 + i * 77).slice(0, 4)}`,
        document: `${String(30 + i)}.${String(111 + i * 11).padStart(3, "0")}.${String(400 + i * 9).padStart(3, "0")}/0001-${String(20 + i)}`,
        address: `Av. ${["Central", "Paulista", "Brasil", "Atlântica", "das Nações"][i % 5]}, ${200 + i * 53}, São Paulo - SP`,
        monthlyValue: o.value,
        setupValue: o.stage === "Ganho" ? 1500 : null,
        source: o.source,
        notes: isClosed ? undefined : `Follow-up agendado, aguardando retorno sobre ${o.stage.toLowerCase()}.`,
        expectedCloseDate: daysFromNow(o.days),
        closedAt: isClosed ? daysFromNow(o.days) : null,
        lostReason: o.stage === "Perdido" ? "Optou por fechar com outra agência" : null,
        position: i,
        stageId: stages[o.stage],
        responsibleId: pickAssignee(i),
      },
    });
    opportunities[o.name] = created.id;
  }
  const now = new Date();
  await prisma.salesGoal.create({ data: { year: now.getFullYear(), month: now.getMonth() + 1, target: 8 } });
  console.log(`CRM: ${stageDefs.length} estágios, ${oppDefs.length} oportunidades, meta do mês.`);

  // ---------- Modelos de contrato (fábrica legal design) + modelos de quadro ----------
  for (const { kind } of TEMPLATE_KINDS) {
    const template = buildContractTemplate(kind, { ...DEFAULT_ANSWERS, permanenciaMeses: kind === "marketing-360" ? 6 : null, multaRompimento: kind === "marketing-360" ? "uma mensalidade" : "" });
    const existing = await prisma.contractTemplate.findFirst({ where: { name: template.name } });
    if (existing) await prisma.contractTemplate.update({ where: { id: existing.id }, data: { bodyJson: template.bodyJson, isDefault: kind === "redes-sociais" } });
    else await prisma.contractTemplate.create({ data: { ...template, isDefault: kind === "redes-sociais" } });
  }
  console.log(`Modelos de contrato: ${TEMPLATE_KINDS.length} (legal design).`);

  const boardTemplateDefs = [
    { name: "Onboarding de Cliente", isDefault: true, columns: [
      { name: "A Fazer", cards: ["Reunião de kickoff", "Coletar acessos", "Definir linha editorial", "Criar grupo no WhatsApp"] },
      { name: "Em Andamento", cards: ["Configurar ferramentas"] },
      { name: "Aprovação", cards: [] },
      { name: "Concluído", cards: [] },
    ] },
    { name: "Produção de Conteúdo", isDefault: false, columns: [
      { name: "Ideias", cards: ["Pauta do mês"] },
      { name: "Em Produção", cards: [] },
      { name: "Aprovação Cliente", cards: [] },
      { name: "Agendado", cards: [] },
      { name: "Publicado", cards: [] },
    ] },
    { name: "Campanha de Tráfego", isDefault: false, columns: [
      { name: "Briefing", cards: ["Definir objetivo e verba"] },
      { name: "Configuração", cards: [] },
      { name: "Rodando", cards: [] },
      { name: "Relatório", cards: [] },
    ] },
  ];
  for (const bt of boardTemplateDefs) {
    const created = await prisma.boardTemplate.create({ data: { name: bt.name, isDefault: bt.isDefault } });
    for (let ci = 0; ci < bt.columns.length; ci++) {
      const col = await prisma.boardTemplateColumn.create({ data: { name: bt.columns[ci].name, position: ci, templateId: created.id } });
      for (let ki = 0; ki < bt.columns[ci].cards.length; ki++) {
        await prisma.boardTemplateCard.create({ data: { title: bt.columns[ci].cards[ki], position: ki, columnId: col.id } });
      }
    }
  }
  console.log(`Modelos de quadro: ${boardTemplateDefs.length}.`);

  // ---------- Propostas (22, com pagamento, parcelas e visualizações) ----------
  const proposalStatuses = ["ACCEPTED", "SENT", "SENT", "DRAFT", "REJECTED", "CHANGES_REQUESTED"] as const;
  const proposalServicePool = [
    ["Gestão de Redes Sociais", 2500], ["Gestão de Instagram", 1900], ["Tráfego Pago (Meta Ads)", 3000],
    ["Landing Page", 2200], ["SEO", 2000], ["Marketing 360", 7500], ["Produção de Vídeo", 3500],
    ["Identidade Visual", 4500], ["E-mail Marketing", 1000],
  ] as const;
  const oppNames = oppDefs.map((o) => o.name);
  let proposalCount = 0;
  const acceptedProposals: { id: string; token: string; oppName: string }[] = [];
  for (let i = 0; i < 22; i++) {
    const status = proposalStatuses[i % proposalStatuses.length];
    const oppName = oppNames[i % oppNames.length];
    const nItems = (i % 2) + 1;
    const items = Array.from({ length: nItems }, (_, k) => proposalServicePool[(i + k * 3) % proposalServicePool.length]);
    const total = items.reduce((s, [, v]) => s + (v as number), 0);
    const parcelado = i % 3 === 0;
    const created = await prisma.salesProposal.create({
      data: {
        title: `Proposta - ${oppName}`,
        status,
        contactName: oppDefs[i % oppDefs.length].contact,
        notes: "Proposta gerada a partir do atendimento comercial. Valores válidos até a data indicada.",
        validUntil: daysFromNow(15 + (i % 20)),
        opportunityId: opportunities[oppName],
        createdById: pickAssignee(i),
        acceptedAt: status === "ACCEPTED" ? daysFromNow(-(i % 6) - 1) : null,
        signerName: status === "ACCEPTED" ? oppDefs[i % oppDefs.length].contact : null,
        changeRequestedAt: status === "CHANGES_REQUESTED" ? daysFromNow(-2) : null,
        changeRequestMessage: status === "CHANGES_REQUESTED" ? "Podemos rever o valor do pacote de vídeos? Ficou acima do orçamento." : null,
        paymentCondition: parcelado ? "INSTALLMENTS" : "CASH",
        installmentCount: parcelado ? 3 : null,
        setupFee: i % 4 === 0 ? 800 : null,
        paymentMethods: ["PIX,BOLETO", "PIX,CARD", "PIX,BOLETO,TRANSFER"][i % 3],
      },
    });
    await prisma.salesProposalItem.createMany({
      data: items.map(([description, unitValue], k) => ({
        proposalId: created.id,
        description: description as string,
        scope: `Escopo detalhado de ${description}: entregáveis, formatos e frequência conforme alinhado na reunião comercial.`,
        quantity: 1,
        unitValue: unitValue as number,
        position: k,
        billingType: "MONTHLY",
      })),
    });
    if (parcelado) {
      const parcela = Math.round(total / 3);
      await prisma.salesProposalInstallment.createMany({
        data: [0, 1, 2].map((k) => ({ proposalId: created.id, position: k, dueDate: daysFromNow(10 + k * 30), value: parcela })),
      });
    }
    const views = (i % 5) + 1;
    for (let v = 0; v < views; v++) {
      await prisma.proposalView.create({
        data: {
          proposalId: created.id,
          viewedAt: daysFromNow(-(v + 1), [10, 15, 20][v % 3], [5, 25, 45][v % 3]),
          durationSeconds: 40 + ((i + v) % 6) * 35,
          maxScrollPercent: [45, 70, 100][v % 3],
        },
      });
    }
    proposalCount++;
    if (status === "ACCEPTED") acceptedProposals.push({ id: created.id, token: created.token, oppName });
  }
  console.log(`Propostas: ${proposalCount} (status variados, parcelas, heatmap de visualização).`);

  // ---------- Contratos (20, em todos os estados, com corpo legal design) ----------
  const templates = await prisma.contractTemplate.findMany();
  const templateByName: Record<string, string> = {};
  for (const t of templates) templateByName[t.name] = t.bodyJson;
  const contractKinds = [
    "Gestão de Redes Sociais", "Gestão de Instagram", "Gestão de Tráfego Pago",
    "Gestão de Redes Sociais + Tráfego Pago", "Gestão de Marketing 360", "Criação de Conteúdo",
  ];
  const signerFonts = ["elegante", "fluida", "manuscrita", "descontraida"];
  const contractClients = clientNameList.filter((n) => n !== "Móveis Elegance");
  let contractCount = 0;
  for (let i = 0; i < 20; i++) {
    const clientName = contractClients[i % contractClients.length];
    const clientDef = clientDefs.find((c) => c.name === clientName)!;
    const kindName = contractKinds[i % contractKinds.length];
    // estados: 0-8 ativo, 9-13 aguardando agência, 14-17 aguardando cliente, 18-19 sem contrato
    const state = i < 9 ? "ativo" : i < 14 ? "aguardando-agencia" : i < 18 ? "aguardando-cliente" : "sem-contrato";
    const value = clientDef.monthlyValue;
    const startDate = daysFromNow(-30 * ((i % 6) + 1));
    const renewalDate = i === 0 ? daysFromNow(12) : i === 1 ? daysFromNow(-3) : daysFromNow(300 - i * 9);
    const client = await prisma.client.findUnique({ where: { id: clients[clientName] } });
    const vars: Record<string, string> = {
      "contratante.razao_social": client!.name,
      "contratante.nome_contato": client!.contactName ?? "-",
      "contratante.documento": client!.document ?? "-",
      "contratante.endereco": client!.address ?? "-",
      "contratante.email": client!.email ?? "-",
      "contratante.telefone": client!.phone ?? "-",
      "contratada.razao_social": companyData.name,
      "contratada.documento": companyData.document,
      "contratada.endereco": companyData.address,
      "contratada.email": companyData.email,
      "contratada.telefone": companyData.phone,
      "contratada.pix": companyData.pixKey,
      "servico.nome": kindName,
      "servico.escopo": `Escopo completo de ${kindName}, conforme proposta comercial aceita: entregáveis, formatos e frequência combinados com o cliente.`,
      "servico.valor": fmtBRL(value),
      "servico.periodo": PERIOD_LABEL.MONTHLY,
      "servico.data_inicio": fmtDate(startDate),
      "servico.data_renovacao": fmtDate(renewalDate),
      "data.hoje": fmtDate(new Date()),
    };
    const signedAt = state === "ativo" || state === "aguardando-agencia" ? daysFromNow(-((i % 10) + 1), 10 + (i % 8), [12, 33, 47][i % 3]) : null;
    await prisma.contractedService.create({
      data: {
        name: kindName,
        scope: vars["servico.escopo"],
        value,
        period: "MONTHLY",
        startDate,
        renewalDate,
        clientId: clients[clientName],
        contractBodyJson: state === "sem-contrato" ? null : (templateByName[kindName] ?? null),
        contractVariablesJson: state === "sem-contrato" ? null : JSON.stringify(vars),
        contractUrl: state === "sem-contrato" ? null : "gerado-na-tela",
        signedAt,
        signerName: signedAt ? clientDef.contactName : null,
        signerDocument: signedAt ? `${String(300 + i)}.${String(456 + i)}.${String(789 - i)}-${String(10 + i).slice(0, 2)}` : null,
        signerFont: signedAt ? signerFonts[i % signerFonts.length] : null,
        agencySignedAt: state === "ativo" ? daysFromNow(-(i % 8), 14, 20) : null,
        agencySignerName: state === "ativo" ? "Felipe Demo" : null,
      },
    });
    contractCount++;
  }
  console.log(`Contratos: ${contractCount} (ativos, aguardando agência, aguardando cliente e sem contrato).`);

  // ---------- Senhas (22 credenciais criptografadas) ----------
  const credentialDefs = [
    { label: "Instagram", url: "https://instagram.com", user: "@perfil" },
    { label: "Meta Business Suite", url: "https://business.facebook.com", user: "admin@" },
    { label: "Google Ads", url: "https://ads.google.com", user: "ads@" },
    { label: "Google Analytics", url: "https://analytics.google.com", user: "analytics@" },
    { label: "WordPress", url: "https://site.com/wp-admin", user: "editor" },
    { label: "Canva", url: "https://canva.com", user: "design@" },
    { label: "TikTok", url: "https://tiktok.com", user: "@perfil" },
    { label: "E-mail corporativo", url: "https://mail.google.com", user: "contato@" },
  ];
  for (let i = 0; i < 22; i++) {
    const clientName = clientNameList[i % clientNameList.length];
    const cred = credentialDefs[i % credentialDefs.length];
    const slug = clientName.toLowerCase().replace(/[^a-z]+/g, "");
    await prisma.clientCredential.create({
      data: {
        label: cred.label,
        username: cred.user.endsWith("@") ? `${cred.user}${slug}.com.br` : cred.user === "@perfil" ? `@${slug}` : cred.user,
        secretEnc: encryptSecret(`Demo@${slug.slice(0, 5)}${100 + i}`),
        url: cred.url,
        notes: "Acesso concedido pelo cliente no onboarding.",
        clientId: clients[clientName],
      },
    });
  }
  console.log("Senhas: 22 credenciais criptografadas.");

  // ---------- Links curtos (21) ----------
  const shortLinkDefs = [
    ["promo-inverno", "https://lojaaurora.com.br/colecao-inverno"], ["skincare", "https://pelebonita.com.br/lancamento"],
    ["cardapio", "https://saborcaseiro.com.br/cardapio"], ["demo-saas", "https://techflow.com.br/demo"],
    ["matricula", "https://vidafitness.com.br/matricula"], ["encomendas", "https://doceencanto.com.br/encomendas"],
    ["vista-alta", "https://horizonte.com.br/vista-alta"], ["agendar", "https://clinicabemestar.com.br/agenda"],
    ["consulta", "https://martinsesouza.adv.br/contato"], ["aula-gratis", "https://fluentidiomas.com.br/aula-gratis"],
    ["lookbook", "https://bellamoda.com.br/lookbook"], ["reservas", "https://sabordaserra.com.br/reservas"],
    ["avaliacao", "https://clinicavitalis.com.br/avaliacao"], ["catalogo-agro", "https://agroforte.com.br/catalogo"],
    ["aula-pilates", "https://corpoleve.com.br/experimental"], ["revisao", "https://autoveloz.com.br/revisao"],
    ["pacotes", "https://mirantedaserra.com.br/pacotes"], ["encomenda-pao", "https://paonosso.com.br/encomendas"],
    ["oculos", "https://visaoclara.com.br/loja"], ["pedidos", "https://bebidasja.com.br/pedidos"],
    ["orcamento", "https://orkestrya.com.br/orcamento"],
  ] as const;
  for (let i = 0; i < shortLinkDefs.length; i++) {
    await prisma.shortLink.create({
      data: { slug: shortLinkDefs[i][0], targetUrl: shortLinkDefs[i][1], clicks: 12 + ((i * 37) % 480), createdById: pickAssignee(i) },
    });
  }
  console.log(`Links curtos: ${shortLinkDefs.length}.`);

  // ---------- Formulários (6, com respostas) ----------
  const formDefs = [
    { title: "Briefing de Novo Cliente", client: "Loja Aurora", respostas: ["Loja Aurora", "Aumentar vendas online e engajamento.", "Varejo", "5"] },
    { title: "Pesquisa de Satisfação Mensal", client: "Pele Bonita Cosméticos", respostas: ["Pele Bonita", "Atendimento excelente, gostaria de mais vídeos.", "Saúde", "5"] },
    { title: "Briefing de Campanha Sazonal", client: "Vida Fitness Academia", respostas: ["Vida Fitness", "Campanha de matrículas de verão.", "Serviços", "4"] },
    { title: "Formulário de Pauta Mensal", client: "Sabor Caseiro Restaurante", respostas: ["Sabor Caseiro", "Divulgar novo cardápio executivo.", "Alimentação", "5"] },
    { title: "Avaliação de Entrega de Projeto", client: "TechFlow Soluções", respostas: ["TechFlow", "Landing page superou as expectativas.", "Serviços", "5"] },
    { title: "Briefing de Rebranding", client: "Padaria Pão Nosso", respostas: ["Pão Nosso", "Modernizar sem perder a tradição.", "Alimentação", "4"] },
  ] as const;
  for (const f of formDefs) {
    const form = await prisma.customForm.create({
      data: {
        title: f.title,
        description: "Formulário usado no relacionamento com o cliente.",
        active: true,
        clientId: clients[f.client],
        createdById: adminId,
        fields: {
          create: [
            { label: "Nome da empresa", type: "TEXT", required: true, position: 0 },
            { label: "Objetivo principal", type: "TEXTAREA", required: true, position: 1 },
            { label: "Segmento", type: "SELECT", required: true, position: 2, options: JSON.stringify(["Varejo", "Alimentação", "Saúde", "Serviços", "Outro"]) },
            { label: "Satisfação com a agência", type: "RATING", required: false, position: 3 },
          ],
        },
      },
      include: { fields: true },
    });
    const submission = await prisma.customFormSubmission.create({
      data: {
        formId: form.id,
        respondentName: clientDefs.find((c) => c.name === f.client)?.contactName ?? "Cliente",
        respondentEmail: `contato@${f.client.toLowerCase().replace(/[^a-z]+/g, "")}.com.br`,
      },
    });
    await prisma.customFormFieldResponse.createMany({
      data: form.fields.map((field, i) => ({ fieldId: field.id, submissionId: submission.id, value: f.respostas[i] })),
    });
  }
  console.log(`Formulários: ${formDefs.length} (com respostas).`);

  // ---------- Estratégia (3 clientes, imagens reais) ----------
  const strategyClients = ["Loja Aurora", "Pele Bonita Cosméticos", "TechFlow Soluções"] as const;
  const strategyDefs: Record<(typeof strategyClients)[number], {
    persona: Record<string, string>;
    diagnosis: Record<string, string | number>;
    competitors: { name: string; handle: string; followers: string; niche: string }[];
    positioning: Record<string, string>;
  }> = {
    "Loja Aurora": {
      persona: {
        name: "Camila, 32 anos", age: "28-38", location: "São Paulo, SP", occupation: "Profissional liberal CLT",
        incomeLevel: "R$ 4.000 - R$ 7.000", painPoints: "Falta de tempo para pesquisar looks, medo de errar no tamanho.",
        desires: "Se sentir estilosa e confiante sem gastar muito tempo.", goals: "Renovar o guarda-roupa a cada estação.",
        objections: "Preço, prazo de entrega.", buyingTriggers: "Promoções, indicação de amigas, provador virtual.",
      },
      diagnosis: { instagramHandle: "@lojaaurora", audience: "Mulheres 25-40 anos, classe B/C", positioning: "Moda acessível com curadoria",
        contentPillars: "Lançamentos, looks do dia, bastidores, promoções", strengths: "Engajamento alto em Reels", weaknesses: "Baixa frequência de Stories",
        avgLikes: 340, avgComments: 22, avgShares: 8, storyInteraction: "Alta em enquetes", rating: "Boa", recommendations: "Aumentar frequência de Stories interativos." },
      competitors: [
        { name: "Moda Bella", handle: "@modabella", followers: "18k", niche: "Moda feminina" },
        { name: "Estilo Urbano", handle: "@estilourbano", followers: "12k", niche: "Moda casual" },
      ],
      positioning: { niche: "Moda feminina acessível", archetypePrimary: "AMANTE", archetypeSecondary: "CRIADOR",
        essence: "Estilo que cabe no seu dia a dia e no seu bolso.", personalityTraits: "Acolhedora, estilosa, próxima",
        communicationStyle: "Descontraído e inspirador", toneOfVoice: "Amigável", toneExample: "Chegou o look que vai virar seu favorito!",
        colorPalette: "Tons terrosos e pastéis", typography: "Sans-serif arredondada", visualStyle: "Fotos naturais, luz quente" },
    },
    "Pele Bonita Cosméticos": {
      persona: {
        name: "Fernanda, 29 anos", age: "22-35", location: "Rio de Janeiro, RJ", occupation: "Empreendedora digital",
        incomeLevel: "R$ 5.000 - R$ 9.000", painPoints: "Pele sensível, dificuldade em encontrar produtos veganos e eficazes.",
        desires: "Rotina de skincare simples e resultados visíveis.", goals: "Ter uma pele saudável e luminosa.",
        objections: "Ingredientes desconhecidos, preço elevado.", buyingTriggers: "Reviews de influenciadoras, antes/depois.",
      },
      diagnosis: { instagramHandle: "@pelebonitacosmeticos", audience: "Mulheres 20-40 anos, interessadas em skincare",
        positioning: "Cosméticos veganos de alta performance", contentPillars: "Educação sobre ingredientes, antes/depois, lançamentos",
        strengths: "Comunidade engajada", weaknesses: "Pouco conteúdo educativo em vídeo",
        avgLikes: 520, avgComments: 41, avgShares: 15, storyInteraction: "Muito alta", rating: "Excelente", recommendations: "Investir em vídeo curto educativo." },
      competitors: [
        { name: "Pura Essência", handle: "@puraessencia", followers: "45k", niche: "Cosméticos naturais" },
        { name: "Glow Skincare", handle: "@glowskincare", followers: "30k", niche: "Skincare" },
      ],
      positioning: { niche: "Skincare vegano premium", archetypePrimary: "SABIO", archetypeSecondary: "CUIDADOR",
        essence: "Ciência e cuidado a favor da sua pele.", personalityTraits: "Confiável, cuidadosa, moderna",
        communicationStyle: "Educativo e acolhedor", toneOfVoice: "Confiante e gentil", toneExample: "Sua pele merece ingredientes que ela entende.",
        colorPalette: "Verde sálvia, branco, dourado", typography: "Serif elegante", visualStyle: "Minimalista, foco no produto" },
    },
    "TechFlow Soluções": {
      persona: {
        name: "Rodrigo, 38 anos", age: "30-50", location: "Belo Horizonte, MG", occupation: "Diretor de TI",
        incomeLevel: "R$ 15.000+", painPoints: "Processos manuais, falta de integração entre sistemas.",
        desires: "Eficiência operacional e redução de custos.", goals: "Automatizar processos críticos em 6 meses.",
        objections: "Tempo de implementação, curva de aprendizado.", buyingTriggers: "Case de sucesso, demonstração gratuita.",
      },
      diagnosis: { instagramHandle: "@techflowsolucoes", audience: "Gestores de TI e operações, B2B", positioning: "Software de automação empresarial",
        contentPillars: "Cases de sucesso, tutoriais, novidades", strengths: "Autoridade técnica", weaknesses: "Baixo alcance orgânico",
        avgLikes: 90, avgComments: 6, avgShares: 12, storyInteraction: "Baixa", rating: "Regular", recommendations: "Investir em LinkedIn Ads." },
      competitors: [
        { name: "FlowBiz", handle: "@flowbiz", followers: "8k", niche: "Automação B2B" },
        { name: "Nexus Systems", handle: "@nexussystems", followers: "5k", niche: "Software empresarial" },
      ],
      positioning: { niche: "Automação de processos B2B", archetypePrimary: "MAGO", archetypeSecondary: "GOVERNANTE",
        essence: "Transformamos complexidade em eficiência.", personalityTraits: "Confiável, técnica, visionária",
        communicationStyle: "Direto e técnico", toneOfVoice: "Profissional", toneExample: "Reduza 40% do tempo operacional com automação.",
        colorPalette: "Azul petróleo, cinza, branco", typography: "Sans-serif geométrica", visualStyle: "Corporativo, gráficos e dados" },
    },
  };
  for (const clientName of strategyClients) {
    const clientId = clients[clientName];
    const def = strategyDefs[clientName];
    const slug = clientName.toLowerCase().replace(/[^a-z]+/g, "");
    await prisma.persona.create({ data: { ...def.persona, clientId } });
    await prisma.profileDiagnosis.create({ data: { ...def.diagnosis, clientId } });
    for (let i = 0; i < def.competitors.length; i++) {
      const c = def.competitors[i];
      await prisma.competitor.create({
        data: {
          name: c.name, handle: c.handle, followers: c.followers, niche: c.niche, position: i,
          type: "Direto", sells: "Produtos e serviços similares", frequency: "3-5 posts/semana",
          differential: "Preço mais competitivo", strengths: "Bom engajamento", weaknesses: "Pouca variedade de conteúdo",
          opportunities: "Explorar formatos em vídeo", clientId,
        },
      });
    }
    const positioning = await prisma.positioning.create({ data: { ...def.positioning, clientId } });
    await prisma.positioningImage.create({ data: { url: photo(`${slug}-pos`, 900, 600), position: 0, positioningId: positioning.id } });
    const keyVisual = await prisma.keyVisual.create({
      data: {
        clientId,
        colors: def.positioning.colorPalette,
        primaryFont: def.positioning.typography,
        secondaryFont: "Sans-serif complementar",
        layoutNotes: "Manter respiro generoso e hierarquia clara entre título e texto de apoio.",
        guidelines: "Logo sempre com área de proteção mínima de 20px.",
        doNotes: "Usar sobre fundos com bom contraste.",
        dontNotes: "Não distorcer o logo ou aplicar sobre fundos poluídos.",
      },
    });
    await prisma.keyVisualImage.create({ data: { url: photo(`${slug}-kv`, 800, 800), category: "logo", position: 0, keyVisualId: keyVisual.id } });
    const moodboard = await prisma.moodboard.create({
      data: { clientId, description: "Referências visuais para orientar produção de conteúdo e campanhas." },
    });
    await prisma.moodboardImage.createMany({
      data: [0, 1, 2, 3, 4, 5].map((i) => ({ url: photo(`${slug}-mood-${i}`, 700, 700), position: i, moodboardId: moodboard.id })),
    });
  }
  console.log(`Estratégia: personas, diagnósticos, posicionamento, key visual e moodboard (imagens reais) para ${strategyClients.length} clientes.`);

  // ---------- Chat ----------
  const internalChannelDefs = [
    { name: "Geral", kind: "GROUP" as const, sector: null, color: "#6b7280" },
    { name: "Criação", kind: "SECTOR" as const, sector: "Criação", color: "#a855f7" },
    { name: "Atendimento", kind: "SECTOR" as const, sector: "Atendimento", color: "#4b9fe1" },
  ];
  const staffUserIds = [adminId, ...userDefs.map((u) => users[u.name])].filter((id): id is string => !!id);
  const chatMessages = [
    "Bom dia, pessoal! Vamos alinhar as prioridades da semana.",
    "Já enviei os materiais da campanha da Loja Aurora para aprovação.",
    "Alguém pode revisar o cronograma do cliente TechFlow?",
    "Reunião com a Clínica Vitalis remarcada para amanhã às 10h.",
    "O contrato da Bella Moda foi assinado agora há pouco!",
    "Parabéns, time! Batemos a meta de propostas do mês.",
    "Subindo os criativos novos da Vida Fitness ainda hoje.",
    "O cliente do Hotel Mirante amou o ensaio fotográfico.",
    "Lembrete: fechamento financeiro é sexta-feira.",
    "Quem cuida do relatório da AgroForte esse mês?",
    "Eu pego o relatório da AgroForte, pode deixar.",
    "A campanha de matrículas está com CPL 30% abaixo da meta.",
    "Post do Sabor da Serra agendado pra sexta às 18h.",
    "Alguém tem o acesso do Canva da Doce Encanto?",
    "Está no cofre de senhas, aba do cliente.",
    "Novo lead quente no CRM: Colégio Saber Viver.",
    "Kickoff do rebranding da Pão Nosso marcado pra quinta.",
    "Faltam 2 aprovações de posts pra fechar a pauta da semana.",
    "Cliente aprovou tudo pelo link, pode agendar.",
    "Time de vídeo: captação no Auto Center confirmada pra terça 9h.",
    "Já deixei o roteiro na pasta do projeto.",
    "Ótima semana pra todos, vamos com tudo!",
  ];
  for (const c of internalChannelDefs) {
    const created = await prisma.chatChannel.create({ data: { name: c.name, kind: c.kind, sector: c.sector, color: c.color } });
    for (const userId of staffUserIds) {
      await prisma.chatChannelMember.create({ data: { channelId: created.id, userId, pinned: c.name === "Geral" } });
    }
    const msgs = c.name === "Geral" ? chatMessages : chatMessages.slice(0, 6);
    for (let i = 0; i < msgs.length; i++) {
      await prisma.chatMessage.create({
        data: {
          channelId: created.id,
          text: msgs[i],
          authorUserId: staffUserIds[i % staffUserIds.length],
          createdAt: daysFromNow(-Math.ceil((msgs.length - i) / 3), 9 + (i % 9), [4, 18, 31, 47][i % 4]),
        },
      });
    }
  }
  const clientChatDefs = ["Loja Aurora", "Pele Bonita Cosméticos", "TechFlow Soluções", "Bella Moda Boutique", "Clínica Vitalis", "Hotel Mirante da Serra"] as const;
  for (const clientName of clientChatDefs) {
    const clientId = clients[clientName];
    const created = await prisma.chatChannel.create({ data: { name: clientName, kind: "CLIENT", clientId } });
    await prisma.chatChannelMember.create({ data: { channelId: created.id, userId: staffUserIds[0], pinned: true } });
    await prisma.chatMessage.create({
      data: { channelId: created.id, text: "Olá! Como está o andamento das entregas desta semana?", authorClientId: clientId, createdAt: daysFromNow(-2, 10, 15) },
    });
    await prisma.chatMessage.create({
      data: { channelId: created.id, text: "Oi! Está tudo dentro do prazo, os materiais já foram enviados pra aprovação no link.", authorUserId: staffUserIds[0], createdAt: daysFromNow(-2, 11, 2) },
    });
    await prisma.chatMessage.create({
      data: { channelId: created.id, text: "Perfeito, vou aprovar ainda hoje. Obrigado!", authorClientId: clientId, createdAt: daysFromNow(-1, 9, 40) },
    });
  }
  console.log(`Chat: ${internalChannelDefs.length} canais internos + ${clientChatDefs.length} canais de cliente.`);

  // ---------- Portal do cliente (3 clientes com login) ----------
  const portalClients = ["Loja Aurora", "Bella Moda Boutique", "Clínica Vitalis"] as const;
  for (const clientName of portalClients) {
    const slug = clientName.toLowerCase().replace(/[^a-z]+/g, "");
    await prisma.client.update({
      where: { id: clients[clientName] },
      data: {
        portalEnabled: true,
        portalEmail: `portal@${slug}.com.br`,
        portalPasswordHash: demoPasswordHash,
        portalSlug: slug,
      },
    });
  }
  console.log(`Portal do cliente: ${portalClients.length} clientes com acesso (senha demo1234).`);

  console.log("\n========================================");
  console.log("SEED DEMO COMPLETO!");
  console.log("Login do sistema: demo@orkestrya.com.br / demo1234");
  console.log(`Portal do cliente: portal@lojaaurora.com.br / demo1234`);
  console.log("========================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
