"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { esquemaModelo, problemasDoModelo } from "@/lib/modelo/esquema";
import type { ModeloPdf } from "@/lib/modelo/tipos";
import type { EstadoForm } from "@/lib/tipos";
import { criarClienteServidor } from "@/lib/supabase/server";
import { mensagemErroBanco, primeiroErro } from "@/lib/validacao";

type Resultado = { erro?: string; versao?: number };

async function versaoAtual(): Promise<number | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("modelo_pdf_versoes").select("versao").order("versao", { ascending: false }).limit(1).maybeSingle();
  return data?.versao ?? null;
}

async function inserirVersao(modelo: ModeloPdf, observacao: string, adminId: string, base: number | null): Promise<Resultado> {
  const atual = await versaoAtual();
  if (atual !== base) {
    return { erro: `Outra versão (v${atual}) foi salva enquanto você editava. Recarregue a página para ver as mudanças.` };
  }
  const { mensagens, ...blocos } = modelo;
  const supabase = await criarClienteServidor();
  const nova = (atual ?? 0) + 1;
  const { error } = await supabase
    .from("modelo_pdf_versoes")
    .insert({ versao: nova, blocos, mensagens, observacao: observacao.trim() || null, criado_por: adminId });
  if (error) {
    return { erro: error.code === "23505" ? "Outra versão foi salva ao mesmo tempo. Recarregue a página." : mensagemErroBanco(error, "Não foi possível salvar.") };
  }
  revalidatePath("/admin/modelo");
  return { versao: nova };
}

/** Cada alteração vira uma versão nova; documentos já gerados continuam com a versão deles. */
export async function salvarModelo(modelo: unknown, observacao: string, base: number | null): Promise<Resultado> {
  const admin = await exigirAdmin();
  const r = esquemaModelo.safeParse(modelo);
  if (!r.success) return { erro: primeiroErro(r.error) };
  const valido = r.data as ModeloPdf;
  const problemas = problemasDoModelo(valido);
  if (problemas.length) return { erro: `${problemas[0].problema} (${problemas[0].campo})` };
  return inserirVersao(valido, observacao, admin.id, base);
}

/** Voltar a uma versão anterior = copiar ela como versão nova (o histórico não se perde). */
export async function restaurarVersao(versao: number, base: number | null): Promise<EstadoForm> {
  const admin = await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("modelo_pdf_versoes").select("blocos, mensagens").eq("versao", versao).single();
  if (!data) return { erro: "Versão não encontrada." };
  const r = await inserirVersao({ ...data.blocos, mensagens: data.mensagens } as ModeloPdf, `Restaurada da versão ${versao}`, admin.id, base);
  return r.erro ? { erro: r.erro } : { ok: `Versão ${versao} restaurada como versão ${r.versao}.`, t: Date.now() };
}
