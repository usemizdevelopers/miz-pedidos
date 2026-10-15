// Caso de teste obrigatório: pedido da Dulcinéa (Pura Tentação, Campestre/MG).
// Primeiro pedido, 6x, uma grade por cor de cada peça do catálogo inicial.
import type { ItemEntrada, ParametrosCalculo } from "@/lib/calculo";

const GRADE_5 = { pecasPorGrade: 5, gradeComposicao: "2P + 2M + 1G" };

type Peca = { id: string; nome: string; preco: number; cores: [string, string][]; previsao?: string };

const PECAS: Peca[] = [
  { id: "BL0001", nome: "Blusa Mia", preco: 4999, cores: [["Azul bebê", "#C9DCEB"], ["Verde musgo", "#6A8F2E"], ["Preto", "#111111"]] },
  { id: "BL0006", nome: "Blusa Mia Tule", preco: 5999, cores: [["Off white", "#F4F1EA"], ["Marrom cacau", "#6B4433"], ["Preta", "#111111"], ["Verde musgo", "#6A8F2E"]] },
  { id: "CT0001", nome: "Camiseta Oversize Liz", preco: 5999, cores: [["Off white", "#F4F1EA"], ["Marrom", "#6B4433"], ["Azul bebê", "#C9DCEB"], ["Verde menta", "#9CCBB0"]] },
  { id: "BL0003", nome: "Blusa Renda Maria", preco: 7999, cores: [["Branco", "#FFFFFF"], ["Preto", "#111111"]] },
  { id: "BL0004", nome: "Blusa Barrada Olívia", preco: 7999, cores: [["Branco", "#FFFFFF"], ["Preto", "#111111"]] },
  { id: "RE0001", nome: "Regata Chloé", preco: 5499, cores: [["Preto", "#111111"], ["Off white", "#F4F1EA"], ["Marrom", "#6B4433"], ["Verde", "#6A8F2E"]] },
  { id: "VD002", nome: "Vestido Detalhe Ribana Chloé", preco: 9999, cores: [["Marrom", "#6B4433"], ["Verde menta", "#9CCBB0"], ["Preto", "#111111"]] },
  {
    id: "RE0002",
    nome: "Regata Canelada Basic",
    preco: 3699,
    previsao: "2026-10-20",
    cores: [["Marrom", "#6B4433"], ["Azul marinho", "#1F2D4D"], ["Off white", "#F4F1EA"], ["Preto", "#111111"]],
  },
];

export const ITENS_DULCINEA: ItemEntrada[] = PECAS.flatMap((p) =>
  p.cores.map(([nome, hex]) => ({
    pecaId: p.id,
    pecaNome: p.nome,
    corId: `${p.id}-${nome}`,
    corNome: nome,
    corHex: hex,
    precoCentavos: p.preco,
    ...GRADE_5,
    nGrades: 1,
    disponibilidade: p.previsao ? ("programada" as const) : ("pronta_entrega" as const),
    previsao: p.previsao ?? null,
  })),
);

export const PARAMETROS_DULCINEA: ParametrosCalculo = {
  primeiroPedido: true,
  nParcelas: 6,
  markup: 2.2,
  fatorConservador: 0.94,
  primeiroFreteGratis: true,
  recompraFreteMinimoCentavos: 300000,
};

export const CLIENTE_DULCINEA = {
  proprietaria: "Dulcinéa",
  loja: "Pura Tentação",
  cidade_uf: "Campestre/MG",
};
