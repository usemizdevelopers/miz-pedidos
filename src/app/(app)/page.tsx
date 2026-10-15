import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";

export default async function Inicio() {
  const perfil = await exigirUsuario();
  redirect(perfil.papel === "admin" ? "/admin/painel" : "/simulacoes");
}
