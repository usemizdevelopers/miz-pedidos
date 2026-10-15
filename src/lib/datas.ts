const FUSO = "America/Sao_Paulo";

/** Data de hoje em São Paulo, "AAAA-MM-DD". */
export function hojeSP(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

/** "2026-10-20" → "20/10/2026" (ou "20/10" com curta = true). */
export function formatarData(iso: string | null | undefined, curta = false): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return curta ? `${d}/${m}` : `${d}/${m}/${a}`;
}

/** Timestamp → "15/10/2026 14:32" no fuso de São Paulo. */
export function formatarDataHora(ts: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, dateStyle: "short", timeStyle: "short" }).format(new Date(ts));
}

export function estaVencida(validade: string | null, hoje = hojeSP()): boolean {
  return !validade || validade < hoje;
}
