"use client";

import { useMemo, useState, useTransition } from "react";
import { calcularPedido, type ItemEntrada, type ParametrosCalculo } from "@/lib/calculo";
import { formatarBRL } from "@/lib/dinheiro";
import { formatarData } from "@/lib/datas";
import type { PecaVenda } from "@/lib/documentos";
import { salvarSimulacao } from "./actions";

type Inicial = {
  id: string;
  proprietaria: string;
  loja: string;
  cidade_uf: string;
  cnpj: string | null;
  primeiro_pedido: boolean;
  validade: string | null;
  n_parcelas: number;
  itens: { peca_id: string; cor_id: string; n_grades: number }[];
};

type Props = {
  catalogo: PecaVenda[];
  parametros: Omit<ParametrosCalculo, "primeiroPedido" | "nParcelas">;
  parcelasMax: { primeiro: number; recompra: number };
  hoje: string;
  inicial?: Inicial;
};

export function FormSimulacao({ catalogo, parametros, parcelasMax, hoje, inicial }: Props) {
  const corParaPeca = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of catalogo) for (const c of p.cores) m.set(c.id, p.id);
    return m;
  }, [catalogo]);

  const itensValidos = (inicial?.itens ?? []).filter((i) => corParaPeca.get(i.cor_id) === i.peca_id);
  const itensRemovidos = (inicial?.itens.length ?? 0) - itensValidos.length;

  const [cliente, setCliente] = useState({
    proprietaria: inicial?.proprietaria ?? "",
    loja: inicial?.loja ?? "",
    cidade_uf: inicial?.cidade_uf ?? "",
    cnpj: inicial?.cnpj ?? "",
  });
  const [primeiro, setPrimeiro] = useState(inicial?.primeiro_pedido ?? true);
  const [validade, setValidade] = useState(inicial?.validade && inicial.validade >= hoje ? inicial.validade : "");
  const maxParcelas = primeiro ? parcelasMax.primeiro : parcelasMax.recompra;
  const [nParcelasEscolhido, setNParcelas] = useState(inicial?.n_parcelas ?? maxParcelas);
  const nParcelas = Math.min(nParcelasEscolhido, maxParcelas);

  const [grades, setGrades] = useState<Record<string, number>>(() =>
    Object.fromEntries(itensValidos.map((i) => [i.cor_id, i.n_grades])),
  );
  const [ordemPecas, setOrdemPecas] = useState<string[]>(() => [...new Set(itensValidos.map((i) => i.peca_id))]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function alterarGrades(peca: PecaVenda, mudancas: Record<string, number>) {
    const novo = { ...grades };
    for (const [corId, n] of Object.entries(mudancas)) {
      if (n > 0) novo[corId] = Math.min(999, Math.floor(n));
      else delete novo[corId];
    }
    setGrades(novo);
    const temGrade = peca.cores.some((c) => (novo[c.id] ?? 0) > 0);
    setOrdemPecas((o) => (temGrade ? (o.includes(peca.id) ? o : [...o, peca.id]) : o.filter((id) => id !== peca.id)));
  }

  // Itens na ordem em que as peças entraram no pedido (é a ordem do PDF)
  const itens = useMemo(() => {
    const porId = new Map(catalogo.map((p) => [p.id, p]));
    const lista: (ItemEntrada & { ordem: number })[] = [];
    for (const pecaId of ordemPecas) {
      const p = porId.get(pecaId);
      if (!p) continue;
      for (const c of p.cores) {
        const n = grades[c.id] ?? 0;
        if (n <= 0) continue;
        lista.push({
          ordem: lista.length + 1,
          pecaId: p.id,
          pecaNome: p.nome,
          corId: c.id,
          corNome: c.nome,
          corHex: c.hex,
          precoCentavos: p.preco_centavos,
          pecasPorGrade: p.grade.pecas_por_grade,
          gradeComposicao: p.grade.composicao,
          nGrades: n,
          disponibilidade: c.disponibilidade,
          previsao: c.previsao,
        });
      }
    }
    return lista;
  }, [catalogo, ordemPecas, grades]);

  const resultado = useMemo(
    () => calcularPedido(itens, { ...parametros, primeiroPedido: primeiro, nParcelas }),
    [itens, parametros, primeiro, nParcelas],
  );

  const termo = busca.trim().toLowerCase();
  const pecasVisiveis = termo
    ? catalogo.filter((p) => p.nome.toLowerCase().includes(termo) || p.referencia.toLowerCase().includes(termo))
    : catalogo;

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarSimulacao(inicial?.id ?? null, {
        ...cliente,
        primeiro_pedido: primeiro,
        validade,
        n_parcelas: nParcelas,
        itens: itens.map((i) => ({ peca_id: i.pecaId, cor_id: i.corId, n_grades: i.nGrades, ordem: i.ordem })),
      });
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-6">
        {itensRemovidos > 0 && (
          <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
            {itensRemovidos} cor(es) saíram do catálogo (indisponíveis ou peça inativa) e foram retiradas deste pedido.
          </p>
        )}

        <section className="cartao space-y-4">
          <h2 className="font-semibold">Cliente</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Nome da proprietária" valor={cliente.proprietaria} aoMudar={(v) => setCliente({ ...cliente, proprietaria: v })} placeholder="Dulcinéa" />
            <Campo rotulo="Nome da loja" valor={cliente.loja} aoMudar={(v) => setCliente({ ...cliente, loja: v })} placeholder="Pura Tentação" />
            <Campo rotulo="Cidade/UF" valor={cliente.cidade_uf} aoMudar={(v) => setCliente({ ...cliente, cidade_uf: v })} placeholder="Campestre/MG" />
            <Campo
              rotulo="CNPJ (obrigatório só para confirmar)"
              valor={cliente.cnpj}
              aoMudar={(v) => setCliente({ ...cliente, cnpj: v })}
              placeholder="00.000.000/0000-00"
              obrigatorio={false}
            />
          </div>
        </section>

        <section className="cartao grid gap-4 sm:grid-cols-3">
          <div>
            <span className="rotulo">Primeiro pedido?</span>
            <div className="flex overflow-hidden rounded-lg border border-linha text-sm">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setPrimeiro(v)}
                  className={`flex-1 px-3 py-2 ${primeiro === v ? "bg-taupe font-semibold text-white" : "bg-cartao text-taupe-escuro"}`}
                >
                  {v ? "Sim" : "Recompra"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="rotulo" htmlFor="validade">
              Validade da proposta
            </label>
            <input id="validade" type="date" min={hoje} value={validade} onChange={(e) => setValidade(e.target.value)} className="campo" />
          </div>
          <div>
            <label className="rotulo" htmlFor="parcelas">
              Parcelas sem juros
            </label>
            <select id="parcelas" value={nParcelas} onChange={(e) => setNParcelas(Number(e.target.value))} className="campo">
              {Array.from({ length: maxParcelas }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}x
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Peças</h2>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar peça ou referência"
              className="campo max-w-xs"
            />
          </div>
          {pecasVisiveis.map((p) => {
            const totalPeca = p.cores.reduce((s, c) => s + (grades[c.id] ?? 0), 0);
            return (
              <div key={p.id} className={`cartao space-y-3 ${totalPeca > 0 ? "border-taupe" : ""}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <span className="font-semibold">{p.nome}</span>{" "}
                    <span className="font-mono text-xs text-suave">{p.referencia}</span>
                    <p className="text-xs text-suave">
                      {formatarBRL(p.preco_centavos)}/peça · {p.grade.composicao} · grade {formatarBRL(p.preco_centavos * p.grade.pecas_por_grade)}
                    </p>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button
                      type="button"
                      className="text-taupe-escuro underline-offset-4 hover:underline"
                      onClick={() => alterarGrades(p, Object.fromEntries(p.cores.map((c) => [c.id, Math.max(1, grades[c.id] ?? 0)])))}
                    >
                      1 grade em cada cor
                    </button>
                    {totalPeca > 0 && (
                      <button
                        type="button"
                        className="text-suave underline-offset-4 hover:underline"
                        onClick={() => alterarGrades(p, Object.fromEntries(p.cores.map((c) => [c.id, 0])))}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {p.cores.map((c) => {
                    const n = grades[c.id] ?? 0;
                    return (
                      <div key={c.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${n > 0 ? "border-taupe bg-fundo" : "border-linha"}`}>
                        <span className="size-4 shrink-0 rounded-full border border-linha" style={{ backgroundColor: c.hex }} />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {c.nome}
                          {c.disponibilidade === "programada" && (
                            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">chega {formatarData(c.previsao, true)}</span>
                          )}
                        </span>
                        <Stepper valor={n} aoMudar={(v) => alterarGrades(p, { [c.id]: v })} rotulo={`Grades de ${p.nome} ${c.nome}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {pecasVisiveis.length === 0 && <p className="text-sm text-suave">Nenhuma peça encontrada.</p>}
        </section>
      </div>

      <aside className="cartao space-y-4 lg:sticky lg:top-4">
        <h2 className="font-semibold">Resumo</h2>

        <BlocoResumo
          titulo="Envio imediato"
          grades={resultado.imediato.grades}
          pecas={resultado.imediato.pecas}
          total={resultado.imediato.totalCentavos}
          parcela={resultado.imediato.parcelaCentavos}
          nParcelas={nParcelas}
        />

        {resultado.reservado.grupos.map((g) => (
          <BlocoResumo
            key={g.previsao ?? "sem-data"}
            titulo={`Reservado · chega ${formatarData(g.previsao, true)}`}
            nota="Paga na chegada"
            grades={g.grades}
            pecas={g.pecas}
            total={g.totalCentavos}
            parcela={g.parcelaCentavos}
            nParcelas={nParcelas}
          />
        ))}

        <dl className="space-y-1 border-t border-linha pt-3 text-sm">
          <Linha rotulo="Total do pedido" valor={formatarBRL(resultado.totalCentavos)} forte />
          <Linha rotulo={`${resultado.grades} grades · ${resultado.pecas} peças`} valor="" />
          <Linha rotulo="Frete" valor={resultado.totalCentavos === 0 ? "—" : resultado.frete === "gratis" ? "Por conta da Miz" : "A cotar"} />
          <Linha rotulo={`Vira na loja (${String(parametros.markup).replace(".", ",")}x)`} valor={formatarBRL(resultado.vendaEstimadaCentavos)} forte />
        </dl>

        {erro && (
          <p role="alert" className="text-sm text-erro">
            {erro}
          </p>
        )}
        <button type="button" onClick={salvar} disabled={salvando} className="botao w-full">
          {salvando ? "Salvando…" : inicial ? "Salvar alterações" : "Gerar simulação"}
        </button>
      </aside>
    </div>
  );
}

function Campo({
  rotulo,
  valor,
  aoMudar,
  placeholder,
  obrigatorio = true,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  placeholder?: string;
  obrigatorio?: boolean;
}) {
  return (
    <label className="block">
      <span className="rotulo">{rotulo}</span>
      <input value={valor} onChange={(e) => aoMudar(e.target.value)} required={obrigatorio} placeholder={placeholder} className="campo" />
    </label>
  );
}

function Stepper({ valor, aoMudar, rotulo }: { valor: number; aoMudar: (v: number) => void; rotulo: string }) {
  return (
    <div className="flex shrink-0 items-center overflow-hidden rounded-full border border-linha bg-cartao">
      <button type="button" aria-label="Menos uma grade" onClick={() => aoMudar(valor - 1)} disabled={valor === 0} className="px-2.5 py-1 text-taupe-escuro disabled:opacity-30">
        −
      </button>
      <input
        aria-label={rotulo}
        inputMode="numeric"
        value={valor || ""}
        placeholder="0"
        onChange={(e) => aoMudar(Number(e.target.value.replace(/\D/g, "")) || 0)}
        className="w-8 bg-transparent text-center text-sm font-semibold outline-none"
      />
      <button type="button" aria-label="Mais uma grade" onClick={() => aoMudar(valor + 1)} className="px-2.5 py-1 text-taupe-escuro">
        +
      </button>
    </div>
  );
}

function BlocoResumo(props: { titulo: string; nota?: string; grades: number; pecas: number; total: number; parcela: number; nParcelas: number }) {
  return (
    <div className="space-y-1 rounded-xl bg-fundo p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-suave">{props.titulo}</p>
      <p className="text-xl font-semibold text-taupe-escuro">
        {props.nParcelas}x {formatarBRL(props.parcela)}
      </p>
      <p className="text-sm text-suave">
        {formatarBRL(props.total)} · {props.grades} grades · {props.pecas} peças
        {props.nota && ` · ${props.nota}`}
      </p>
    </div>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-suave">{rotulo}</dt>
      <dd className={forte ? "font-semibold" : ""}>{valor}</dd>
    </div>
  );
}
