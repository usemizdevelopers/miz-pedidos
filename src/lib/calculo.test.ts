import { describe, expect, it } from "vitest";
import { aplicarMarkup, calcularItem, calcularPedido, dividirArredondado, lucroNaPeca, type ItemEntrada } from "./calculo";
import { ITENS_DULCINEA, PARAMETROS_DULCINEA } from "./fixtures/dulcinea";

const dulcinea = calcularPedido(ITENS_DULCINEA, PARAMETROS_DULCINEA);
const linha = (nome: string) => dulcinea.imediato.linhas.find((l) => l.pecaNome === nome)!;

describe("Caso Dulcinéa (deve bater ao centavo)", () => {
  it.each([
    ["Blusa Mia", 3, 15, 74985, 24995],
    ["Blusa Mia Tule", 4, 20, 119980, 29995],
    ["Camiseta Oversize Liz", 4, 20, 119980, 29995],
    ["Blusa Renda Maria", 2, 10, 79990, 39995],
    ["Blusa Barrada Olívia", 2, 10, 79990, 39995],
    ["Regata Chloé", 4, 20, 109980, 27495],
    ["Vestido Detalhe Ribana Chloé", 3, 15, 149985, 49995],
  ])("%s: %i grades, %i peças, subtotal %i, grade %i", (nome, grades, pecas, subtotal, valorGrade) => {
    const l = linha(nome);
    expect(l.grades).toBe(grades);
    expect(l.pecas).toBe(pecas);
    expect(l.subtotalCentavos).toBe(subtotal);
    expect(l.valorGradeCentavos).toBe(valorGrade);
  });

  it("envio imediato: 22 grades, 110 peças, R$ 7.348,90 → 6x R$ 1.224,82", () => {
    expect(dulcinea.imediato.grades).toBe(22);
    expect(dulcinea.imediato.pecas).toBe(110);
    expect(dulcinea.imediato.totalCentavos).toBe(734890);
    expect(dulcinea.imediato.parcelaCentavos).toBe(122482);
    expect(dulcinea.imediato.linhas).toHaveLength(7);
  });

  it("reservado: Regata Canelada Basic, 4 grades, 20 peças, R$ 739,80 → 6x R$ 123,30, chega 20/10", () => {
    const r = dulcinea.reservado;
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].pecaNome).toBe("Regata Canelada Basic");
    expect(r.linhas[0].valorGradeCentavos).toBe(18495);
    expect(r.grades).toBe(4);
    expect(r.pecas).toBe(20);
    expect(r.totalCentavos).toBe(73980);
    expect(r.parcelaCentavos).toBe(12330);
    expect(r.previsao).toBe("2026-10-20");
  });

  it("total do pedido: 26 grades, 130 peças, R$ 8.088,70", () => {
    expect(dulcinea.grades).toBe(26);
    expect(dulcinea.pecas).toBe(130);
    expect(dulcinea.totalCentavos).toBe(808870);
  });

  it("vira na loja (2,2x): R$ 17.795,14; lucro bruto R$ 9.706,44", () => {
    expect(dulcinea.vendaEstimadaCentavos).toBe(1779514);
    expect(dulcinea.lucroBrutoCentavos).toBe(970644);
  });

  it("cenário conservador (×0,94): R$ 16.727,43; lucro R$ 8.638,73", () => {
    expect(dulcinea.vendaConservadorCentavos).toBe(1672743);
    expect(dulcinea.lucroConservadorCentavos).toBe(863873);
  });

  it("lucro na 3ª peça (grade 5 predominante), frete grátis no 1º pedido", () => {
    expect(dulcinea.lucroNaPeca).toBe(3);
    expect(dulcinea.gradesPresentes).toEqual([{ composicao: "2P + 2M + 1G", pecasPorGrade: 5, lucroNaPeca: 3 }]);
    expect(dulcinea.frete).toBe("gratis");
  });

  it("etiqueta sugerida da Blusa Mia: R$ 49,99 × 2,2 = R$ 109,98", () => {
    expect(dulcinea.imediato.itens.find((i) => i.pecaNome === "Blusa Mia")!.etiquetaSugeridaCentavos).toBe(10998);
  });
});

