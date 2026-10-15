import Link from "next/link";
import { exigirAdmin } from "@/lib/auth";
import { formatarBRL } from "@/lib/dinheiro";
import { formatarData, hojeSP } from "@/lib/datas";
import { calcularIndicadores, formatarPercentual, porVendedora } from "@/lib/painel";
import { carregarPainel, filtrosParaQuery, lerFiltros } from "@/lib/painel-dados";
import { SeloStatus } from "@/app/(app)/simulacoes/selo-status";

const SITUACOES = [
  { valor: "", rotulo: "Todas" },
  { valor: "aberta", rotulo: "Simulação em aberto" },
  { valor: "vencida", rotulo: "Simulação vencida" },
  { valor: "confirmado", rotulo: "Pedido confirmado" },
];

function Kpi({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="cartao">
      <p className="text-xs font-semibold uppercase tracking-wide text-suave">{rotulo}</p>
      <p className="mt-1 text-2xl font-semibold text-taupe-escuro">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-suave">{detalhe}</p>}
    </div>
  );
}

export default async function PainelPage({ searchParams }: PageProps<"/admin/painel">) {
  await exigirAdmin();
  const filtros = lerFiltros(await searchParams);
  const { todos, vendedoras } = await carregarPainel(filtros);
  const hoje = hojeSP();

  const geral = calcularIndicadores(todos, hoje);
  const ranking = porVendedora(todos, hoje);
  const nomes = new Map(vendedoras.map((v) => [v.id, v.nome]));
  const lista = filtros.situacao ? todos.filter((d) => d.situacao === filtros.situacao) : todos;
  const query = filtrosParaQuery(filtros);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Painel</h1>
          <p className="text-sm text-suave">
            Documentos criados de {formatarData(filtros.de)} a {formatarData(filtros.ate)}
            {filtros.vendedora && ` · ${nomes.get(filtros.vendedora) ?? ""}`}
          </p>
        </div>
        <a href={`/admin/painel/csv?${query}`} className="botao-contorno">
          Exportar CSV
        </a>
      </div>

      <form className="cartao grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <label>
          <span className="rotulo">Vendedora</span>
          <select name="vendedora" defaultValue={filtros.vendedora} className="campo">
            <option value="">Todas</option>
            {vendedoras.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="rotulo">Situação (lista e CSV)</span>
          <select name="situacao" defaultValue={filtros.situacao} className="campo">
            {SITUACOES.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="rotulo">De</span>
          <input type="date" name="de" defaultValue={filtros.de} className="campo" />
        </label>
        <label>
          <span className="rotulo">Até</span>
          <input type="date" name="ate" defaultValue={filtros.ate} className="campo" />
        </label>
        <div className="flex gap-3">
          <button type="submit" className="botao flex-1">
            Filtrar
          </button>
          <Link href="/admin/painel" className="botao-contorno">
            Limpar
          </Link>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi rotulo="Simulações geradas" valor={String(geral.simulacoes)} detalhe={`${geral.emAberto} em aberto · ${geral.vencidas} vencidas`} />
        <Kpi
          rotulo="Pedidos confirmados"
          valor={String(geral.confirmados)}
          detalhe={`Conversão ${formatarPercentual(geral.conversaoPermil)} · ${geral.recompras} recompra(s)`}
        />
        <Kpi rotulo="Valor confirmado" valor={formatarBRL(geral.valorConfirmadoCentavos)} detalhe={`Ticket médio ${formatarBRL(geral.ticketMedioCentavos)}`} />
        <Kpi rotulo="Em aberto" valor={formatarBRL(geral.valorEmAbertoCentavos)} detalhe="Simulações dentro da validade" />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Por vendedora</h2>
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Vendedora</th>
                <th className="text-right">Simulações</th>
                <th className="text-right">Confirmados</th>
                <th className="text-right">Conversão</th>
                <th className="text-right">Valor confirmado</th>
                <th className="text-right">Ticket médio</th>
                <th className="text-right">Em aberto</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map(({ vendedoraId, indicadores: i }) => (
                <tr key={vendedoraId}>
                  <td>
                    <Link href={`/admin/painel?${filtrosParaQuery({ ...filtros, vendedora: vendedoraId })}`} className="font-semibold text-taupe-escuro hover:underline">
                      {nomes.get(vendedoraId) ?? "—"}
                    </Link>
                  </td>
                  <td className="text-right">{i.simulacoes}</td>
                  <td className="text-right">{i.confirmados}</td>
                  <td className="text-right">{formatarPercentual(i.conversaoPermil)}</td>
                  <td className="whitespace-nowrap text-right">{formatarBRL(i.valorConfirmadoCentavos)}</td>
                  <td className="whitespace-nowrap text-right">{formatarBRL(i.ticketMedioCentavos)}</td>
                  <td className="whitespace-nowrap text-right">{formatarBRL(i.valorEmAbertoCentavos)}</td>
                </tr>
              ))}
              {ranking.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-suave">
                    Nenhum documento no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Documentos <span className="text-sm font-normal text-suave">({lista.length})</span>
        </h2>
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Situação</th>
                <th>Loja</th>
                <th>Vendedora</th>
                <th className="text-right">Total</th>
                <th>Tipo</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {lista.slice(0, 300).map((d) => (
                <tr key={d.id} className="hover:bg-fundo">
                  <td className="whitespace-nowrap">
                    <SeloStatus status={d.status} numero={d.numero} vencida={d.situacao === "vencida"} />
                  </td>
                  <td>
                    <Link href={`/simulacoes/${d.id}`} className="font-semibold text-taupe-escuro hover:underline">
                      {d.loja}
                    </Link>
                    <span className="block text-xs text-suave">
                      {d.proprietaria} · {d.cidade_uf}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">{d.vendedora}</td>
                  <td className="whitespace-nowrap text-right">{formatarBRL(d.total_centavos ?? 0)}</td>
                  <td className="whitespace-nowrap">{d.primeiro_pedido ? "1º pedido" : "Recompra"}</td>
                  <td className="whitespace-nowrap text-suave">{formatarData(d.criado_em.slice(0, 10))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lista.length > 300 && <p className="text-xs text-suave">Mostrando 300 de {lista.length}. O CSV traz todos.</p>}
      </section>
    </div>
  );
}
