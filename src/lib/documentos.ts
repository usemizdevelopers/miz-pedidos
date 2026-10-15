import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ItemEntrada, ParametrosCalculo } from "@/lib/calculo";
import type { CondicoesComerciais, Disponibilidade } from "@/lib/tipos";

export type StatusDocumento = "simulacao" | "confirmado";

export type Documento = {
  id: string;
  vendedora_id: string;
  status: StatusDocumento;
  numero: string | null;
  proprietaria: string;
  loja: string;
  cidade_uf: string;
  cnpj: string | null;
  primeiro_pedido: boolean;
  validade: string | null;
  n_parcelas: number;
  condicoes_snapshot: CondicoesComerciais | null;
  modelo_versao_id: string | null;
  total_imediato_centavos: number | null;
  total_reservado_centavos: number | null;
  total_centavos: number | null;
  confirmado_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type ItemDocumento = {
  id: string;
  peca_id: string;
  cor_id: string;
  n_grades: number;
  ordem: number;
  peca_referencia: string;
  peca_nome: string;
  cor_nome: string;
  cor_hex: string;
  preco_centavos: number;
  pecas_por_grade: number;
  grade_composicao: string;
  disponibilidade: Disponibilidade;
  previsao: string | null;
};

/** Catálogo como a vendedora monta o pedido. */
export type PecaVenda = {
  id: string;
  referencia: string;
  nome: string;
  preco_centavos: number;
  grade: { nome: string; composicao: string; pecas_por_grade: number };
  cores: { id: string; nome: string; hex: string; disponibilidade: Exclude<Disponibilidade, "indisponivel">; previsao: string | null; ordem: number }[];
};

export function parametrosDe(c: CondicoesComerciais, primeiroPedido: boolean, nParcelas: number): ParametrosCalculo {
  return { ...parametrosBase(c), primeiroPedido, nParcelas };
}

/** Parâmetros que vêm só das condições comerciais (o formulário completa o resto). */
export function parametrosBase(c: CondicoesComerciais): Omit<ParametrosCalculo, "primeiroPedido" | "nParcelas"> {
  return {
    markup: Number(c.markup),
    fatorConservador: Number(c.fator_conservador),
    primeiroFreteGratis: c.primeiro_frete_gratis,
    recompraFreteMinimoCentavos: c.recompra_frete_gratis_minimo_centavos,
  };
}

export function itensParaCalculo(itens: ItemDocumento[]): ItemEntrada[] {
  return itens
    .filter((i) => i.disponibilidade !== "indisponivel")
    .map((i) => ({
      pecaId: i.peca_id,
      pecaNome: i.peca_nome,
      corId: i.cor_id,
      corNome: i.cor_nome,
      corHex: i.cor_hex,
      precoCentavos: i.preco_centavos,
      pecasPorGrade: i.pecas_por_grade,
      gradeComposicao: i.grade_composicao,
      nGrades: i.n_grades,
      disponibilidade: i.disponibilidade as "pronta_entrega" | "programada",
      previsao: i.previsao,
    }));
}

export async function carregarCondicoes(): Promise<CondicoesComerciais> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("condicoes_comerciais").select("*").eq("id", 1).single();
  if (error || !data) throw new Error("Condições comerciais não encontradas.");
  return data as CondicoesComerciais;
}

export async function carregarCatalogoVenda(): Promise<PecaVenda[]> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("pecas")
    .select("id, referencia, nome, preco_centavos, grade:grade_tipos(nome, composicao, pecas_por_grade), cores:peca_cores(id, nome, hex, disponibilidade, previsao, ordem)")
    .eq("ativa", true)
    .order("nome");
  if (error) throw new Error("Não foi possível carregar o catálogo.");
  return ((data ?? []) as unknown as PecaVenda[])
    .map((p) => ({
      ...p,
      cores: p.cores.filter((c) => (c.disponibilidade as string) !== "indisponivel").sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)),
    }))
    .filter((p) => p.cores.length > 0);
}

export async function carregarDocumento(id: string): Promise<{ documento: Documento; itens: ItemDocumento[]; vendedora: string } | null> {
  const supabase = await criarClienteServidor();
  const [{ data: documento }, { data: itens }] = await Promise.all([
    supabase.from("documentos").select("*").eq("id", id).maybeSingle(),
    supabase.from("documento_itens").select("*").eq("documento_id", id).order("ordem").order("peca_nome").order("cor_nome"),
  ]);
  if (!documento) return null;
  const { data: perfil } = await supabase.from("profiles").select("nome, email").eq("id", documento.vendedora_id).maybeSingle();
  return {
    documento: documento as Documento,
    itens: (itens ?? []) as ItemDocumento[],
    vendedora: perfil?.nome || perfil?.email || "",
  };
}
