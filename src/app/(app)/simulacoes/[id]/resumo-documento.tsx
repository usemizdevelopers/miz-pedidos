import type { Bloco, LinhaPeca, ResultadoPedido } from "@/lib/calculo";
import { formatarBRL } from "@/lib/dinheiro";
import { formatarData } from "@/lib/datas";

function Cores({ linha }: { linha: LinhaPeca }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {linha.cores.map((c) => (
        <span key={c.corId} className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full border border-linha" style={{ backgroundColor: c.hex }} />
          {c.nome}
          {c.nGrades > 1 && <span className="text-suave">({c.nGrades})</span>}
        </span>
      ))}
    </span>
  );
}

function ListaLinhas({ bloco }: { bloco: Bloco }) {
  return (
    <ul className="divide-y divide-linha">
      {bloco.linhas.map((l) => (
        <li key={`${l.pecaId}-${l.precoCentavos}`} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 py-3">
          <div className="min-w-0 space-y-1">
            <p className="font-semibold text-taupe-escuro">{l.pecaNome}</p>
            <p className="text-sm">
              <Cores linha={l} />
            </p>
            <p className="text-sm text-suave">
              <strong className="font-semibold text-texto">{l.grades} {l.grades === 1 ? "grade" : "grades"}</strong> × {formatarBRL(l.valorGradeCentavos)} · {l.pecas} peças a{" "}
              {formatarBRL(l.precoCentavos)}
            </p>
          </div>
          <p className="text-lg text-taupe-escuro">{formatarBRL(l.subtotalCentavos)}</p>
        </li>
      ))}
    </ul>
  );
}

function FaixaTotal({ rotulo, bloco, nParcelas, frete }: { rotulo: string; bloco: Bloco; nParcelas: number; frete: string }) {
  return (
    <div className="grid gap-3 rounded-xl bg-taupe px-5 py-4 text-white sm:grid-cols-3 sm:items-center">
      <p>
        <span className="block text-xs uppercase tracking-wide opacity-80">{rotulo}</span>
        <span className="text-lg">{formatarBRL(bloco.totalCentavos)}</span>
      </p>
      <p className="text-2xl font-bold sm:text-center">
        {nParcelas}x {formatarBRL(bloco.parcelaCentavos)}
      </p>
      <p className="sm:text-right">
        <span className="text-xs uppercase tracking-wide opacity-80">Frete </span>
        <span className="font-semibold">{frete}</span>
      </p>
    </div>
  );
}

export function ResumoDocumento({ r }: { r: ResultadoPedido }) {
  const frete = r.frete === "gratis" ? "R$ 0,00" : "A cotar";
  const retorno = (r.markup.toFixed(2)).replace(".", ",");

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-suave">A conta do lucro</p>
          {r.lucroNaPeca && (
            <p className="text-xl">
              Na {r.lucroNaPeca}ª peça vendida, você já tem <strong>lucro</strong>.
            </p>
          )}
          <dl className="overflow-hidden rounded-xl text-white">
            <div className="flex justify-between bg-taupe px-4 py-3">
              <dt className="text-xs uppercase opacity-80">Você investe</dt>
              <dd className="text-lg">{formatarBRL(r.totalCentavos)}</dd>
            </div>
            <div className="mt-1 flex justify-between bg-taupe px-4 py-3">
              <dt className="text-xs uppercase opacity-80">Vira na sua loja</dt>
              <dd className="text-lg">{formatarBRL(r.vendaEstimadaCentavos)}</dd>
            </div>
          </dl>
        </div>
        <dl className="cartao space-y-1 self-end text-sm">
          <p className="mb-2 text-taupe-escuro">
            Cada R$ 1,00 investido volta como <strong>R$ {retorno}</strong>.
          </p>
          <div className="flex justify-between"><dt className="text-suave">Lucro bruto estimado</dt><dd>{formatarBRL(r.lucroBrutoCentavos)}</dd></div>
          <div className="flex justify-between"><dt className="text-suave">Cenário conservador</dt><dd>{formatarBRL(r.vendaConservadorCentavos)}</dd></div>
          <div className="flex justify-between"><dt className="text-suave">Lucro conservador</dt><dd>{formatarBRL(r.lucroConservadorCentavos)}</dd></div>
        </dl>
      </section>

      {r.imediato.itens.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Envio imediato</h2>
          <ListaLinhas bloco={r.imediato} />
          <div className="flex flex-wrap justify-between gap-2 text-xs text-suave">
            <span>{r.gradesPresentes.map((g) => `Grade = ${g.pecasPorGrade} peças por cor: ${g.composicao}`).join(" · ")}</span>
            <span className="font-semibold uppercase">
              {r.imediato.grades} grades · {r.imediato.pecas} peças
            </span>
          </div>
          <FaixaTotal rotulo="Total do pedido" bloco={r.imediato} nParcelas={r.nParcelas} frete={frete} />
        </section>
      )}

      {r.reservado.grupos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg">
            <strong>Reservado</strong> para você
          </h2>
          {r.reservado.grupos.map((g) => (
            <div key={g.previsao ?? "sem-data"} className="space-y-3">
              <p className="text-sm text-suave">
                Chega em <strong>{formatarData(g.previsao)}</strong> · Você só paga na chegada.
              </p>
              <ListaLinhas bloco={g} />
              <FaixaTotal
                rotulo={r.reservado.grupos.length > 1 ? `Reservado · ${formatarData(g.previsao, true)}` : "Total do reservado"}
                bloco={g}
                nParcelas={r.nParcelas}
                frete={frete}
              />
            </div>
          ))}
        </section>
      )}

      <p className="text-right text-sm text-suave">
        Pedido completo: <strong className="text-texto">{formatarBRL(r.totalCentavos)}</strong> · {r.grades} grades · {r.pecas} peças
      </p>
    </div>
  );
}