describe("Fórmulas", () => {
  it("lucro na peça: grade 5 → 3ª, grade 4 → 2ª", () => {
    expect(lucroNaPeca(5, 2.2)).toBe(3);
    expect(lucroNaPeca(4, 2.2)).toBe(2);
    expect(lucroNaPeca(4, 2)).toBe(2);
    expect(lucroNaPeca(5, 2.5)).toBe(2);
  });

  it("item: peças, valor da grade, subtotal", () => {
    const i = calcularItem({ ...ITENS_DULCINEA[0], nGrades: 3 }, 2.2);
    expect(i.pecas).toBe(15);
    expect(i.valorGradeCentavos).toBe(24995);
    expect(i.subtotalCentavos).toBe(74985);
  });

  it("arredondamento só no fim e meio para cima", () => {
    expect(dividirArredondado(734890, 6)).toBe(122482); // 122481,67
    expect(dividirArredondado(734890, 12)).toBe(61241); // 61240,83
    expect(dividirArredondado(5, 2)).toBe(3);
    expect(dividirArredondado(4, 2)).toBe(2);
    expect(aplicarMarkup(4999, 2.2)).toBe(10998); // 10997,8
  });

  it("parcela com as parcelas escolhidas (1x)", () => {
    const r = calcularPedido(ITENS_DULCINEA, { ...PARAMETROS_DULCINEA, nParcelas: 1 });
    expect(r.imediato.parcelaCentavos).toBe(734890);
    expect(r.reservado.parcelaCentavos).toBe(73980);
  });

  it("rejeita parcelas inválidas", () => {
    expect(() => calcularPedido(ITENS_DULCINEA, { ...PARAMETROS_DULCINEA, nParcelas: 0 })).toThrow();
  });
});

describe("Composição do pedido", () => {
  const prontos = ITENS_DULCINEA.filter((i) => i.disponibilidade === "pronta_entrega");
  const programados = ITENS_DULCINEA.filter((i) => i.disponibilidade === "programada");

  it("só pronta entrega: reservado vazio", () => {
    const r = calcularPedido(prontos, PARAMETROS_DULCINEA);
    expect(r.reservado.itens).toHaveLength(0);
    expect(r.reservado.totalCentavos).toBe(0);
    expect(r.reservado.previsao).toBeNull();
    expect(r.totalCentavos).toBe(734890);
  });

  it("só programados: envio imediato vazio, tudo no reservado", () => {
    const r = calcularPedido(programados, PARAMETROS_DULCINEA);
    expect(r.imediato.itens).toHaveLength(0);
    expect(r.imediato.totalCentavos).toBe(0);
    expect(r.reservado.totalCentavos).toBe(73980);
    expect(r.totalCentavos).toBe(73980);
  });

  it("mesma peça com cores prontas e programadas aparece nos dois blocos", () => {
    const mia = ITENS_DULCINEA.filter((i) => i.pecaNome === "Blusa Mia");
    const misto: ItemEntrada[] = [mia[0], { ...mia[1], disponibilidade: "programada", previsao: "2026-11-05" }];
    const r = calcularPedido(misto, PARAMETROS_DULCINEA);
    expect(r.imediato.linhas[0].cores.map((c) => c.nome)).toEqual(["Azul bebê"]);
    expect(r.reservado.linhas[0].cores.map((c) => c.nome)).toEqual(["Verde musgo"]);
  });

  it("previsão do bloco reservado é a data mais tardia", () => {
    const [a, b] = programados;
    const r = calcularPedido(
      [{ ...a, previsao: "2026-11-10" }, { ...b, previsao: "2026-10-20" }],
      PARAMETROS_DULCINEA,
    );
    expect(r.reservado.previsoes).toEqual(["2026-10-20", "2026-11-10"]);
    expect(r.reservado.previsao).toBe("2026-11-10");
  });

  it("reservado com uma data só: um grupo igual ao bloco", () => {
    const r = calcularPedido(ITENS_DULCINEA, PARAMETROS_DULCINEA);
    expect(r.reservado.grupos).toHaveLength(1);
    expect(r.reservado.grupos[0]).toMatchObject({ previsao: "2026-10-20", totalCentavos: 73980, parcelaCentavos: 12330, grades: 4, pecas: 20 });
  });

  it("reservado com datas diferentes: um sub-bloco por data, cada um com total e parcela próprios", () => {
    const [marrom, marinho, offWhite, preto] = programados;
    const r = calcularPedido(
      [
        { ...marrom, previsao: "2026-11-10" },
        { ...marinho, previsao: "2026-10-20" },
        { ...offWhite, previsao: "2026-10-20", nGrades: 2 },
        preto, // 20/10
      ],
      PARAMETROS_DULCINEA,
    );
    const [g1, g2] = r.reservado.grupos;
    expect(r.reservado.grupos.map((g) => g.previsao)).toEqual(["2026-10-20", "2026-11-10"]);
    expect(g1.grades).toBe(4);
    expect(g1.totalCentavos).toBe(73980); // 4 × 184,95
    expect(g1.parcelaCentavos).toBe(12330);
    expect(g1.linhas[0].cores.map((c) => c.nome)).toEqual(["Azul marinho", "Off white", "Preto"]);
    expect(g2.grades).toBe(1);
    expect(g2.totalCentavos).toBe(18495);
    expect(g2.parcelaCentavos).toBe(3083); // 3082,5 → 3083
    expect(r.reservado.totalCentavos).toBe(g1.totalCentavos + g2.totalCentavos);
  });

  it("sem programados: nenhum grupo", () => {
    expect(calcularPedido(prontos, PARAMETROS_DULCINEA).reservado.grupos).toEqual([]);
  });

  it("itens com 0 grades são ignorados", () => {
    const r = calcularPedido(ITENS_DULCINEA.map((i) => ({ ...i, nGrades: 0 })), PARAMETROS_DULCINEA);
    expect(r.totalCentavos).toBe(0);
    expect(r.lucroNaPeca).toBeNull();
  });

  it("grade predominante: a com mais peças no pedido", () => {
    const g4 = { pecasPorGrade: 4, gradeComposicao: "2 PP/P + 2 M/G" };
    const itens: ItemEntrada[] = [
      { ...prontos[0], nGrades: 1 }, // 5 peças grade 5
      { ...prontos[1], ...g4, nGrades: 2 }, // 8 peças grade 4
    ];
    const r = calcularPedido(itens, PARAMETROS_DULCINEA);
    expect(r.lucroNaPeca).toBe(2);
    expect(r.gradesPresentes.map((g) => g.pecasPorGrade)).toEqual([4, 5]);
  });
});

