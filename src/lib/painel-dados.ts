import "server-only";
import { hojeSP } from "@/lib/datas";
import { situacao, type LinhaPainel, type SituacaoDocumento } from "@/lib/painel";
import { criarClienteServidor } from "@/lib/supabase/server";

export type FiltrosPainel = {
  vendedora: string; // "" = todas
  situacao: "" | SituacaoDocumento;
  de: string; // AAAA-MM-DD
  ate: string;
};

export type DocumentoPainel = LinhaPainel & {
  numero: string | null;
  proprietaria: string;
  loja: string;
  cidade_uf: string;
  cnpj: string | null;
  n_parcelas: number;
  total_imediato_centavos: number | null;
  total_reservado_centavos: number | null;
  vendedora: string;
  situacao: SituacaoDocumento;
};

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Padrão: do dia 1º do mês até hoje. */
export function lerFiltros(sp: Record<string, string | string[] | undefined>): FiltrosPainel {
  const txt = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const hoje = hojeSP();
  const de = DATA.test(txt("de")) ? txt("de") : `${hoje.slice(0, 8)}01`;
  const ate = DATA.test(txt("ate")) ? txt("ate") : hoje;
  const s = txt("situacao");
  return {
    vendedora: txt("vendedora"),
    situacao: s === "aberta" || s === "vencida" || s === "confirmado" ? s : "",
    de: de <= ate ? de : ate,
    ate,
  };
}

export function filtrosParaQuery(f: FiltrosPainel): string {
  return new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
}

/** Documentos criados no período (fuso de São Paulo), da vendedora escolhida. O RLS garante que só admin vê tudo. */
export async function carregarPainel(f: FiltrosPainel): Promise<{ todos: DocumentoPainel[]; vendedoras: { id: string; nome: string }[] }> {
  const supabase = await criarClienteServidor();
  const fim = new Date(`${f.ate}T00:00:00-03:00`);
  fim.setUTCDate(fim.getUTCDate() + 1);

  let consulta = supabase
    .from("documentos")
    .select(
      "id, vendedora_id, status, primeiro_pedido, total_centavos, total_imediato_centavos, total_reservado_centavos, validade, criado_em, confirmado_em, numero, proprietaria, loja, cidade_uf, cnpj, n_parcelas",
    )
    .gte("criado_em", `${f.de}T00:00:00-03:00`)
    .lt("criado_em", fim.toISOString())
    .order("criado_em", { ascending: false })
    .limit(5000);
  if (f.vendedora) consulta = consulta.eq("vendedora_id", f.vendedora);

  const [{ data }, { data: perfis }] = await Promise.all([consulta, supabase.from("profiles").select("id, nome, email").order("nome")]);
  const nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome || p.email]));
  const hoje = hojeSP();

  return {
    todos: (data ?? []).map((d) => ({ ...d, vendedora: nomes.get(d.vendedora_id) ?? "—", situacao: situacao(d, hoje) }) as DocumentoPainel),
    vendedoras: (perfis ?? []).map((p) => ({ id: p.id, nome: p.nome || p.email })),
  };
}
