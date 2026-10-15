import { describe, expect, it } from "vitest";
import { esquemaModelo, problemasDoModelo } from "./esquema";
import { MODELO_PADRAO } from "./padrao";
import type { ModeloPdf } from "./tipos";

const copia = (): ModeloPdf => structuredClone(MODELO_PADRAO);

describe("validação do modelo", () => {
  it("o modelo padrão é válido e sem problemas", () => {
    expect(esquemaModelo.safeParse(MODELO_PADRAO).success).toBe(true);
    expect(problemasDoModelo(MODELO_PADRAO)).toEqual([]);
  });

  it("salvar não descarta nenhum texto do modelo", () => {
    const r = esquemaModelo.safeParse(MODELO_PADRAO);
    expect(Object.keys(r.data!.textos).sort()).toEqual(Object.keys(MODELO_PADRAO.textos).sort());
  });

  it("aponta variável inexistente com o campo", () => {
    const m = copia();
    m.textos.titulo_primeiro = "{proprietaria}, oi {lojaa}";
    expect(problemasDoModelo(m)).toEqual([{ campo: "textos.titulo_primeiro", problema: "Variável {lojaa} não existe." }]);
  });

  it("{previsao} só vale na nota do reservado", () => {
    const m = copia();
    m.textos.rodape = "Chega {previsao}";
    expect(problemasDoModelo(m)).toHaveLength(1);
    expect(problemasDoModelo(MODELO_PADRAO).some((p) => p.campo === "textos.reservado_nota")).toBe(false);
  });

  it("aponta negrito sem fechar", () => {
    const m = copia();
    m.cards_na_parceria[0].subtitulo = "Cliente **vai para a loja.";
    expect(problemasDoModelo(m)[0].problema).toContain("Negrito");
  });

  it("trava as quantidades que o layout precisa", () => {
    const m = copia();
    m.chips_na_peca.push("quinto chip");
    expect(esquemaModelo.safeParse(m).success).toBe(false);
  });

  it("recusa imagem fora do bucket/pasta do modelo", () => {
    const m = copia();
    m.imagens.logo = "https://site-qualquer.com/logo.png";
    expect(esquemaModelo.safeParse(m).success).toBe(false);
    m.imagens.logo = "modelo/3f2a.webp";
    expect(esquemaModelo.safeParse(m).success).toBe(true);
  });

  it("recusa texto longo demais", () => {
    const m = copia();
    m.chips_na_peca[0] = "x".repeat(29);
    expect(esquemaModelo.safeParse(m).success).toBe(false);
  });
});