describe("Frete", () => {
  const recompra = { ...PARAMETROS_DULCINEA, primeiroPedido: false };

  it("recompra ≥ R$ 3.000 (contando o reservado): grátis", () => {
    expect(calcularPedido(ITENS_DULCINEA, recompra).frete).toBe("gratis");
  });

  it("recompra abaixo de R$ 3.000: a cotar", () => {
    const pequeno = ITENS_DULCINEA.slice(0, 3);
    expect(calcularPedido(pequeno, recompra).frete).toBe("a_cotar");
  });

  it("reservado conta para o mínimo do frete", () => {
    // 6 grades Mia (R$ 1.499,70) + reservado (R$ 739,80) + 1 Vestido (R$ 499,95) = R$ 2.739,45 → a cotar
    // + 1 grade Renda Maria (R$ 399,95) = R$ 3.139,40 → grátis
    const mia = { ...ITENS_DULCINEA[0], nGrades: 6 };
    const reservados = ITENS_DULCINEA.filter((i) => i.disponibilidade === "programada");
    const vestido = ITENS_DULCINEA.find((i) => i.pecaNome.startsWith("Vestido"))!;
    const renda = ITENS_DULCINEA.find((i) => i.pecaNome === "Blusa Renda Maria")!;
    expect(calcularPedido([mia, ...reservados, vestido], recompra).frete).toBe("a_cotar");
    const r = calcularPedido([mia, ...reservados, vestido, renda], recompra);
    expect(r.imediato.totalCentavos).toBeLessThan(300000);
    expect(r.frete).toBe("gratis");
  });

  it("1º pedido com frete grátis desligado pelo admin: a cotar", () => {
    expect(calcularPedido(ITENS_DULCINEA, { ...PARAMETROS_DULCINEA, primeiroFreteGratis: false }).frete).toBe("a_cotar");
  });
});
