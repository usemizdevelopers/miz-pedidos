"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type BlocoPdf = {
  chave: string;
  no: React.ReactNode;
  /** Ocupa uma folha inteira sozinho (pág. 1 da simulação em A4). */
  inteira?: boolean;
  /** Não fica sozinho no pé da página: desce junto com o bloco seguinte. */
  junto?: boolean;
  /** Começa folha nova se a atual já estiver mais da metade cheia. */
  quebra?: boolean;
};

declare global {
  interface Window {
    __paginado?: boolean;
    __paginas?: number;
  }
}

/** Distribui os blocos em folhas sem cortar nenhum. Pura função: testável. */
export function distribuir(
  blocos: Pick<BlocoPdf, "inteira" | "junto" | "quebra">[],
  medidas: { topo: number; base: number }[],
  capacidade: number,
): number[][] {
  const paginas: number[][] = [];
  let atual: number[] = [];
  const usado = (pagina: number[], ate: number) => (pagina.length ? medidas[ate].base - medidas[pagina[0]].topo : 0);
  const fechar = () => {
    if (atual.length) paginas.push(atual);
    atual = [];
  };

  blocos.forEach((b, i) => {
    if (b.inteira) {
      fechar();
      paginas.push([i]);
      return;
    }
    if (b.quebra && atual.length && usado(atual, atual.at(-1)!) > capacidade / 2) fechar();

    if (atual.length && usado([...atual, i], i) > capacidade) {
      // Leva junto os blocos "junto" do fim da página (título não fica órfão)
      const levar: number[] = [];
      while (atual.length > 1 && blocos[atual.at(-1)!].junto) levar.unshift(atual.pop()!);
      fechar();
      atual = levar;
    }
    atual.push(i);
  });
  fechar();
  return paginas;
}

export function Paginador({ blocos, rodape }: { blocos: BlocoPdf[]; rodape: React.ReactNode }) {
  const medidor = useRef<HTMLDivElement>(null);
  const [paginas, setPaginas] = useState<number[][] | null>(null);

  useLayoutEffect(() => {
    let cancelado = false;
    // Mede uma vez por montagem: depois de paginado a régua some. Quem quer repaginar
    // (a pré-visualização do editor) remonta o componente com outra key.
    const raiz = medidor.current;
    if (!raiz) return;
    const imagens = [...raiz.querySelectorAll("img")].map((img) => img.decode().catch(() => undefined));
    Promise.all([document.fonts.ready, ...imagens]).then(() => {
      if (cancelado) return;
      const conteudo = raiz.querySelector<HTMLElement>(".folha .conteudo")!;
      const estilo = getComputedStyle(conteudo);
      const capacidade = conteudo.clientHeight - parseFloat(estilo.paddingTop) - parseFloat(estilo.paddingBottom);
      const medidas = [...raiz.querySelectorAll<HTMLElement>(":scope > .pg-lista > .pg-bloco")].map((el) => ({
        topo: el.offsetTop,
        base: el.offsetTop + el.offsetHeight,
      }));
      setPaginas(distribuir(blocos, medidas, capacidade));
    });
    return () => {
      cancelado = true;
    };
  }, [blocos]);

  useEffect(() => {
    if (!paginas) return;
    const imagens = [...document.querySelectorAll<HTMLImageElement>("#documento img")].map((img) => img.decode().catch(() => undefined));
    Promise.all(imagens).then(() => {
      window.__paginas = paginas.length;
      window.__paginado = true;
    });
  }, [paginas]);

  if (!paginas) {
    return (
      <div ref={medidor} className="pg-medidor" aria-hidden>
        <section className="folha">
          <div className="conteudo" />
        </section>
        <div className="pg-lista">
          {blocos.map((b) => (
            <div key={b.chave} className="pg-bloco">
              {b.inteira ? null : b.no}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="documento">
      {paginas.map((indices, p) => (
        <section key={p} className={`folha ${indices.length === 1 && blocos[indices[0]].inteira ? "folha-inteira" : ""}`}>
          <div className="conteudo">
            {indices.map((i) => (
              <div key={blocos[i].chave} className="pg-bloco">
                {blocos[i].no}
              </div>
            ))}
          </div>
          <footer className="rodape">
            {rodape}
            <span className="pg-numero">
              {p + 1}/{paginas.length}
            </span>
          </footer>
        </section>
      ))}
    </div>
  );
}
