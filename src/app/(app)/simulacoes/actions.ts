"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirUsuario } from "@/lib/auth";
import { cnpjValido, normalizarCnpj } from "@/lib/cnpj";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstadoForm } from "@/lib/tipos";
import { mensagemErroBanco, primeiroErro } from "@/lib/validacao";

/** Erros de regra de negócio do banco (raise exception … P0001) já vêm em português. */
function erroDoBanco(erro: { code?: string; message?: string } | null, padrao: string): string {
  if (erro?.code === "P0001" && erro.message) return erro.message;
  return mensagemErroBanco(erro, padrao);
}

const esquemaSimulacao = z.object({
  proprietaria: z.string().trim().min(1, "Preencha o nome da proprietária."),
  loja: z.string().trim().min(1, "Preencha o nome da loja."),
  cidade_uf: z.string().trim().min(1, "Preencha cidade/UF."),
  cnpj: z
    .string()
    .trim()
    .transform((v) => (v ? normalizarCnpj(v) : null))
    .refine((v) => v === null || cnpjValido(v), "CNPJ inválido."),
  primeiro_pedido: z.boolean(),
  validade: z.iso.date("Informe a validade da proposta."),
  n_parcelas: z.number().int().min(1),
  itens: z
    .array(
      z.object({
        peca_id: z.uuid(),
        cor_id: z.uuid(),
        n_grades: z.number().int().min(1).max(999),
        ordem: z.number().int(),
      }),
    )
    .min(1, "Adicione pelo menos uma grade."),
});

export type DadosSimulacao = z.input<typeof esquemaSimulacao>;

export async function salvarSimulacao(id: string | null, dados: DadosSimulacao): Promise<EstadoForm> {
  await exigirUsuario();
  const r = esquemaSimulacao.safeParse(dados);
  if (!r.success) return { erro: primeiroErro(r.error) };

  const { itens, ...doc } = r.data;
  const supabase = await criarClienteServidor();
  const { data: novoId, error } = await supabase.rpc("salvar_simulacao", { p_id: id, p_doc: doc, p_itens: itens });
  if (error || !novoId) return { erro: erroDoBanco(error, "Não foi possível salvar a simulação.") };

  revalidatePath("/simulacoes");
  redirect(`/simulacoes/${novoId}`);
}

export async function converterEmPedido(id: string, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirUsuario();
  const cnpj = normalizarCnpj(String(dados.get("cnpj") ?? ""));
  if (!cnpjValido(cnpj)) return { erro: "Informe um CNPJ válido para confirmar o pedido." };

  const supabase = await criarClienteServidor();
  const { data: antes } = await supabase.from("documentos").select("total_centavos").eq("id", id).single();
  const { data: numero, error } = await supabase.rpc("converter_em_pedido", { p_id: id, p_cnpj: cnpj });
  if (error || !numero) return { erro: erroDoBanco(error, "Não foi possível confirmar o pedido.") };

  const { data: depois } = await supabase.from("documentos").select("total_centavos").eq("id", id).single();
  revalidatePath("/simulacoes");
  revalidatePath(`/simulacoes/${id}`);
  const precoMudou = antes?.total_centavos !== depois?.total_centavos;
  redirect(`/simulacoes/${id}?confirmado=1${precoMudou ? "&precos=atualizados" : ""}`);
}

export async function duplicarDocumento(id: string): Promise<EstadoForm> {
  await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { data: novoId, error } = await supabase.rpc("duplicar_documento", { p_id: id });
  if (error || !novoId) return { erro: erroDoBanco(error, "Não foi possível duplicar.") };

  revalidatePath("/simulacoes");
  redirect(`/simulacoes/${novoId}/editar?duplicada=1`);
}

export async function excluirSimulacao(id: string): Promise<EstadoForm> {
  const perfil = await exigirUsuario();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("documentos")
    .delete()
    .eq("id", id)
    .eq("vendedora_id", perfil.id)
    .eq("status", "simulacao")
    .select("id");
  if (error) return { erro: erroDoBanco(error, "Não foi possível excluir.") };
  if (!data?.length) return { erro: "Só é possível excluir as suas simulações (pedidos confirmados ficam guardados)." };

  revalidatePath("/simulacoes");
  redirect("/simulacoes");
}
