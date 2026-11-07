const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function ensureUniqueSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || "cliente";
  let candidate = root;
  let suffix = 2;
  while (await isTaken(candidate)) {
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
