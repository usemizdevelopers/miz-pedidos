// Dinheiro sempre em centavos inteiros. Nunca usar ponto flutuante para valores.

/** Converte texto digitado ("49,99", "1.199,80", "R$ 49.99", "50") em centavos. */
export function paraCentavos(texto: string): number | null {
  const s = texto.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!s) return null;

  let inteiro: string;
  let decimal = "";

  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(s) || /^\d+(,\d{1,2})?$/.test(s)) {
    [inteiro, decimal = ""] = s.replace(/\./g, "").split(",");
  } else if (/^\d+\.\d{1,2}$/.test(s)) {
    [inteiro, decimal] = s.split(".");
  } else {
    return null;
  }

  const centavos = Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
  return Number.isSafeInteger(centavos) ? centavos : null;
}

/** 61241 → "R$ 612,41" */
export function formatarBRL(centavos: number): string {
  return `R$ ${formatarValor(centavos)}`;
}

/** 61241 → "612,41" (sem símbolo) */
export function formatarValor(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(Math.trunc(centavos));
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const cents = (abs % 100).toString().padStart(2, "0");
  return `${negativo ? "-" : ""}${reais},${cents}`;
}
