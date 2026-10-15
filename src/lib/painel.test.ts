import { describe, expect, it } from "vitest";
import { calcularIndicadores, formatarPercentual, porVendedora, situacao, type LinhaPainel } from "./painel";

const HOJE = "2026-10-15";
let n = 0;
const doc = (p: Partial<LinhaPainel>): LinhaPainel => ({
  id: `d${n++}`,
  vendedora_id: "ana",
  status: "simulacao",
  primeiro_pedido: true,
  total_centavos: 100000,
  validade: "2026-10-20",
  criado_em: "2026-10-10T12:00:00Z",
  confirmado_em: null,
  ...p,
});

describe("painel", () => {
  const docs = [
    doc({ status: "confirmado", total_centavos: 808870 }),
    doc({ status: "confirmado", total_centavos: 300000, primeiro_pedido: false }),
    doc({ total_centavos: 50000 }), // aberta
    doc({ total_centavos: 70000, validade: "2026-10-01" }), // vencida
    doc({ vendedora_id: "bia", total_centavos: 20000 }),
    doc({ vendedora_id: "bia", status: "confirmado", total_centavos: 100001 }),
  ];

  it("indicadores gerais", () => {
    const r = calcularIndicadores(docs, HOJE);
    expect(r.simulacoes).toBe(6);
    expect(r.confirmados).toBe(3);
    expect(r.recompras).toBe(1);
    expect(r.emAberto).toBe(2);
    expect(r.vencidas).toBe(1);
    expect(r.conversaoPermil).toBe(500);
    expect(r.valorConfirmadoCentavos).toBe(1208871);
    expect(r.ticketMedioCentavos).toBe(402957); // 402.957,0 → arredonda
    expect(r.valorEmAbertoCentavos).toBe(70000);
    expect(r.valorSimuladoCentavos).toBe(1348871);
  });

  it("por vendedora, ordenado pelo valor confirmado", () => {
    const r = porVendedora(docs, HOJE);
    expect(r.map((v) => v.vendedoraId)).toEqual(["ana", "bia"]);
    expect(r[0].indicadores.conversaoPermil).toBe(500);
    expect(r[1].indicadores.ticketMedioCentavos).toBe(100001);
  });

  it("sem documentos: tudo zero, sem divisão por zero", () => {
    const r = calcularIndicadores([], HOJE);
    expect(r.conversaoPermil).toBe(0);
    expect(r.ticketMedioCentavos).toBe(0);
  });

  it("situação: aberta, vencida (inclui sem validade) e confirmado", () => {
    expect(situacao({ status: "simulacao", validade: HOJE }, HOJE)).toBe("aberta");
    expect(situacao({ status: "simulacao", validade: "2026-10-14" }, HOJE)).toBe("vencida");
    expect(situacao({ status: "simulacao", validade: null }, HOJE)).toBe("vencida");
    expect(situacao({ status: "confirmado", validade: "2026-01-01" }, HOJE)).toBe("confirmado");
  });

  it("formata percentual", () => {
    expect(formatarPercentual(333)).toBe("33,3%");
    expect(formatarPercentual(1000)).toBe("100,0%");
    expect(formatarPercentual(0)).toBe("0,0%");
  });
});
