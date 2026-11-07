export type CommemorativeCategory = "nacional" | "internacional" | "comercial";

export type CommemorativeDate = {
  month: number; // 1-12
  day: number;
  title: string;
  category: CommemorativeCategory;
  note?: string;
};

export const CATEGORY_LABELS: Record<CommemorativeCategory, string> = {
  nacional: "Nacional",
  internacional: "Internacional",
  comercial: "Comercial",
};

export const CATEGORY_COLORS: Record<CommemorativeCategory, string> = {
  nacional: "#3fb56f",
  internacional: "#3b82f6",
  comercial: "#eab308",
};

// Datas fixas: mesmo dia todo ano.
const FIXED_DATES: CommemorativeDate[] = [
  // Janeiro
  { month: 1, day: 1, title: "Ano Novo", category: "nacional" },
  { month: 1, day: 6, title: "Dia de Reis", category: "internacional" },
  { month: 1, day: 25, title: "Aniversário de São Paulo", category: "nacional" },
  { month: 1, day: 30, title: "Dia da Saudade", category: "comercial" },

  // Fevereiro
  { month: 2, day: 2, title: "Dia de Iemanjá", category: "nacional" },
  { month: 2, day: 13, title: "Dia Mundial do Rádio", category: "internacional" },
  { month: 2, day: 14, title: "Dia dos Namorados (internacional)", category: "internacional" },
  { month: 2, day: 21, title: "Dia Internacional da Língua Materna", category: "internacional" },

  // Março
  { month: 3, day: 8, title: "Dia Internacional da Mulher", category: "internacional" },
  { month: 3, day: 15, title: "Dia do Consumidor", category: "comercial" },
  { month: 3, day: 20, title: "Dia Mundial da Felicidade", category: "internacional" },
  { month: 3, day: 21, title: "Dia Internacional pela Eliminação da Discriminação Racial", category: "internacional" },
  { month: 3, day: 21, title: "Dia Mundial da Poesia", category: "internacional" },
  { month: 3, day: 22, title: "Dia Mundial da Água", category: "internacional" },
  { month: 3, day: 27, title: "Dia Mundial do Teatro", category: "internacional" },

  // Abril
  { month: 4, day: 7, title: "Dia Mundial da Saúde", category: "internacional" },
  { month: 4, day: 18, title: "Dia Nacional do Livro Infantil", category: "nacional" },
  { month: 4, day: 19, title: "Dia dos Povos Indígenas (Brasil)", category: "nacional" },
  { month: 4, day: 21, title: "Tiradentes", category: "nacional" },
  { month: 4, day: 22, title: "Descobrimento do Brasil", category: "nacional" },
  { month: 4, day: 23, title: "Dia Mundial do Livro", category: "internacional" },
  { month: 4, day: 29, title: "Dia Internacional da Dança", category: "internacional" },

  // Maio
  { month: 5, day: 1, title: "Dia do Trabalho", category: "nacional" },
  { month: 5, day: 3, title: "Dia Mundial da Liberdade de Imprensa", category: "internacional" },
  { month: 5, day: 12, title: "Dia do Enfermeiro", category: "comercial" },
  { month: 5, day: 13, title: "Dia da Abolição da Escravidão", category: "nacional" },
  { month: 5, day: 15, title: "Dia Internacional das Famílias", category: "internacional" },
  { month: 5, day: 18, title: "Dia Nacional de Combate ao Abuso e Exploração de Crianças e Adolescentes", category: "nacional" },
  { month: 5, day: 31, title: "Dia Mundial Sem Tabaco", category: "internacional" },

  // Junho
  { month: 6, day: 5, title: "Dia Mundial do Meio Ambiente", category: "internacional" },
  { month: 6, day: 8, title: "Dia Mundial dos Oceanos", category: "internacional" },
  { month: 6, day: 12, title: "Dia dos Namorados", category: "comercial" },
  { month: 6, day: 13, title: "Dia de Santo Antônio", category: "nacional" },
  { month: 6, day: 19, title: "Dia do Cinema Brasileiro", category: "nacional" },
  { month: 6, day: 21, title: "Dia Mundial da Música", category: "internacional" },
  { month: 6, day: 24, title: "São João (Festas Juninas)", category: "nacional" },

  // Julho
  { month: 7, day: 4, title: "Independência dos Estados Unidos", category: "internacional" },
  { month: 7, day: 11, title: "Dia Mundial da População", category: "internacional" },
  { month: 7, day: 13, title: "Dia do Rock", category: "comercial" },
  { month: 7, day: 20, title: "Dia do Amigo", category: "comercial" },
  { month: 7, day: 26, title: "Dia dos Avós", category: "comercial" },
  { month: 7, day: 27, title: "Dia do Orgulho Nerd", category: "comercial" },
  { month: 7, day: 30, title: "Dia Internacional da Amizade (ONU)", category: "internacional" },

  // Agosto
  { month: 8, day: 9, title: "Dia Internacional dos Povos Indígenas (ONU)", category: "internacional" },
  { month: 8, day: 12, title: "Dia Internacional da Juventude", category: "internacional" },
  { month: 8, day: 19, title: "Dia Mundial da Fotografia", category: "internacional" },
  { month: 8, day: 25, title: "Dia do Soldado", category: "nacional" },

  // Setembro
  { month: 9, day: 5, title: "Dia da Amazônia", category: "nacional" },
  { month: 9, day: 7, title: "Independência do Brasil", category: "nacional" },
  { month: 9, day: 8, title: "Dia Internacional da Alfabetização", category: "internacional" },
  { month: 9, day: 15, title: "Dia do Cliente", category: "comercial" },
  { month: 9, day: 21, title: "Dia da Árvore / Início da Primavera", category: "nacional" },
  { month: 9, day: 22, title: "Dia Mundial sem Carro", category: "internacional" },
  { month: 9, day: 27, title: "Dia Mundial do Turismo", category: "internacional" },

  // Outubro
  { month: 10, day: 1, title: "Outubro Rosa (mês de conscientização)", category: "nacional", note: "Prevenção ao câncer de mama, campanha o mês todo" },
  { month: 10, day: 4, title: "Dia Mundial dos Animais", category: "internacional" },
  { month: 10, day: 10, title: "Dia Mundial da Saúde Mental", category: "internacional" },
  { month: 10, day: 12, title: "Nossa Sra. Aparecida / Dia das Crianças", category: "nacional" },
  { month: 10, day: 15, title: "Dia do Professor", category: "comercial" },
  { month: 10, day: 16, title: "Dia Mundial da Alimentação", category: "internacional" },
  { month: 10, day: 24, title: "Dia das Nações Unidas", category: "internacional" },
  { month: 10, day: 31, title: "Halloween", category: "internacional" },

  // Novembro
  { month: 11, day: 1, title: "Novembro Azul (mês de conscientização)", category: "nacional", note: "Prevenção ao câncer de próstata, campanha o mês todo" },
  { month: 11, day: 2, title: "Dia de Finados", category: "nacional" },
  { month: 11, day: 11, title: "Dia dos Solteiros (Singles Day)", category: "comercial" },
  { month: 11, day: 15, title: "Proclamação da República", category: "nacional" },
  { month: 11, day: 19, title: "Dia da Bandeira", category: "nacional" },
  { month: 11, day: 20, title: "Dia da Consciência Negra", category: "nacional" },
  { month: 11, day: 25, title: "Dia Internacional pela Eliminação da Violência contra a Mulher", category: "internacional" },

  // Dezembro
  { month: 12, day: 1, title: "Dia Mundial de Luta contra a Aids", category: "internacional" },
  { month: 12, day: 3, title: "Dia Internacional da Pessoa com Deficiência", category: "internacional" },
  { month: 12, day: 10, title: "Dia Internacional dos Direitos Humanos", category: "internacional" },
  { month: 12, day: 24, title: "Véspera de Natal", category: "comercial" },
  { month: 12, day: 25, title: "Natal", category: "nacional" },
  { month: 12, day: 31, title: "Véspera de Ano Novo (Réveillon)", category: "comercial" },
];

