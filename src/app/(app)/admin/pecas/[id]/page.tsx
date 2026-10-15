import Link from "next/link";
import { notFound } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormAcao } from "@/components/form-acao";
import { urlMidia } from "@/lib/midia";
import type { GradeTipo, Peca, PecaCor, PecaFoto } from "@/lib/tipos";
import { CamposPeca } from "../campos-peca";
import { CamposCor } from "./campos-cor";
import { criarCor, excluirCor, excluirFoto, salvarCor, salvarPeca } from "../actions";
import { UploadFoto } from "./upload-foto";

export default async function EditarPecaPage({ params }: PageProps<"/admin/pecas/[id]">) {
  const { id } = await params;
  const supabase = await criarClienteServidor();

  const [{ data: peca }, { data: grades }, { data: cores }, { data: fotos }] = await Promise.all([
    supabase.from("pecas").select("*").eq("id", id).maybeSingle(),
    supabase.from("grade_tipos").select("*").order("nome"),
    supabase.from("peca_cores").select("*").eq("peca_id", id).order("ordem").order("nome"),
    supabase.from("peca_fotos").select("*").eq("peca_id", id).order("ordem"),
  ]);
  if (!peca) notFound();

  const listaCores = (cores ?? []) as PecaCor[];

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link href="/admin/pecas" className="text-sm text-suave hover:underline">
          ← Peças
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {peca.nome} <span className="font-mono text-base font-normal text-suave">{peca.referencia}</span>
        </h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Dados da peça</h2>
        <FormAcao action={salvarPeca.bind(null, id)} className="cartao space-y-6">
          <CamposPeca grades={(grades ?? []) as GradeTipo[]} peca={peca as Peca} />
        </FormAcao>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Cores</h2>
        <div className="space-y-3">
          {listaCores.map((cor) => (
            <div key={cor.id} className="cartao flex flex-wrap items-end gap-3">
              <FormAcao
                action={salvarCor.bind(null, id, cor.id)}
                botaoClasse="botao-contorno"
                className="flex flex-1 flex-wrap items-end gap-3"
              >
                <CamposCor cor={cor} />
              </FormAcao>
              <FormAcao
                action={excluirCor.bind(null, id, cor.id)}
                botao="Excluir"
                botaoClasse="text-sm text-erro hover:underline"
                confirmar={`Excluir a cor ${cor.nome}?`}
              >
                {null}
              </FormAcao>
            </div>
          ))}
          {listaCores.length === 0 && <p className="text-sm text-suave">Nenhuma cor cadastrada.</p>}
        </div>
        <FormAcao
          action={criarCor.bind(null, id)}
          botao="Adicionar cor"
          className="cartao flex flex-wrap items-end gap-3 border-dashed"
          limparAoSalvar
        >
          <CamposCor ordemPadrao={listaCores.length + 1} />
        </FormAcao>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Fotos</h2>
        <div className="flex flex-wrap gap-4">
          {((fotos ?? []) as PecaFoto[]).map((f) => (
            <figure key={f.id} className="w-40 space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urlMidia(f.storage_path)} alt="" className="aspect-[3/4] w-full rounded-xl object-cover" />
              <FormAcao
                action={excluirFoto.bind(null, id, f.id)}
                botao="Excluir"
                botaoClasse="text-sm text-erro hover:underline"
                confirmar="Excluir esta foto?"
              >
                {null}
              </FormAcao>
            </figure>
          ))}
        </div>
        <UploadFoto pecaId={id} />
      </section>
    </div>
  );
}
