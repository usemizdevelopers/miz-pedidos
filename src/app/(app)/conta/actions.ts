"use server";

import { exigirUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstadoForm } from "@/lib/tipos";

export async function trocarSenha(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirUsuario();
  const senha = String(dados.get("senha") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa de pelo menos 8 caracteres." };
  if (senha !== dados.get("confirmacao")) return { erro: "As senhas não conferem." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: "Não foi possível trocar a senha. Tente outra." };
  return { ok: "Senha trocada.", t: Date.now() };
}
