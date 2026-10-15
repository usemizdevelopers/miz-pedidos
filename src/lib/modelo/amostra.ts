import { calcularPedido } from "@/lib/calculo";
import { hojeSP } from "@/lib/datas";
import type { Documento } from "@/lib/documentos";
import { CLIENTE_DULCINEA, ITENS_DULCINEA } from "@/lib/fixtures/dulcinea";
import type { DadosImpressao } from "@/lib/impressao";
import type { CondicoesComerciais } from "@/lib/tipos";
import { montarVariaveis } from "./variaveis";

export type Amostra = Omit<DadosImpressao, "modelo" | "polaroides" | "versaoModelo">;

/** Pedido de exemplo (caso Dulcinéa) para a pré-visualização do editor. */
export function montarAmostras(condicoes: CondicoesComerciais, vendedora: string): Record<"simulacao" | "confirmado", Amostra> {
  const hoje = hojeSP();
  const validade = (() => {
    const d = new Date(`${hoje}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 10);
    return d.toISOString().slice(0, 10);
  })();
  const nParcelas = condicoes.primeiro_parcelas_max;
  const resultado = calcularPedido(ITENS_DULCINEA, {
    primeiroPedido: true,
    nParcelas,
    markup: Number(condicoes.markup),
    fatorConservador: Number(condicoes.fator_conservador),
    primeiroFreteGratis: condicoes.primeiro_frete_gratis,
    recompraFreteMinimoCentavos: condicoes.recompra_frete_gratis_minimo_centavos,
  });

  const documento = (status: Documento["status"]): Documento => ({
    id: `amostra-${status}`,
    vendedora_id: "",
    status,
    numero: status === "confirmado" ? `${hoje.slice(0, 4)}-0001` : null,
    ...CLIENTE_DULCINEA,
    cnpj: status === "confirmado" ? "11222333000181" : null,
    primeiro_pedido: true,
    validade,
    n_parcelas: nParcelas,
    condicoes_snapshot: condicoes,
    modelo_versao_id: null,
    total_imediato_centavos: resultado.imediato.totalCentavos,
    total_reservado_centavos: resultado.reservado.totalCentavos,
    total_centavos: resultado.totalCentavos,
    confirmado_em: status === "confirmado" ? new Date().toISOString() : null,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  });

  const amostra = (status: Documento["status"]): Amostra => {
    const d = documento(status);
    return {
      documento: d,
      resultado,
      condicoes,
      vendedora: { nome: vendedora, whatsapp: null },
      vars: montarVariaveis({
        proprietaria: d.proprietaria,
        loja: d.loja,
        cidadeUf: d.cidade_uf,
        vendedora: vendedora.split(" ")[0] ?? "",
        whatsappVendedora: null,
        dataDocumento: hoje,
        validade,
        numeroPedido: d.numero,
        resultado,
        parcelasMax: condicoes.primeiro_parcelas_max,
        expedicao: condicoes.expedicao,
        despachoHoras: condicoes.despacho_horas,
        freteMinimoCentavos: condicoes.recompra_frete_gratis_minimo_centavos,
      }),
    };
  };
  return { simulacao: amostra("simulacao"), confirmado: amostra("confirmado") };
}
