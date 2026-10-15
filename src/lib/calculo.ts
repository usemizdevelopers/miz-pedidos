// Motor de cálculo dos pedidos Miz. Função pura, só inteiros (centavos).
// Roda igual no navegador (prévia ao vivo) e no servidor.

export type DisponibilidadeItem = "pronta_entrega" | "programada";

export type ItemEntrada = {
  pecaId: string;
  pecaNome: string;
  corId: string;
  corNome: string;
  corHex: string;
  precoCentavos: number;
  pecasPorGrade: number;
  gradeComposicao: string;
  nGrades: number;
  disponibilidade: DisponibilidadeItem;
  /** "AAAA-MM-DD", só para programados */
  previsao: string | null;
};

export type ParametrosCalculo = {
  primeiroPedido: boolean;
  nParcelas: number;
  /** Ex.: 2.2 (numeric(5,2) do banco) */
  markup: number;
  /** Ex.: 0.94 (numeric(4,3) do banco) */
  fatorConservador: number;
  primeiroFreteGratis: boolean;
  recompraFreteMinimoCentavos: number;
};

export type ItemCalculado = ItemEntrada & {
  pecas: number;
  valorGradeCentavos: number;
  subtotalCentavos: number;
  etiquetaSugeridaCentavos: number;
};

/** Uma linha do PDF: a peça com todas as cores daquele bloco. */
export type LinhaPeca = {
  pecaId: string;
  pecaNome: string;
  precoCentavos: number;
  pecasPorGrade: number;
  gradeComposicao: string;
  valorGradeCentavos: number;
  cores: { corId: string; nome: string; hex: string; nGrades: number; previsao: string | null }[];
  grades: number;
  pecas: number;
  subtotalCentavos: number;
};

export type Bloco = {
  itens: ItemCalculado[];
  linhas: LinhaPeca[];
  totalCentavos: number;
  parcelaCentavos: number;
  grades: number;
  pecas: number;
};

/** Itens programados que chegam na mesma data: pagos e despachados juntos, na chegada. */
export type GrupoReservado = Bloco & { previsao: string | null };

export type BlocoReservado = Bloco & {
  /** A previsão mais tardia entre os itens (chegada do último grupo). */
  previsao: string | null;
  previsoes: string[];
  /** Um grupo por data de chegada, em ordem cronológica. */
  grupos: GrupoReservado[];
};

export type ResultadoPedido = {
  imediato: Bloco;
  reservado: BlocoReservado;
  totalCentavos: number;
  grades: number;
  pecas: number;
  nParcelas: number;
  markup: number;
  vendaEstimadaCentavos: number;
  lucroBrutoCentavos: number;
  vendaConservadorCentavos: number;
  lucroConservadorCentavos: number;
  frete: "gratis" | "a_cotar";
  /** Em qual peça vendida a cliente já tem lucro, pela grade predominante (mais peças). */
  lucroNaPeca: number | null;
  gradesPresentes: { composicao: string; pecasPorGrade: number; lucroNaPeca: number }[];
};

// ---------------------------------------------------------------- inteiros

/** a / b arredondado (meio para cima), a ≥ 0, b > 0, sem ponto flutuante. */
export function dividirArredondado(a: number, b: number): number {
  return Math.floor((2 * a + b) / (2 * b));
}

/** Teto de a / b para inteiros positivos. */
function dividirTeto(a: number, b: number): number {
  return Math.floor((a + b - 1) / b);
}

/** 2.2 → 220 (centésimos); 0.94 → 940 com casas = 3. */
export function paraInteiro(valor: number, casas: number): number {
  return Math.round(valor * 10 ** casas);
}

/** valor × markup, com markup em centésimos (2,20 → 220). */
export function aplicarMarkup(centavos: number, markup: number): number {
  return dividirArredondado(centavos * paraInteiro(markup, 2), 100);
}

/** Em qual peça vendida o lucro começa: teto(peças por grade ÷ markup). Grade 5 → 3ª; grade 4 → 2ª. */
export function lucroNaPeca(pecasPorGrade: number, markup: number): number {
  return dividirTeto(pecasPorGrade * 100, paraInteiro(markup, 2));
}

// ---------------------------------------------------------------- cálculo

export function calcularItem(item: ItemEntrada, markup: number): ItemCalculado {
  const valorGradeCentavos = item.precoCentavos * item.pecasPorGrade;
  return {
    ...item,
    pecas: item.nGrades * item.pecasPorGrade,
    valorGradeCentavos,
    subtotalCentavos: valorGradeCentavos * item.nGrades,
    etiquetaSugeridaCentavos: aplicarMarkup(item.precoCentavos, markup),
  };
}

