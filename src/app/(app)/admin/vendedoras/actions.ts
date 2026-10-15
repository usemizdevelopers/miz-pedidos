"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstadoForm } from "@/lib/tipos";
import { campoOpcional, campoTexto, dadosDoForm, mensagemErroBanco, primeiroErro } from "@/lib/validacao";

const senhaTemporaria = () => randomBytes(9).toString("base64url");

const esquemaVendedora = z.object({
  nome: campoTexto("o nome"),
  email: z.email("E-mail inválido.").transform((v) => v.trim().toLowerCase()),
  whatsapp: campoOpcional,
});

export async function criarVendedora(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = esquemaVendedora.safeParse(dadosDoForm(dados));
  if (!r.success) return { erro: primeiroErro(r.error) };

  const senha = senhaTemporaria();
  const admin = criarClienteAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: r.data.email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: r.data.nome },
  });
  if (error || !data.user) {
    return { erro: error?.code === "email_exists" ? "Já existe um usuário com esse e-mail." : "Não foi possível criar o usuário." };
  }

  // O perfil nasce pelo trigger; o admin ativa e completa pelo RLS.
  const supabase = await criarClienteServidor();
  const { error: erroPerfil } = await supabase
    .from("profiles")
    .update({ nome: r.data.nome, whatsapp: r.data.whatsapp, papel: "vendedora", ativa: true })
    .eq("id", data.user.id);
  if (erroPerfil) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { erro: mensagemErroBanco(erroPerfil, "Não foi possível criar o perfil.") };
  }

  revalidatePath("/admin/vendedoras");
  return { ok: `Criada. Senha temporária de ${r.data.email}: ${senha}`, t: Date.now() };
}

const esquemaEdicao = esquemaVendedora.pick({ nome: true, whatsapp: true });

export async function salvarVendedora(id: string, _: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = esquemaEdicao.safeParse(dadosDoForm(dados));
  if (!r.success) return { erro: primeiroErro(r.error) };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("profiles").update(r.data).eq("id", id);
  if (error) return { erro: mensagemErroBanco(error, "Não foi possível salvar.") };

  revalidatePath("/admin/vendedoras");
  return { ok: "Salvo.", t: Date.now() };
}

export async function alternarAtiva(id: string, ativar: boolean): Promise<EstadoForm> {
  const eu = await exigirAdmin();
  if (id === eu.id) return { erro: "Você não pode desativar o próprio acesso." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("profiles").update({ ativa: ativar }).eq("id", id);
  if (error) return { erro: mensagemErroBanco(error, "Não foi possível alterar.") };

  // Bloqueia também no Auth: a sessão aberta deixa de renovar.
  await criarClienteAdmin().auth.admin.updateUserById(id, { ban_duration: ativar ? "none" : "876000h" });

  revalidatePath("/admin/vendedoras");
  return { ok: ativar ? "Reativada." : "Desativada.", t: Date.now() };
}

export async function redefinirSenha(id: string): Promise<EstadoForm> {
  await exigirAdmin();
  const senha = senhaTemporaria();
  const { error } = await criarClienteAdmin().auth.admin.updateUserById(id, { password: senha });
  if (error) return { erro: "Não foi possível redefinir a senha." };
  return { ok: `Nova senha temporária: ${senha}`, t: Date.now() };
}
