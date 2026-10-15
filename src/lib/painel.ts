// Indicadores do painel do admin. Função pura (testável); dinheiro em centavos.
import { dividirArredondado } from "@/lib/calculo";

export type LinhaPainel = {
  id: string;
  vendedora_id: string;
  status: "simulacao" | "confirmado";
  primeiro_pedido: boolean;
  total_centavos: number | null;
  validade: string | null;
  criado_em: string;
  confirmado_em: string | null;
};

export type Indicadores = {
  /** Toda simulação criada no período (inclusive as que viraram pedido). */
  simulacoes: number;
  confirmados: number;
  /** Pedidos de recompra entre os confirmados. */
  recompras: number;
  emAberto: number;
  vencidas: number;
  /** Em décimos de ponto percentual: 333 = 33,3%. */
  conversaoPermil: number;
  valorConfirmadoCentavos: number;
  ticketMedioCentavos: number;
  valorEmAbertoCentavos: number;
  valorSimuladoCentavos: number;
};

export type SituacaoDocumento = "aberta" | "vencida" | "confirmado";

export function situacao(d: Pick<LinhaPainel, "status" | "validade">, hoje: string): SituacaoDocumento {
  if (d.status === "confirmado") return "confirmado";
  return !d.validade || d.validade < hoje ? "vencida" : "aberta";
}

export function calcularIndicadores(docs: LinhaPainel[], hoje: string): Indicadores {
  let confirmados = 0;
  let recompras = 0;
  let emAberto = 0;
  let vencidas = 0;
  let valorConfirmado = 0;
  let valorEmAberto = 0;
  let valorSimulado = 0;

  for (const d of docs) {
    const total = d.total_centavos ?? 0;
    valorSimulado += total;
    const s = situacao(d, hoje);
    if (s === "confirmado") {
      confirmados++;
      valorConfirmado += total;
      if (!d.primeiro_pedido) recompras++;
    } else if (s === "aberta") {
      emAberto++;
      valorEmAberto += total;
    } else {
      vencidas++;
    }
  }

  return {
    simulacoes: docs.length,
    confirmados,
    recompras,
    emAberto,
    vencidas,
    conversaoPermil: docs.length ? dividirArredondado(confirmados * 1000, docs.length) : 0,
    valorConfirmadoCentavos: valorConfirmado,
    ticketMedioCentavos: confirmados ? dividirArredondado(valorConfirmado, confirmados) : 0,
    valorEmAbertoCentavos: valorEmAberto,
    valorSimuladoCentavos: valorSimulado,
  };
}

/** Indicadores por vendedora, da que mais confirmou para a que menos. */
export function porVendedora(docs: LinhaPainel[], hoje: string): { vendedoraId: string; indicadores: Indicadores }[] {
  const grupos = new Map<string, LinhaPainel[]>();
  for (const d of docs) grupos.set(d.vendedora_id, [...(grupos.get(d.vendedora_id) ?? []), d]);
  return [...grupos.entries()]
    .map(([vendedoraId, lista]) => ({ vendedoraId, indicadores: calcularIndicadores(lista, hoje) }))
    .sort((a, b) => b.indicadores.valorConfirmadoCentavos - a.indicadores.valorConfirmadoCentavos || b.indicadores.simulacoes - a.indicadores.simulacoes);
}

/** 333 → "33,3%" */
export function formatarPercentual(permil: number): string {
  return `${Math.floor(permil / 10)},${permil % 10}%`;
}
