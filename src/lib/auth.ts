import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/tipos";

/** Perfil do usuário logado (uma consulta por request). */
export const obterPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await criarClienteServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const id = claims?.claims?.sub;
  if (!id) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
  return (data as Perfil | null) ?? null;
});

export async function exigirUsuario(): Promise<Perfil> {
  const perfil = await obterPerfil();
  if (!perfil) redirect("/login");
  if (!perfil.ativa) redirect("/login?erro=inativa");
  return perfil;
}

export async function exigirAdmin(): Promise<Perfil> {
  const perfil = await exigirUsuario();
  if (perfil.papel !== "admin") redirect("/");
  return perfil;
}
