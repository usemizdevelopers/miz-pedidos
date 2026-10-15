import { formatarValor } from "@/lib/dinheiro";
import type { GradeTipo, Peca } from "@/lib/tipos";

export function CamposPeca({ grades, peca }: { grades: GradeTipo[]; peca?: Peca }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="rotulo" htmlFor="referencia">
          Referência
        </label>
        <input id="referencia" name="referencia" required defaultValue={peca?.referencia} placeholder="BL0001" className="campo uppercase" />
      </div>
      <div>
        <label className="rotulo" htmlFor="nome">
          Nome comercial
        </label>
        <input id="nome" name="nome" required defaultValue={peca?.nome} className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="preco">
          Preço de atacado por peça (R$)
        </label>
        <input
          id="preco"
          name="preco"
          required
          inputMode="decimal"
          defaultValue={peca ? formatarValor(peca.preco_centavos) : ""}
          placeholder="49,99"
          className="campo"
        />
      </div>
      <div>
        <label className="rotulo" htmlFor="grade_tipo_id">
          Tipo de grade
        </label>
        <select id="grade_tipo_id" name="grade_tipo_id" required defaultValue={peca?.grade_tipo_id ?? ""} className="campo">
          <option value="" disabled>
            Escolha…
          </option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome} — {g.composicao} ({g.pecas_por_grade} peças)
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="rotulo" htmlFor="composicao_tecido">
          Base / composição do tecido
        </label>
        <input
          id="composicao_tecido"
          name="composicao_tecido"
          defaultValue={peca?.composicao_tecido ?? ""}
          placeholder="Ex.: Viscolycra 96% viscose, 4% elastano"
          className="campo"
        />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="ativa" defaultChecked={peca?.ativa ?? true} className="size-4 accent-taupe" />
        Peça ativa (aparece para as vendedoras)
      </label>
    </div>
  );
}
