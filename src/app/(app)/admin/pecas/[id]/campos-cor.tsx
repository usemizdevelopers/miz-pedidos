"use client";

import { useState } from "react";
import type { Disponibilidade, PecaCor } from "@/lib/tipos";
import { ROTULO_DISPONIBILIDADE } from "@/lib/tipos";

export function CamposCor({ cor, ordemPadrao = 0 }: { cor?: PecaCor; ordemPadrao?: number }) {
  const [disp, setDisp] = useState<Disponibilidade>(cor?.disponibilidade ?? "pronta_entrega");

  return (
    <>
      <div className="w-14">
        <label className="rotulo">Cor</label>
        <input type="color" name="hex" defaultValue={cor?.hex ?? "#998F84"} className="h-9 w-full cursor-pointer rounded-lg border border-linha bg-cartao" />
      </div>
      <div className="min-w-40 flex-1">
        <label className="rotulo">Nome</label>
        <input name="nome" required defaultValue={cor?.nome} placeholder="Verde musgo" className="campo" />
      </div>
      <div>
        <label className="rotulo">Disponibilidade</label>
        <select
          name="disponibilidade"
          value={disp}
          onChange={(e) => setDisp(e.target.value as Disponibilidade)}
          className="campo"
        >
          {(Object.keys(ROTULO_DISPONIBILIDADE) as Disponibilidade[]).map((d) => (
            <option key={d} value={d}>
              {ROTULO_DISPONIBILIDADE[d]}
            </option>
          ))}
        </select>
      </div>
      {disp === "programada" && (
        <div>
          <label className="rotulo">Previsão</label>
          <input type="date" name="previsao" required defaultValue={cor?.previsao ?? ""} className="campo" />
        </div>
      )}
      <div className="w-20">
        <label className="rotulo">Ordem</label>
        <input type="number" name="ordem" defaultValue={cor?.ordem ?? ordemPadrao} className="campo" />
      </div>
    </>
  );
}
