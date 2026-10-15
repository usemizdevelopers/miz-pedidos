import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormAcao } from "@/components/form-acao";
import type { GradeTipo } from "@/lib/tipos";
import { CamposPeca } from "../campos-peca";
import { criarPeca } from "../actions";

export default async function NovaPecaPage() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("grade_tipos").select("*").eq("ativo", true).order("nome");

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/pecas" className="text-sm text-suave hover:underline">
        ← Peças
      </Link>
      <h1 className="text-2xl font-semibold">Nova peça</h1>
      <FormAcao action={criarPeca} botao="Criar peça" className="cartao space-y-6">
        <CamposPeca grades={(data ?? []) as GradeTipo[]} />
      </FormAcao>
      <p className="text-sm text-suave">Depois de criar, você adiciona as cores e as fotos.</p>
    </div>
  );
}
