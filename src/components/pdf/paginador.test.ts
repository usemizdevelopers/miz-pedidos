import { describe, expect, it } from "vitest";
import { distribuir } from "./paginador";

/** Blocos empilhados com as alturas dadas. */
function medidas(alturas: number[]) {
  let y = 0;
  return alturas.map((h) => {
    const m = { topo: y, base: y + h };
    y += h;
    return m;
  });
}

describe("paginação", () => {
  it("enche a página e passa o bloco que não cabe inteiro para a próxima", () => {
    const b = [{}, {}, {}, {}];
    expect(distribuir(b, medidas([40, 40, 30, 50]), 100)).toEqual([[0, 1], [2, 3]]);
  });

  it("página inteira fica sozinha", () => {
    const b = [{ inteira: true }, {}, {}];
    expect(distribuir(b, medidas([0, 30, 30]), 100)).toEqual([[0], [1, 2]]);
  });

  it("bloco 'junto' desce com o seguinte (título não fica órfão)", () => {
    const b = [{}, {}, { junto: true }, {}];
    expect(distribuir(b, medidas([40, 30, 20, 40]), 100)).toEqual([[0, 1], [2, 3]]);
  });

  it("quebra preferida: só quebra se a página já passou da metade", () => {
    const b = [{}, { quebra: true }, {}];
    expect(distribuir(b, medidas([60, 20, 10]), 100)).toEqual([[0], [1, 2]]);
    expect(distribuir(b, medidas([30, 20, 10]), 100)).toEqual([[0, 1, 2]]);
  });

  it("conteúdo seguinte sobe: nenhuma página quebra sem necessidade", () => {
    const b = Array.from({ length: 10 }, () => ({}));
    const paginas = distribuir(b, medidas(Array(10).fill(25)), 100);
    expect(paginas.map((p) => p.length)).toEqual([4, 4, 2]);
  });
});
