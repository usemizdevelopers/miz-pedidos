import "server-only";
import { calcularPedido, type ResultadoPedido } from "@/lib/calculo";
import { carregarCondicoes, carregarDocumento, itensParaCalculo, parametrosDe, type Documento } from "@/lib/documentos";
import { carregarModelo } from "@/lib/modelo/carregar";
import { urlImagem } from "@/lib/modelo/imagens";
import type { ModeloPdf } from "@/lib/modelo/tipos";
import { montarVariaveis } from "@/lib/modelo/variaveis";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/datas";
import type { CondicoesComerciais } from "@/lib/tipos";

export type Formato = "a4" | "celular";

export type DadosImpressao = {
  documento: Documento;
  resultado: ResultadoPedido;
  condicoes: CondicoesComerciais;
  modelo: ModeloPdf;
  versaoModelo: number | null;
  vars: Record<string, string>;
  vendedora: { nome: string; whatsapp: string | null };
  polaroides: string[];
};

/** Polaroides da pág. 2: as 3 peças de maior valor no pedido (foto de modelo quando faltar) ou as fixas do admin. */
async function escolherPolaroides(modelo: ModeloPdf, resultado: ResultadoPedido): Promise<string[]> {
  const fixas = modelo.imagens.polaroides_fixas.map(urlImagem);
  if (modelo.imagens.polaroides_modo === "fixo") return fixas;

  const valorPorPeca = new Map<string, number>();
  for (const l of [...resultado.imediato.linhas, ...resultado.reservado.linhas]) {
    valorPorPeca.set(l.pecaId, (valorPorPeca.get(l.pecaId) ?? 0) + l.subtotalCentavos);
  }
  const top = [...valorPorPeca.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
  if (top.length === 0) return fixas;

  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("peca_fotos").select("peca_id, storage_path, ordem").in("peca_id", top).order("ordem");
  const primeira = new Map<string, string>();
  for (const f of data ?? []) if (!primeira.has(f.peca_id)) primeira.set(f.peca_id, f.storage_path);

  return [0, 1, 2].map((i) => {
    const caminho = top[i] ? primeira.get(top[i]) : undefined;
    return caminho ? urlImagem(caminho) : fixas[i];
  });
}

export async function carregarImpressao(id: string): Promise<DadosImpressao | null> {
  const carregado = await carregarDocumento(id);
  if (!carregado) return null;
  const { documento: d, itens } = carregado;

  const condicoes = d.condicoes_snapshot ?? (await carregarCondicoes());
  const resultado = calcularPedido(itensParaCalculo(itens), parametrosDe(condicoes, d.primeiro_pedido, d.n_parcelas));
  const { modelo, versao } = await carregarModelo(d.modelo_versao_id);

  const supabase = await criarClienteServidor();
  const { data: perfil } = await supabase.from("profiles").select("nome, email, whatsapp").eq("id", d.vendedora_id).maybeSingle();
  const vendedora = { nome: perfil?.nome || perfil?.email || "", whatsapp: perfil?.whatsapp ?? null };

  const vars = montarVariaveis({
    proprietaria: d.proprietaria,
    loja: d.loja,
    cidadeUf: d.cidade_uf,
    vendedora: vendedora.nome.split(" ")[0] ?? "",
    whatsappVendedora: vendedora.whatsapp,
    dataDocumento: (d.confirmado_em ?? d.atualizado_em).slice(0, 10),
    validade: d.validade,
    numeroPedido: d.numero,
    resultado,
    parcelasMax: d.primeiro_pedido ? condicoes.primeiro_parcelas_max : condicoes.recompra_parcelas_max,
    expedicao: condicoes.expedicao,
    despachoHoras: condicoes.despacho_horas,
    freteMinimoCentavos: condicoes.recompra_frete_gratis_minimo_centavos,
  });

  return {
    documento: d,
    resultado,
    condicoes,
    modelo,
    versaoModelo: versao,
    vars,
    vendedora,
    polaroides: await escolherPolaroides(modelo, resultado),
  };
}

/** Nome do arquivo sem acento nem espaço. */
export function nomeArquivo(d: Documento, formato: Formato): string {
  const limpar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join("");
  const sufixo = formato === "celular" ? "_celular" : "";
  if (d.status === "confirmado" && d.numero) {
    return `Miz_Pedido_${d.numero}_${limpar(d.proprietaria)}_${limpar(d.loja)}${sufixo}.pdf`;
  }
  return `Miz_Simulacao_${limpar(d.proprietaria)}_${limpar(d.loja)}_${hojeSP()}${sufixo}.pdf`;
}
