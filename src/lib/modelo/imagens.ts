import { urlMidia } from "@/lib/midia";
import type { CaminhoImagem } from "./tipos";

/** "/modelo/x.jpg" é arquivo do app; o resto é caminho no bucket "midia". Roda no servidor e no navegador. */
export function urlImagem(caminho: CaminhoImagem): string {
  return caminho.startsWith("/") || caminho.startsWith("http") ? caminho : urlMidia(caminho);
}
