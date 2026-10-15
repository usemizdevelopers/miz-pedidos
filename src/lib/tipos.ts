export type Papel = "admin" | "vendedora";
export type Disponibilidade = "pronta_entrega" | "programada" | "indisponivel";

export type Perfil = {
  id: string;
  nome: string;
  email: string;
  whatsapp: string | null;
  papel: Papel;
  ativa: boolean;
  criado_em: string;
};

export type GradeTipo = {
  id: string;
  nome: string;
  composicao: string;
  pecas_por_grade: number;
  ativo: boolean;
};

export type Peca = {
  id: string;
  referencia: string;
  nome: string;
  preco_centavos: number;
  grade_tipo_id: string;
  composicao_tecido: string | null;
  ativa: boolean;
};

export type PecaCor = {
  id: string;
  peca_id: string;
  nome: string;
  hex: string;
  disponibilidade: Disponibilidade;
  previsao: string | null;
  ordem: number;
};

export type PecaFoto = {
  id: string;
  peca_id: string;
  storage_path: string;
  ordem: number;
};

export type CondicoesComerciais = {
  markup: number;
  fator_conservador: number;
  despacho_horas: number;
  expedicao: string;
  primeiro_pedido_minimo: string;
  primeiro_frete_gratis: boolean;
  primeiro_parcelas_max: number;
  recompra_pedido_minimo: string;
  recompra_frete_gratis_minimo_centavos: number;
  recompra_parcelas_max: number;
  outras_formas_pagamento: string;
  atualizado_em: string;
};

export const ROTULO_DISPONIBILIDADE: Record<Disponibilidade, string> = {
  pronta_entrega: "Pronta entrega",
  programada: "Programada",
  indisponivel: "Indisponível",
};

/** Estado devolvido pelas server actions de formulário. */
export type EstadoForm = { erro?: string; ok?: string; t?: number };