// --- Datas móveis: calculadas a partir do ano ---

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** N-ésimo dia da semana (0=domingo) de um mês. */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (n - 1) * 7);
}

function toEntry(date: Date, title: string, category: CommemorativeCategory, note?: string): CommemorativeDate {
  return { month: date.getMonth() + 1, day: date.getDate(), title, category, note };
}

function computeMovableDates(year: number): CommemorativeDate[] {
  const easter = computeEaster(year);
  const carnavalTuesday = addDays(easter, -47);
  const goodFriday = addDays(easter, -2);
  const corpusChristi = addDays(easter, 60);
  const mothersDay = nthWeekdayOfMonth(year, 4, 0, 2); // 2º domingo de maio
  const fathersDay = nthWeekdayOfMonth(year, 7, 0, 2); // 2º domingo de agosto
  const blackFridayThursday = nthWeekdayOfMonth(year, 10, 4, 4); // 4ª quinta de novembro (Thanksgiving)
  const blackFriday = addDays(blackFridayThursday, 1);
  const cyberMonday = addDays(blackFriday, 3);

  return [
    toEntry(carnavalTuesday, "Carnaval", "nacional", "Segunda e terça de Carnaval"),
    toEntry(goodFriday, "Sexta-feira Santa", "nacional"),
    toEntry(easter, "Páscoa", "internacional"),
    toEntry(corpusChristi, "Corpus Christi", "nacional"),
    toEntry(mothersDay, "Dia das Mães", "nacional"),
    toEntry(fathersDay, "Dia dos Pais", "nacional"),
    toEntry(blackFridayThursday, "Ação de Graças (EUA)", "internacional"),
    toEntry(blackFriday, "Black Friday", "comercial"),
    toEntry(cyberMonday, "Cyber Monday", "comercial"),
  ];
}

export function getCommemorativeDates(year: number): CommemorativeDate[] {
  return [...FIXED_DATES, ...computeMovableDates(year)].sort((a, b) => a.month - b.month || a.day - b.day);
}

export function getDatesForMonth(year: number, month: number): CommemorativeDate[] {
  return getCommemorativeDates(year).filter((d) => d.month === month);
}
