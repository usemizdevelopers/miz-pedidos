"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstadoForm } from "@/lib/tipos";
import { campoCheckbox, campoInteiro, campoTexto, dadosDoForm, mensagemErroBanco, primeiroErro } from "@/lib/validacao";

const esquemaGrade = z.object({
  nome: campoTexto("o nome"),
  composicao: campoTexto("a composição"),
  pecas_por_grade: campoInteiro("Peças por grade", 1, 50),
  ativo: campoCheckbox,
});

function erroGrade(erro: { code?: string } | null) {
  return erro?.code === "23505" ? "Já existe uma grade com esse nome." : mensagemErroBanco(erro, "Não foi possível salvar a grade.");
}

export async function criarGrade(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = esquemaGrade.safeParse(dadosDoForm(dados));
  if (!r.success) return { erro: primeiroErro(r.error) };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("grade_tipos").insert(r.data);
  if (error) return { erro: erroGrade(error) };

  revalidatePath("/admin/grades");
  return { ok: "Grade criada.", t: Date.now() };
}

export async function salvarGrade(id: string, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = esquemaGrade.safeParse(dadosDoForm(dados));
  if (!r.success) return { erro: primeiroErro(r.error) };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("grade_tipos").update(r.data).eq("id", id);
  if (error) return { erro: erroGrade(error) };

  revalidatePath("/admin/grades");
  return { ok: "Salvo.", t: Date.now() };
}
