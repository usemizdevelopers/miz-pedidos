"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstadoForm } from "@/lib/tipos";
import {
  campoCheckbox,
  campoDecimal,
  campoDinheiro,
  campoInteiro,
  campoTexto,
  dadosDoForm,
  mensagemErroBanco,
  primeiroErro,
} from "@/lib/validacao";

const esquemaCondicoes = z.object({
  markup: campoDecimal("Markup", 2),
  fator_conservador: campoDecimal("Fator conservador", 3),
  despacho_horas: campoInteiro("Prazo de despacho", 1, 720),
  expedicao: campoTexto("a cidade de expedição"),
  primeiro_pedido_minimo: campoTexto("o pedido mínimo do 1º pedido"),
  primeiro_frete_gratis: campoCheckbox,
  primeiro_parcelas_max: campoInteiro("Parcelas no 1º pedido", 1, 24),
  recompra_pedido_minimo: campoTexto("o pedido mínimo da recompra"),
  recompra_frete_gratis_minimo: campoDinheiro("Frete grátis na recompra a partir de"),
  recompra_parcelas_max: campoInteiro("Parcelas na recompra", 1, 24),
  outras_formas_pagamento: campoTexto("as outras formas de pagamento"),
});

export async function salvarCondicoes(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const admin = await exigirAdmin();
  const r = esquemaCondicoes.safeParse(dadosDoForm(dados));
  if (!r.success) return { erro: primeiroErro(r.error) };

  const { recompra_frete_gratis_minimo, ...resto } = r.data;
  if (Number(resto.markup) <= 1) return { erro: "Markup precisa ser maior que 1." };
  if (Number(resto.fator_conservador) <= 0 || Number(resto.fator_conservador) > 1) {
    return { erro: "Fator conservador precisa estar entre 0 e 1." };
  }

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("condicoes_comerciais")
    .update({ ...resto, recompra_frete_gratis_minimo_centavos: recompra_frete_gratis_minimo, atualizado_por: admin.id })
    .eq("id", 1);
  if (error) return { erro: mensagemErroBanco(error, "Não foi possível salvar as condições.") };

  revalidatePath("/admin/condicoes");
  return { ok: "Condições salvas.", t: Date.now() };
}
