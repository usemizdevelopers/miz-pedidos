import { describe, expect, it } from "vitest";
import { calcularPedido } from "@/lib/calculo";
import { ITENS_DULCINEA, PARAMETROS_DULCINEA } from "@/lib/fixtures/dulcinea";
import { MODELO_PADRAO } from "./padrao";
import { aplicarVariaveis, interpretarTexto, montarVariaveis } from "./variaveis";

const vars = montarVariaveis({
  proprietaria: "Dulcinéa",
  loja: "Pura Tentação",
  cidadeUf: "Campestre/MG",
  vendedora: "Rafael",
  whatsappVendedora: null,
  dataDocumento: "2026-10-15",
  validade: "2026-10-25",
  numeroPedido: "2026-0001",
  resultado: calcularPedido(ITENS_DULCINEA, PARAMETROS_DULCINEA),
  parcelasMax: 6,
  expedicao: "Itajaí (SC)",
  despachoHoras: 24,
  freteMinimoCentavos: 300000,
});

describe("variáveis do modelo", () => {
  it("mensagem de WhatsApp da simulação", () => {
    expect(aplicarVariaveis(MODELO_PADRAO.mensagens.whatsapp_simulacao, vars)).toBe(
      "Dulcinéa, montei o mix da Pura Tentação e coloquei a conta no PDF. Você investe R$ 8.088,70 e isso vira R$ 17.795,14 na etiqueta. Válido até 25/10. Tem alguma cor ou modelo que você trocaria?",
    );
  });

  it("mensagem de WhatsApp do pedido", () => {
    expect(aplicarVariaveis(MODELO_PADRAO.mensagens.whatsapp_pedido, vars)).toContain("pedido nº 2026-0001");
    expect(aplicarVariaveis(MODELO_PADRAO.mensagens.whatsapp_pedido, vars)).toContain("Envio imediato: 6x de R$ 1.224,82");
  });

  it("chip de parcelas usa o limite do admin", () => {
    expect(aplicarVariaveis(MODELO_PADRAO.condicoes_primeiro[2].titulo, vars)).toBe("Até 6x sem juros");
  });

  it("markup e lucro na peça", () => {
    expect(aplicarVariaveis(MODELO_PADRAO.textos.lucro_titulo, vars)).toBe("Na 3ª peça vendida,\nvocê já tem **lucro.**");
    expect(vars.markup).toBe("2,2");
    expect(vars.retorno_por_real).toBe("2,20");
  });

  it("variável desconhecida fica intacta", () => {
    expect(aplicarVariaveis("Olá {nao_existe}", vars)).toBe("Olá {nao_existe}");
  });

  it("negrito que atravessa a quebra de linha", () => {
    expect(interpretarTexto("a **b\nc** d")).toEqual([
      [{ texto: "a ", negrito: false }, { texto: "b", negrito: true }],
      [{ texto: "c", negrito: true }, { texto: " d", negrito: false }],
    ]);
  });

  it("interpreta negrito e quebras de linha", () => {
    expect(interpretarTexto("a **b** c\n**d**")).toEqual([
      [
        { texto: "a ", negrito: false },
        { texto: "b", negrito: true },
        { texto: " c", negrito: false },
      ],
      [{ texto: "d", negrito: true }],
    ]);
  });
});
