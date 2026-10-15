import { z } from "zod";
import { MODELO_PADRAO } from "./padrao";
import type { ModeloPdf } from "./tipos";
import { VARIAVEIS_DISPONIVEIS } from "./variaveis";

// Quantidades fixas: a página 1 em A4 tem posições desenhadas para elas (o layout não quebra).
export const QTD_CONDICOES = 3;
export const QTD_CHIPS = 4;
export const QTD_CARDS = 3;

const texto = (max = 300) => z.string().trim().max(max, `Texto com mais de ${max} caracteres.`);
const card = z.object({ titulo: texto(40).min(1, "Título do card vazio."), subtitulo: texto(80) });

/** Arquivo do protótipo (/modelo/x) ou upload do admin no bucket (modelo/x). */
const caminho = z.string().regex(/^\/?modelo\/[\w.-]+$/, "Imagem inválida.");

// "passos" e "passos_sem_reservado" são listas (validadas abaixo); "passos_titulo" é texto comum
const chavesTexto = Object.keys(MODELO_PADRAO.textos).filter((k) => k !== "passos" && k !== "passos_sem_reservado") as (keyof ModeloPdf["textos"])[];

export const esquemaModelo = z.object({
  textos: z.object({
    ...Object.fromEntries(chavesTexto.map((k) => [k, texto()])),
    passos: z.tuple([texto(160), texto(160), texto(160)]),
    passos_sem_reservado: z.tuple([texto(160), texto(160), texto(160)]),
  }),
  condicoes_primeiro: z.array(card).length(QTD_CONDICOES),
  condicoes_recompra: z.array(card).length(QTD_CONDICOES),
  chips_na_peca: z.array(texto(28).min(1, "Chip vazio.")).length(QTD_CHIPS),
  cards_na_parceria: z.array(card).length(QTD_CARDS),
  imagens: z.object({
    logo: caminho,
    foto_principal: caminho,
    foto_polaroide: caminho,
    moldura_polaroide: caminho,
    clipe: caminho,
    polaroides_modo: z.enum(["automatico", "fixo"]),
    polaroides_fixas: z.tuple([caminho, caminho, caminho]),
  }),
  mensagens: z.object({
    whatsapp_simulacao: texto(1000).min(1, "Mensagem de WhatsApp vazia."),
    whatsapp_pedido: texto(1000).min(1, "Mensagem de WhatsApp vazia."),
  }),
});

/** Todos os textos do modelo com o "endereço" de cada um (para apontar o erro no editor). */
export function textosDoModelo(m: ModeloPdf): { campo: string; texto: string }[] {
  const lista: { campo: string; texto: string }[] = [];
  for (const [k, v] of Object.entries(m.textos)) {
    if (Array.isArray(v)) v.forEach((t, i) => lista.push({ campo: `textos.${k}.${i}`, texto: t }));
    else lista.push({ campo: `textos.${k}`, texto: v });
  }
  for (const grupo of ["condicoes_primeiro", "condicoes_recompra", "cards_na_parceria"] as const) {
    m[grupo].forEach((c, i) => {
      lista.push({ campo: `${grupo}.${i}.titulo`, texto: c.titulo });
      lista.push({ campo: `${grupo}.${i}.subtitulo`, texto: c.subtitulo });
    });
  }
  m.chips_na_peca.forEach((t, i) => lista.push({ campo: `chips_na_peca.${i}`, texto: t }));
  lista.push({ campo: "mensagens.whatsapp_simulacao", texto: m.mensagens.whatsapp_simulacao });
  lista.push({ campo: "mensagens.whatsapp_pedido", texto: m.mensagens.whatsapp_pedido });
  return lista;
}

const PERMITIDAS = new Set<string>(VARIAVEIS_DISPONIVEIS);

/** {variaveis} que não existem (erro de digitação) ou **negrito** sem fechar. */
export function problemasDoModelo(m: ModeloPdf): { campo: string; problema: string }[] {
  const problemas: { campo: string; problema: string }[] = [];
  for (const { campo, texto: t } of textosDoModelo(m)) {
    for (const [, nome] of t.matchAll(/\{([^}]*)\}/g)) {
      // {previsao} só existe na nota de cada data do reservado
      if (PERMITIDAS.has(nome) || (nome === "previsao" && campo === "textos.reservado_nota")) continue;
      problemas.push({ campo, problema: `Variável {${nome}} não existe.` });
    }
    if ((t.match(/\*\*/g)?.length ?? 0) % 2 === 1) problemas.push({ campo, problema: "Negrito (**) aberto e não fechado." });
  }
  return problemas;
}
