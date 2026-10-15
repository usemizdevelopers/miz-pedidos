// CNPJ numérico e alfanumérico (Receita, a partir de jul/2026): 12 posições [A-Z0-9] + 2 dígitos verificadores.
// Valor de cada caractere = código ASCII − 48 ("0"→0 … "9"→9, "A"→17 … "Z"→42).

const PESOS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/** Remove máscara e deixa maiúsculo: "12.abc.345/01de-35" → "12ABC34501DE35" */
export function normalizarCnpj(texto: string): string {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function digito(base: string, pesos: number[]): number {
  const soma = [...base].reduce((s, ch, i) => s + (ch.charCodeAt(0) - 48) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cnpjValido(texto: string): boolean {
  const c = normalizarCnpj(texto);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(c) || /^(.)\1{13}$/.test(c)) return false;
  const d1 = digito(c.slice(0, 12), PESOS_1);
  const d2 = digito(c.slice(0, 12) + d1, PESOS_2);
  return c.endsWith(`${d1}${d2}`);
}

/** "11222333000181" → "11.222.333/0001-81" */
export function formatarCnpj(texto: string | null | undefined): string {
  const c = normalizarCnpj(texto ?? "");
  if (c.length !== 14) return texto ?? "";
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}
