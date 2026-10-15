"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstadoForm } from "@/lib/tipos";
import {
  campoCheckbox,
  campoDinheiro,
  campoOpcional,
  campoTexto,
  dadosDoForm,
  mensagemErroBanco,
  primeiroErro,
} from "@/lib/validacao";

const BUCKET = "midia";

const esquemaPeca = z.object({
  referencia: campoTexto("a referência").transform((v) => v.toUpperCase()),
  nome: campoTexto("o nome comercial"),
  preco: campoDinheiro("Preço por peça"),
  grade_tipo_id: z.uuid("Escolha o tipo de grade."),
  composicao_tecido: campoOpcional,
  ativa: campoCheckbox,
});

function linhaPeca(p: z.infer<typeof esquemaPeca>) {
  return {
    referencia: p.referencia,
    nome: p.nome,
    preco_centavos: p.preco,
    grade_tipo_id: p.grade_tipo_id,
    composicao_tecido: p.composicao_tecido,
    ativa: p.ativa,
  };
}

function erroPeca(erro: { code?: string } | null) {
  if (erro?.code === "23505") return "Já existe uma peça com essa referência.";
  return mensagemErroBanco(erro, "Não foi possível salvar a peça.");
}

export async function criarPeca(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = esquemaPeca.safeParse(dadosDoForm(dados));
  if (!r.success) return { erro: primeiroErro(r.error) };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from("pecas").insert(linhaPeca(r.data)).select("id").single();
  if (error || !data) return { erro: erroPeca(error) };

  revalidatePath("/admin/pecas");
  redirect(`/admin/pecas/${data.id}`);
}

export async function salvarPeca(id: string, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = esquemaPeca.safeParse(dadosDoForm(dados));
  if (!r.success) return { erro: primeiroErro(r.error) };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("pecas").update(linhaPeca(r.data)).eq("id", id);
  if (error) return { erro: erroPeca(error) };

  revalidatePath("/admin/pecas");
  revalidatePath(`/admin/pecas/${id}`);
  return { ok: "Peça salva.", t: Date.now() };
}

// ---------------------------------------------------------------- Cores

const esquemaCor = z
  .object({
    nome: campoTexto("o nome da cor"),
    hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor hexadecimal inválida."),
    disponibilidade: z.enum(["pronta_entrega", "programada", "indisponivel"], "Escolha a disponibilidade."),
    previsao: campoOpcional,
    ordem: z.coerce.number().int().default(0),
  })
  .refine((c) => c.disponibilidade !== "programada" || c.previsao, {
    message: "Cor programada precisa da data de previsão.",
  })
  .transform((c) => ({ ...c, hex: c.hex.toUpperCase(), previsao: c.disponibilidade === "programada" ? c.previsao : null }));

export async function criarCor(pecaId: string, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = esquemaCor.safeParse(dadosDoForm(dados));
  if (!r.success) return { erro: primeiroErro(r.error) };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("peca_cores").insert({ ...r.data, peca_id: pecaId });
  if (error) {
    return { erro: error.code === "23505" ? "Essa peça já tem uma cor com esse nome." : mensagemErroBanco(error, "Não foi possível salvar a cor.") };
  }

  revalidatePath(`/admin/pecas/${pecaId}`);
  return { ok: "Cor adicionada.", t: Date.now() };
}

export async function salvarCor(pecaId: string, corId: string, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = esquemaCor.safeParse(dadosDoForm(dados));
  if (!r.success) return { erro: primeiroErro(r.error) };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("peca_cores").update(r.data).eq("id", corId);
  if (error) {
    return { erro: error.code === "23505" ? "Essa peça já tem uma cor com esse nome." : mensagemErroBanco(error, "Não foi possível salvar a cor.") };
  }

  revalidatePath(`/admin/pecas/${pecaId}`);
  return { ok: "Salvo.", t: Date.now() };
}

export async function excluirCor(pecaId: string, corId: string): Promise<EstadoForm> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("peca_cores").delete().eq("id", corId);
  if (error) {
    return {
      erro:
        error.code === "23503"
          ? "Essa cor já está em simulações ou pedidos. Marque como indisponível."
          : mensagemErroBanco(error, "Não foi possível excluir a cor."),
    };
  }
  revalidatePath(`/admin/pecas/${pecaId}`);
  return { ok: "Cor excluída.", t: Date.now() };
}

// ---------------------------------------------------------------- Fotos

/**
 * Registra uma foto que o navegador já enviou direto ao Storage (upload-foto.tsx).
 * O upload em si é protegido pela política do bucket (só admin grava).
 */
export async function registrarFoto(pecaId: string, caminho: string): Promise<EstadoForm> {
  await exigirAdmin();
  const prefixo = `pecas/${pecaId}/`;
  const nome = caminho.slice(prefixo.length);
  if (!caminho.startsWith(prefixo) || !/^[0-9a-f-]{36}\.webp$/.test(nome)) return { erro: "Caminho de foto inválido." };

  const supabase = await criarClienteServidor();
  const { data: existe } = await supabase.storage.from(BUCKET).exists(caminho);
  if (!existe) return { erro: "A foto não chegou ao Storage. Tente de novo." };

  const { count } = await supabase.from("peca_fotos").select("id", { count: "exact", head: true }).eq("peca_id", pecaId);
  const { error } = await supabase.from("peca_fotos").insert({ peca_id: pecaId, storage_path: caminho, ordem: count ?? 0 });
  if (error) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    return { erro: mensagemErroBanco(error, "Não foi possível salvar a foto.") };
  }

  revalidatePath(`/admin/pecas/${pecaId}`);
  return { ok: "Foto enviada.", t: Date.now() };
}

export async function excluirFoto(pecaId: string, fotoId: string): Promise<EstadoForm> {
  await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data: foto } = await supabase.from("peca_fotos").select("storage_path").eq("id", fotoId).single();
  if (!foto) return { erro: "Foto não encontrada." };

  const { error } = await supabase.from("peca_fotos").delete().eq("id", fotoId);
  if (error) return { erro: mensagemErroBanco(error, "Não foi possível excluir a foto.") };
  await supabase.storage.from(BUCKET).remove([foto.storage_path]);

  revalidatePath(`/admin/pecas/${pecaId}`);
  return { ok: "Foto excluída.", t: Date.now() };
}
