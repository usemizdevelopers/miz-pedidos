import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { MODELO_PADRAO } from "./padrao";
import type { ModeloPdf } from "./tipos";

export { urlImagem } from "./imagens";

/** Junta o JSON salvo com o padrão: campo que faltar numa versão antiga vem do padrão. */
export function completarModelo(blocos: Partial<ModeloPdf> | null, mensagens: Partial<ModeloPdf["mensagens"]> | null): ModeloPdf {
  const b = blocos ?? {};
  return {
    ...MODELO_PADRAO,
    ...b,
    textos: { ...MODELO_PADRAO.textos, ...(b.textos ?? {}) },
    imagens: { ...MODELO_PADRAO.imagens, ...(b.imagens ?? {}) },
    mensagens: { ...MODELO_PADRAO.mensagens, ...(mensagens ?? {}) },
  };
}

/** Versão gravada no documento; sem versão, a vigente; sem nenhuma no banco, o padrão do código. */
export async function carregarModelo(versaoId: string | null): Promise<{ modelo: ModeloPdf; versao: number | null }> {
  const supabase = await criarClienteServidor();
  const consulta = supabase.from("modelo_pdf_versoes").select("versao, blocos, mensagens");
  const { data } = versaoId
    ? await consulta.eq("id", versaoId).maybeSingle()
    : await consulta.order("versao", { ascending: false }).limit(1).maybeSingle();
  if (!data) return { modelo: MODELO_PADRAO, versao: null };
  return { modelo: completarModelo(data.blocos, data.mensagens), versao: data.versao };
}
