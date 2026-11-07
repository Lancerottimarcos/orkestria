/**
 * Escopo de clientes visíveis por um MEMBER - útil hoje pra freelancer/
 * subcontratado que só deveria enxergar a própria conta. Mesma semântica de
 * moduleAccess (src/lib/modules.ts): null = sem restrição, vê todos.
 *
 * Aplicado hoje só à listagem/ficha do módulo "clientes" - não é um
 * multi-tenant retrofit (Kanban, Financeiro e demais módulos continuam
 * controlados só por módulo, não por cliente).
 */
export function resolveClientAccess(
  role: "ADMIN" | "MEMBER",
  clientAccessJson: string | null | undefined,
): string[] | null {
  if (role === "ADMIN") return null;
  if (clientAccessJson == null) return null;
  try {
    const parsed = JSON.parse(clientAccessJson);
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is string => typeof id === "string");
    }
  } catch {
    // sem restrição em caso de dado corrompido
  }
  return null;
}

export function hasClientAccess(
  role: "ADMIN" | "MEMBER",
  clientAccessJson: string | null | undefined,
  clientId: string,
): boolean {
  const allowed = resolveClientAccess(role, clientAccessJson);
  return allowed === null || allowed.includes(clientId);
}
