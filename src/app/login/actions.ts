"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { EstadoForm } from "@/lib/tipos";

export async function entrar(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const email = String(dados.get("email") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");
  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) return { erro: "E-mail ou senha incorretos." };

  const { data: perfil } = await supabase.from("profiles").select("ativa").eq("id", data.user.id).single();
  if (!perfil?.ativa) {
    await supabase.auth.signOut();
    return { erro: "Seu acesso está desativado. Fale com o admin." };
  }

  redirect("/");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}
