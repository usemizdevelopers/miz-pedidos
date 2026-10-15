/* eslint-disable @next/next/no-img-element -- o PDF é gerado pelo Chromium; <img> simples é o certo aqui */
import type { Bloco, GrupoReservado, LinhaPeca, ResultadoPedido } from "@/lib/calculo";
import { formatarBRL } from "@/lib/dinheiro";
import { formatarData } from "@/lib/datas";
import { aplicarVariaveis, interpretarTexto } from "@/lib/modelo/variaveis";
import type { BlocoPdf } from "./paginador";

/** Ícone de "ok" desenhado (a Quicksand não tem o caractere ✓). */
export function Check() {
  return (
    <svg className="check" viewBox="0 0 12 12" aria-hidden>
      <path d="M2 6.4 4.8 9.2 10 3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Texto do modelo: {variaveis}, **negrito** e \n. */
export function T({ t, vars, extras, className }: { t: string; vars: Record<string, string>; extras?: Record<string, string>; className?: string }) {
  const linhas = interpretarTexto(aplicarVariaveis(t, vars, extras));
  return (
    <p className={className}>
      {linhas.map((linha, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {linha.map((trecho, j) => (trecho.negrito ? <strong key={j}>{trecho.texto}</strong> : <span key={j}>{trecho.texto}</span>))}
        </span>
      ))}
    </p>
  );
}

function listaCores(linha: LinhaPeca): string {
  const nomes = linha.cores.map((c) => `${c.nome.toLowerCase()}${c.nGrades > 1 ? ` (${c.nGrades} grades)` : ""}`);
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}` : (nomes[0] ?? "");
}

export function Pontos({ linha }: { linha: LinhaPeca }) {
  const impar = linha.cores.length % 2 === 1;
  return (
    <div className="pontos" aria-hidden>
      {linha.cores.map((c, i) => (
        <span key={c.corId} className={`ponto ${impar && i === 0 && linha.cores.length > 1 ? "primeiro-impar" : ""}`} style={{ backgroundColor: c.hex }} />
      ))}
    </div>
  );
}

export function Item({ linha }: { linha: LinhaPeca }) {
  return (
    <div className="item">
      <h3 className="item-nome">{linha.pecaNome}</h3>
      <div className="item-corpo">
        <Pontos linha={linha} />
        <div className="item-texto">
          <p>Cores: {listaCores(linha)}.</p>
          <p>
            <strong>
              {linha.grades} {linha.grades === 1 ? "grade" : "grades"}
            </strong>{" "}
            × {formatarBRL(linha.valorGradeCentavos)} – {linha.pecas} peças a {formatarBRL(linha.precoCentavos)}
          </p>
        </div>
      </div>
      <p className="item-valor">{formatarBRL(linha.subtotalCentavos)}</p>
    </div>
  );
}

export function Faixa({ rotulo, bloco, nParcelas, frete }: { rotulo: [string, string]; bloco: Bloco; nParcelas: number; frete: string }) {
  return (
    <div className="faixa">
      <div>
        <span className="rotulo-faixa">
          {rotulo[0]}
          <br />
          {rotulo[1]}
        </span>
        <span className="valor">{formatarBRL(bloco.totalCentavos)}</span>
      </div>
      <span className="divisor" />
      <div className="parcela valor">
        {nParcelas}x {formatarBRL(bloco.parcelaCentavos)}
      </div>
      <span className="divisor" />
      <div className="frete">
        <span className="rotulo-faixa">Frete</span>
        <strong className="valor">{frete}</strong>
      </div>
    </div>
  );
}

export function textoFrete(r: ResultadoPedido) {
  return r.frete === "gratis" ? "R$ 0,00" : "A cotar";
}

/** Legenda das grades presentes + contagem + faixa de total + nota legal. */
export function Fechamento({
  bloco,
  r,
  rotulo,
  nota,
  vars,
}: {
  bloco: Bloco;
  r: ResultadoPedido;
  rotulo: [string, string];
  nota?: string;
  vars: Record<string, string>;
}) {
  const presentes = r.gradesPresentes.filter((g) => bloco.itens.some((i) => i.pecasPorGrade === g.pecasPorGrade && i.gradeComposicao === g.composicao));
  return (
    <div className="fechamento">
      <div className="legenda">
        <p>
          {presentes.map((g, i) => (
            <span key={g.composicao}>
              {i > 0 && <br />}Grade = {g.pecasPorGrade} peças por cor: {g.composicao}
            </span>
          ))}
        </p>
        <p className="contagem">
          {bloco.grades} grades
          <br />
          {bloco.pecas} peças
        </p>
      </div>
      <Faixa rotulo={rotulo} bloco={bloco} nParcelas={r.nParcelas} frete={textoFrete(r)} />
      {nota && <T t={nota} vars={vars} className="nota-legal" />}
    </div>
  );
}

/** Seção "Reservado para você": um sub-bloco por data de chegada. */
export function blocosReservado({
  r,
  vars,
  tituloModelo,
  notaModelo,
  quebraPreferida,
}: {
  r: ResultadoPedido;
  vars: Record<string, string>;
  tituloModelo: string;
  notaModelo: string;
  quebraPreferida?: boolean;
}): BlocoPdf[] {
  const varios = r.reservado.grupos.length > 1;
  return r.reservado.grupos.flatMap((g: GrupoReservado, gi): BlocoPdf[] => [
    {
      // Título da seção + nota da data andam junto com o 1º item
      chave: `res-cab-${gi}`,
      junto: true,
      quebra: gi === 0 && quebraPreferida,
      no: (
        <div className={gi === 0 ? "cab-reservado" : "cab-reservado subgrupo"}>
          {gi === 0 && <T t={tituloModelo} vars={vars} className="titulo-reservado" />}
          <T t={notaModelo} vars={vars} extras={{ previsao: formatarData(g.previsao, true) }} className="nota-reservado" />
        </div>
      ),
    },
    ...g.linhas.map((l) => ({ chave: `res-${gi}-${l.pecaId}-${l.precoCentavos}`, no: <Item linha={l} /> })),
    {
      chave: `res-fx-${gi}`,
      no: (
        <div className="grupo-reservado">
          <Faixa
            rotulo={varios ? ["Reservado", formatarData(g.previsao, true)] : ["Total do", "reservado"]}
            bloco={g}
            nParcelas={r.nParcelas}
            frete={textoFrete(r)}
          />
        </div>
      ),
    },
  ]);
}

export function Polaroides({ fotos, moldura }: { fotos: string[]; moldura: string }) {
  return (
    <div className="polaroides">
      {fotos.map((f, i) => (
        <div key={i} className="polaroide" style={{ backgroundImage: `url(${moldura})` }}>
          <img src={f} alt="" />
        </div>
      ))}
    </div>
  );
}

/** "Grade de 5 peças (2P / 2M / 1G)." + as outras grades presentes. */
export function notaGrades(r: ResultadoPedido): string {
  const [principal, ...outras] = r.gradesPresentes;
  if (!principal) return "";
  const linhas = [`Grade de ${principal.pecasPorGrade} peças (${principal.composicao.replace(/ \+ /g, " / ")}).`];
  for (const g of outras) linhas.push(`Na grade de ${g.pecasPorGrade}, o lucro começa já na ${g.lucroNaPeca}ª.`);
  return linhas.join("\n");
}