function agruparLinhas(itens: ItemCalculado[]): LinhaPeca[] {
  const linhas = new Map<string, LinhaPeca>();
  for (const i of itens) {
    const chave = `${i.pecaId}|${i.precoCentavos}|${i.pecasPorGrade}`;
    let linha = linhas.get(chave);
    if (!linha) {
      linha = {
        pecaId: i.pecaId,
        pecaNome: i.pecaNome,
        precoCentavos: i.precoCentavos,
        pecasPorGrade: i.pecasPorGrade,
        gradeComposicao: i.gradeComposicao,
        valorGradeCentavos: i.valorGradeCentavos,
        cores: [],
        grades: 0,
        pecas: 0,
        subtotalCentavos: 0,
      };
      linhas.set(chave, linha);
    }
    linha.cores.push({ corId: i.corId, nome: i.corNome, hex: i.corHex, nGrades: i.nGrades, previsao: i.previsao });
    linha.grades += i.nGrades;
    linha.pecas += i.pecas;
    linha.subtotalCentavos += i.subtotalCentavos;
  }
  return [...linhas.values()];
}

function montarBloco(itens: ItemCalculado[], nParcelas: number): Bloco {
  const totalCentavos = itens.reduce((s, i) => s + i.subtotalCentavos, 0);
  return {
    itens,
    linhas: agruparLinhas(itens),
    totalCentavos,
    parcelaCentavos: dividirArredondado(totalCentavos, nParcelas),
    grades: itens.reduce((s, i) => s + i.nGrades, 0),
    pecas: itens.reduce((s, i) => s + i.pecas, 0),
  };
}

export function calcularPedido(entrada: ItemEntrada[], p: ParametrosCalculo): ResultadoPedido {
  if (!Number.isInteger(p.nParcelas) || p.nParcelas < 1) throw new Error("Número de parcelas inválido.");

  const itens = entrada.filter((i) => i.nGrades > 0).map((i) => calcularItem(i, p.markup));

  const imediato = montarBloco(
    itens.filter((i) => i.disponibilidade === "pronta_entrega"),
    p.nParcelas,
  );
  const itensReservados = itens.filter((i) => i.disponibilidade === "programada");
  const previsoes = [...new Set(itensReservados.map((i) => i.previsao).filter((d): d is string => Boolean(d)))].sort();
  const datasGrupos = [...new Set(itensReservados.map((i) => i.previsao))].sort((a, b) => (a ?? "9999").localeCompare(b ?? "9999"));
  const reservado: BlocoReservado = {
    ...montarBloco(itensReservados, p.nParcelas),
    previsoes,
    previsao: previsoes.at(-1) ?? null,
    grupos: datasGrupos.map((data) => ({
      ...montarBloco(
        itensReservados.filter((i) => i.previsao === data),
        p.nParcelas,
      ),
      previsao: data,
    })),
  };

  const totalCentavos = imediato.totalCentavos + reservado.totalCentavos;
  const vendaEstimadaCentavos = aplicarMarkup(totalCentavos, p.markup);
  const vendaConservadorCentavos = dividirArredondado(
    vendaEstimadaCentavos * paraInteiro(p.fatorConservador, 3),
    1000,
  );

  const freteGratis = p.primeiroPedido
    ? p.primeiroFreteGratis
    : totalCentavos >= p.recompraFreteMinimoCentavos;

  // Grade predominante: a que soma mais peças no pedido (empate: a maior grade)
  const pecasPorTipo = new Map<string, { composicao: string; pecasPorGrade: number; pecas: number }>();
  for (const i of itens) {
    const chave = `${i.gradeComposicao}|${i.pecasPorGrade}`;
    const atual = pecasPorTipo.get(chave) ?? { composicao: i.gradeComposicao, pecasPorGrade: i.pecasPorGrade, pecas: 0 };
    atual.pecas += i.pecas;
    pecasPorTipo.set(chave, atual);
  }
  const tipos = [...pecasPorTipo.values()].sort((a, b) => b.pecas - a.pecas || b.pecasPorGrade - a.pecasPorGrade);

  return {
    imediato,
    reservado,
    totalCentavos,
    grades: imediato.grades + reservado.grades,
    pecas: imediato.pecas + reservado.pecas,
    nParcelas: p.nParcelas,
    markup: p.markup,
    vendaEstimadaCentavos,
    lucroBrutoCentavos: vendaEstimadaCentavos - totalCentavos,
    vendaConservadorCentavos,
    lucroConservadorCentavos: vendaConservadorCentavos - totalCentavos,
    frete: freteGratis ? "gratis" : "a_cotar",
    lucroNaPeca: tipos.length ? lucroNaPeca(tipos[0].pecasPorGrade, p.markup) : null,
    gradesPresentes: tipos.map((t) => ({
      composicao: t.composicao,
      pecasPorGrade: t.pecasPorGrade,
      lucroNaPeca: lucroNaPeca(t.pecasPorGrade, p.markup),
    })),
  };
}
