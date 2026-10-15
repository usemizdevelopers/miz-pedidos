// Cria a versão 1 do modelo do PDF a partir de src/lib/modelo/padrao.ts (se ainda não existir nenhuma).
// Uso: npm run modelo:seed
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { MODELO_PADRAO } from "../src/lib/modelo/padrao";

config({ path: ".env.local", quiet: true });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { mensagens, ...blocos } = MODELO_PADRAO;

// --substituir-v1: só durante o desenvolvimento, e só se nenhum documento usa a v1 (versões são imutáveis).
if (process.argv.includes("--substituir-v1")) {
  const { data: v1 } = await sb.from("modelo_pdf_versoes").select("id").eq("versao", 1).single();
  const { count: usos } = await sb.from("documentos").select("id", { count: "exact", head: true }).eq("modelo_versao_id", v1!.id);
  if (usos) throw new Error(`A versão 1 já está em ${usos} documento(s). Crie uma versão nova pelo editor.`);
  const { error } = await sb.from("modelo_pdf_versoes").update({ blocos, mensagens }).eq("id", v1!.id);
  if (error) throw error;
  console.log("Versão 1 do modelo atualizada a partir do código.");
  process.exit(0);
}

const { count } = await sb.from("modelo_pdf_versoes").select("id", { count: "exact", head: true });
if (count) {
  console.log(`Já existem ${count} versão(ões) do modelo. Nada a fazer.`);
  process.exit(0);
}

const { error } = await sb
  .from("modelo_pdf_versoes")
  .insert({ versao: 1, blocos, mensagens, observacao: "Modelo inicial (PDF de referência do Canva)" });
if (error) throw error;
console.log("Versão 1 do modelo criada.");
