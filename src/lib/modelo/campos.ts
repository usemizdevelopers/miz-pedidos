import type { ModeloPdf } from "./tipos";

type ChaveTexto = Exclude<keyof ModeloPdf["textos"], "passos" | "passos_sem_reservado">;

export type CampoTexto = { chave: ChaveTexto; rotulo: string; linhas?: number };

/** Seções do editor, na ordem em que aparecem no PDF. */
export const SECOES_TEXTO: { titulo: string; documento: "simulacao" | "confirmado"; campos: CampoTexto[] }[] = [
  {
    titulo: "Simulação · cabeçalho",
    documento: "simulacao",
    campos: [
      { chave: "cabecalho_titulo", rotulo: "Título do cabeçalho" },
      { chave: "cabecalho_loja", rotulo: "Linha da loja (simulação e pedido)" },
      { chave: "selo_primeiro", rotulo: "Selo · primeiro pedido" },
      { chave: "selo_recompra", rotulo: "Selo · recompra" },
      { chave: "preparada_por", rotulo: "Preparada por" },
      { chave: "validade", rotulo: "Validade" },
    ],
  },
  {
    titulo: "Simulação · oferta (página 1)",
    documento: "simulacao",
    campos: [
      { chave: "titulo_primeiro", rotulo: "Título · primeiro pedido", linhas: 3 },
      { chave: "titulo_recompra", rotulo: "Título · recompra", linhas: 3 },
      { chave: "condicoes_titulo_primeiro", rotulo: "Chamada das condições · primeiro pedido", linhas: 2 },
      { chave: "condicoes_titulo_recompra", rotulo: "Chamada das condições · recompra", linhas: 2 },
      { chave: "frase_impacto", rotulo: "Frase de impacto", linhas: 3 },
      { chave: "legenda_foto", rotulo: "Legenda da foto principal", linhas: 2 },
      { chave: "assinatura", rotulo: "Assinatura cursiva (na polaroide)" },
      { chave: "na_peca_titulo", rotulo: "Título “Na peça”" },
      { chave: "na_parceria_titulo", rotulo: "Título “Na parceria”" },
    ],
  },
  {
    titulo: "Simulação · conta do lucro e pedido",
    documento: "simulacao",
    campos: [
      { chave: "conta_titulo", rotulo: "Título da conta" },
      { chave: "lucro_titulo", rotulo: "Frase do lucro na peça", linhas: 2 },
      { chave: "retorno", rotulo: "Frase do retorno", linhas: 3 },
      { chave: "nota_estimativa", rotulo: "Nota da estimativa", linhas: 2 },
      { chave: "lema", rotulo: "Lema" },
      { chave: "pedido_titulo", rotulo: "Título da lista do pedido", linhas: 2 },
      { chave: "nota_legal", rotulo: "Nota legal (abaixo do total)", linhas: 2 },
      { chave: "reservado_titulo", rotulo: "Título do reservado" },
      { chave: "reservado_nota", rotulo: "Nota de cada data do reservado (use {previsao})" },
      { chave: "rodape", rotulo: "Rodapé de todas as páginas", linhas: 2 },
    ],
  },
  {
    titulo: "Pedido confirmado",
    documento: "confirmado",
    campos: [
      { chave: "confirmado_cabecalho", rotulo: "Título do cabeçalho" },
      { chave: "confirmado_selo", rotulo: "Selo" },
      { chave: "confirmado_titulo", rotulo: "Título", linhas: 2 },
      { chave: "confirmado_subtitulo", rotulo: "Subtítulo", linhas: 2 },
      { chave: "confirmado_imediato_titulo", rotulo: "Título do envio imediato" },
      { chave: "confirmado_imediato_nota", rotulo: "Nota de despacho" },
      { chave: "pagamentos_titulo", rotulo: "Título dos pagamentos" },
      { chave: "passos_titulo", rotulo: "Título dos próximos passos" },
      { chave: "completo_titulo", rotulo: "Título do pedido completo" },
      { chave: "botao", rotulo: "Texto do botão" },
    ],
  },
];

export const IMAGENS: { chave: "logo" | "foto_principal" | "foto_polaroide" | "moldura_polaroide" | "clipe"; rotulo: string }[] = [
  { chave: "logo", rotulo: "Logo" },
  { chave: "foto_principal", rotulo: "Foto principal (pág. 1)" },
  { chave: "foto_polaroide", rotulo: "Foto da polaroide (pág. 1)" },
  { chave: "moldura_polaroide", rotulo: "Moldura das polaroides" },
  { chave: "clipe", rotulo: "Clipe" },
];
