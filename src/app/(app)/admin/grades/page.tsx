import { criarClienteServidor } from "@/lib/supabase/server";
import { FormAcao } from "@/components/form-acao";
import type { GradeTipo } from "@/lib/tipos";
import { criarGrade, salvarGrade } from "./actions";

function CamposGrade({ grade }: { grade?: GradeTipo }) {
  return (
    <>
      <div className="min-w-32 flex-1">
        <label className="rotulo">Nome</label>
        <input name="nome" required defaultValue={grade?.nome} placeholder="Grade 5" className="campo" />
      </div>
      <div className="min-w-48 flex-[2]">
        <label className="rotulo">Composição</label>
        <input name="composicao" required defaultValue={grade?.composicao} placeholder="2P + 2M + 1G" className="campo" />
      </div>
      <div className="w-28">
        <label className="rotulo">Peças/grade</label>
        <input name="pecas_por_grade" type="number" min={1} required defaultValue={grade?.pecas_por_grade} className="campo" />
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" name="ativo" defaultChecked={grade?.ativo ?? true} className="size-4 accent-taupe" />
        Ativa
      </label>
    </>
  );
}

export default async function GradesPage() {
  const supabase = await criarClienteServidor();
  const [{ data }, { data: usos }] = await Promise.all([
    supabase.from("grade_tipos").select("*").order("nome"),
    supabase.from("pecas").select("grade_tipo_id"),
  ]);
  const grades = (data ?? []) as GradeTipo[];
  const contagem = new Map<string, number>();
  for (const u of usos ?? []) contagem.set(u.grade_tipo_id, (contagem.get(u.grade_tipo_id) ?? 0) + 1);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tipos de grade</h1>
        <p className="mt-1 text-sm text-suave">
          A grade é escolhida no cadastro da peça. Mudar as peças por grade afeta simulações novas; pedidos confirmados guardam o valor da época.
        </p>
      </div>
      {grades.map((g) => (
        <div key={g.id} className="cartao space-y-2">
          <FormAcao action={salvarGrade.bind(null, g.id)} botaoClasse="botao-contorno" className="flex flex-wrap items-end gap-3">
            <CamposGrade grade={g} />
          </FormAcao>
          <p className="text-xs text-suave">{contagem.get(g.id) ?? 0} peça(s) usam esta grade</p>
        </div>
      ))}
      <FormAcao action={criarGrade} botao="Adicionar grade" className="cartao flex flex-wrap items-end gap-3 border-dashed" limparAoSalvar>
        <CamposGrade />
      </FormAcao>
    </div>
  );
}
