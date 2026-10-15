import { describe, expect, it } from "vitest";
import { formatarBRL, paraCentavos } from "./dinheiro";

describe("paraCentavos", () => {
  it.each([
    ["49,99", 4999],
    ["49.99", 4999],
    ["R$ 49,99", 4999],
    ["1.199,80", 119980],
    ["1199,8", 119980],
    ["50", 5000],
    ["3.000", 300000],
    ["0,05", 5],
  ])("%s → %i", (entrada, esperado) => {
    expect(paraCentavos(entrada)).toBe(esperado);
  });

  it.each(["", "abc", "49,999", "1,199.80", "-5"])("rejeita %j", (entrada) => {
    expect(paraCentavos(entrada)).toBeNull();
  });
});

describe("formatarBRL", () => {
  it.each([
    [61241, "R$ 612,41"],
    [734890, "R$ 7.348,90"],
    [1779514, "R$ 17.795,14"],
    [5, "R$ 0,05"],
    [0, "R$ 0,00"],
  ])("%i → %s", (centavos, esperado) => {
    expect(formatarBRL(centavos)).toBe(esperado);
  });
});
