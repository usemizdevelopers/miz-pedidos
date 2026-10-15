import "server-only";
import { chromium, type Browser } from "playwright-core";
import type { Formato } from "@/lib/impressao";

// Um Chromium por processo, reaproveitado entre os PDFs.
let navegador: Promise<Browser> | null = null;

function obterNavegador(): Promise<Browser> {
  if (!navegador) {
    navegador = chromium.launch({ headless: true }).then((b) => {
      b.on("disconnected", () => (navegador = null));
      return b;
    });
    navegador.catch(() => (navegador = null));
  }
  return navegador;
}

const VIEWPORT: Record<Formato, { width: number; height: number }> = {
  a4: { width: 794, height: 1123 },
  celular: { width: 390, height: 845 },
};

/**
 * Renderiza /impressao/{id} no Chromium headless com a sessão de quem pediu
 * (o RLS vale também aqui) e devolve o PDF.
 */
export async function gerarPdf(opcoes: {
  origem: string;
  documentoId: string;
  formato: Formato;
  cookies: { name: string; value: string }[];
}): Promise<{ pdf: Buffer; paginas: number }> {
  const browser = await obterNavegador();
  const contexto = await browser.newContext({ viewport: VIEWPORT[opcoes.formato], deviceScaleFactor: 1 });
  try {
    await contexto.addCookies(opcoes.cookies.map((c) => ({ name: c.name, value: c.value, url: opcoes.origem })));
    const pagina = await contexto.newPage();
    await pagina.emulateMedia({ media: "print" });
    await pagina.goto(`${opcoes.origem}/impressao/${opcoes.documentoId}?formato=${opcoes.formato}`, { waitUntil: "load" });
    await pagina.waitForFunction(() => window.__paginado === true, null, { timeout: 30_000 });
    const paginas = await pagina.evaluate(() => window.__paginas ?? 0);
    const pdf = await pagina.pdf({ preferCSSPageSize: true, printBackground: true });
    return { pdf, paginas };
  } finally {
    await contexto.close();
  }
}
