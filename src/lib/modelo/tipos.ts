// Modelo do PDF: JSON de blocos editáveis (sem HTML livre).
// Textos aceitam {variaveis}, **negrito** e quebra de linha (\n).

export type CardTexto = { titulo: string; subtitulo: string };

/** Caminho de imagem: "/modelo/x.jpg" (arquivo do app) ou caminho no bucket "midia". */
export type CaminhoImagem = string;

export type ModeloPdf = {
  textos: {
    // Simulação — página 1 (oferta)
    cabecalho_titulo: string;
    cabecalho_loja: string;
    selo_primeiro: string;
    selo_recompra: string;
    preparada_por: string;
    validade: string;
    titulo_primeiro: string;
    titulo_recompra: string;
    condicoes_titulo_primeiro: string;
    condicoes_titulo_recompra: string;
    frase_impacto: string;
    legenda_foto: string;
    assinatura: string;
    na_peca_titulo: string;
    na_parceria_titulo: string;
    // Simulação — conta do lucro e pedido
    conta_titulo: string;
    lucro_titulo: string;
    retorno: string;
    nota_estimativa: string;
    lema: string;
    pedido_titulo: string;
    nota_legal: string;
    reservado_titulo: string;
    reservado_nota: string;
    rodape: string;
    // Pedido confirmado
    confirmado_cabecalho: string;
    confirmado_selo: string;
    confirmado_titulo: string;
    confirmado_subtitulo: string;
    confirmado_imediato_titulo: string;
    confirmado_imediato_nota: string;
    pagamentos_titulo: string;
    passos_titulo: string;
    passos: [string, string, string];
    passos_sem_reservado: [string, string, string];
    completo_titulo: string;
    botao: string;
  };
  condicoes_primeiro: CardTexto[];
  condicoes_recompra: CardTexto[];
  chips_na_peca: string[];
  cards_na_parceria: CardTexto[];
  imagens: {
    logo: CaminhoImagem;
    foto_principal: CaminhoImagem;
    foto_polaroide: CaminhoImagem;
    moldura_polaroide: CaminhoImagem;
    clipe: CaminhoImagem;
    /** Polaroides da página 2: automático (3 peças de maior valor) ou 3 fotos fixas do admin. */
    polaroides_modo: "automatico" | "fixo";
    polaroides_fixas: [CaminhoImagem, CaminhoImagem, CaminhoImagem];
  };
  mensagens: {
    whatsapp_simulacao: string;
    whatsapp_pedido: string;
  };
};
