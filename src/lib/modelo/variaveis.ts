import type { ResultadoPedido } from "@/lib/calculo";
import { formatarBRL } from "@/lib/dinheiro";
import { formatarData } from "@/lib/datas";

export type DadosVariaveis = {
  proprietaria: string;
  loja: string;
  cidadeUf: string;
  vendedora: string;
  whatsappVendedora: string | null;
  dataDocumento: string; // AAAA-MM-DD
  validade: string | null;
  numeroPedido: string | null;
  resultado: ResultadoPedido;
  parcelasMax: number;
  expedicao: string;
  despachoHoras: number;
  freteMinimoCentavos: number;
};

/** Valores de todas as variáveis do modelo, já formatados para exibição. */
export function montarVariaveis(d: DadosVariaveis): Record<string, string> {
  const r = d.resultado;
  return {
    proprietaria: d.proprietaria,
    loja: d.loja,
    cidade_uf: d.cidadeUf,
    vendedora: d.vendedora,
    whatsapp_vendedora: d.whatsappVendedora ?? "",
    data: formatarData(d.dataDocumento),
    validade: d.validade ? formatarData(d.validade, true) : "",
    numero_pedido: d.numeroPedido ?? "",
    total_pedido: formatarBRL(r.totalCentavos),
    total_imediato: formatarBRL(r.imediato.totalCentavos),
    total_reservado: formatarBRL(r.reservado.totalCentavos),
    parcelas: String(r.nParcelas),
    parcela_imediato: formatarBRL(r.imediato.parcelaCentavos),
    parcela_reservado: formatarBRL(r.reservado.parcelaCentavos),
    venda_estimada: formatarBRL(r.vendaEstimadaCentavos),
    lucro_bruto: formatarBRL(r.lucroBrutoCentavos),
    lucro_conservador: formatarBRL(r.lucroConservadorCentavos),
    total_grades: String(r.grades),
    total_pecas: String(r.pecas),
    // "2,2" (como no "2,2x o atacado") e "2,20" (como dinheiro: "volta como R$ 2,20")
    markup: String(r.markup).replace(".", ","),
    retorno_por_real: r.markup.toFixed(2).replace(".", ","),
    previsao_reservado: r.reservado.previsao ? formatarData(r.reservado.previsao, true) : "",
    lucro_na_peca: String(r.lucroNaPeca ?? ""),
    parcelas_max: String(d.parcelasMax),
    expedicao: d.expedicao,
    despacho_horas: String(d.despachoHoras),
    frete_minimo: formatarBRL(d.freteMinimoCentavos),
  };
}

/** Lista exibida no editor (Fase 4). */
export const VARIAVEIS_DISPONIVEIS = [
  "proprietaria", "loja", "cidade_uf", "vendedora", "whatsapp_vendedora", "data", "validade", "numero_pedido",
  "total_pedido", "total_imediato", "total_reservado", "parcelas", "parcela_imediato", "parcela_reservado",
  "venda_estimada", "lucro_bruto", "lucro_conservador", "total_grades", "total_pecas", "markup", "retorno_por_real",
  "previsao_reservado", "lucro_na_peca", "parcelas_max", "expedicao", "despacho_horas", "frete_minimo",
] as const;

/** Troca {variavel} pelo valor; variável desconhecida fica como está (o editor avisa). */
export function aplicarVariaveis(texto: string, vars: Record<string, string>, extras: Record<string, string> = {}): string {
  return texto.replace(/\{([a-z_]+)\}/g, (inteiro, nome: string) => extras[nome] ?? vars[nome] ?? inteiro);
}

export type Trecho = { texto: string; negrito: boolean };

/** "a **b**\nc" → linhas de trechos. Só negrito (pode atravessar linhas) e quebra de linha; nada de HTML. */
export function interpretarTexto(texto: string): Trecho[][] {
  let negrito = false;
  return texto.split("\n").map((linha) => {
    const trechos: Trecho[] = [];
    linha.split("**").forEach((parte, i) => {
      if (i > 0) negrito = !negrito;
      if (parte) trechos.push({ texto: parte, negrito });
    });
    return trechos;
  });
}
