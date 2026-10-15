/* eslint-disable @next/next/no-img-element -- o PDF é gerado pelo Chromium; <img> simples é o certo aqui */
import { formatarBRL } from "@/lib/dinheiro";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { formatarCnpj } from "@/lib/cnpj";
import type { DadosImpressao, Formato } from "@/lib/impressao";
import { urlImagem } from "@/lib/modelo/imagens";
import { Check, Fechamento, Item, Polaroides, T, blocosReservado, notaGrades, textoFrete } from "./blocos";
import { Paginador, type BlocoPdf } from "./paginador";

type Props = { dados: DadosImpressao; formato: Formato };

// ============================================================ Simulação: oferta

function Condicoes({ dados }: { dados: DadosImpressao }) {
  const { modelo: m, vars, documento: d } = dados;
  const lista = d.primeiro_pedido ? m.condicoes_primeiro : m.condicoes_recompra;
  return (
    <div className="condicoes">
      {lista.map((c, i) => (
        <div key={i} className="condicao pilula">
          <div className="condicao-linha">
            <Check />
            <T t={c.titulo} vars={vars} className="condicao-titulo" />
          </div>
          <T t={c.subtitulo} vars={vars} className="condicao-sub" />
        </div>
      ))}
    </div>
  );
}

function Chips({ dados }: { dados: DadosImpressao }) {
  return (
    <div className="chips">
      {dados.modelo.chips_na_peca.map((c, i) => (
        <span key={i} className="chip pilula">
          {c}
        </span>
      ))}
    </div>
  );
}

function Cards({ dados }: { dados: DadosImpressao }) {
  return (
    <div className="cards">
      {dados.modelo.cards_na_parceria.map((c, i) => (
        <div key={i} className="card pilula">
          <T t={c.titulo} vars={dados.vars} className="card-titulo" />
          <T t={c.subtitulo} vars={dados.vars} className="card-sub" />
        </div>
      ))}
    </div>
  );
}

function OfertaA4({ dados }: { dados: DadosImpressao }) {
  const { modelo: m, vars, documento: d } = dados;
  const tx = m.textos;
  const primeiro = d.primeiro_pedido;
  return (
    <div className="oferta-a4">
      <img className="logo" src={urlImagem(m.imagens.logo)} alt="Miz" />
      <div className="cab-dir">
        <p className="maiusculas">
          <strong>{tx.cabecalho_titulo}</strong>
        </p>
        <T t={tx.cabecalho_loja} vars={vars} />
      </div>
      <div className="cab-linha linha-taupe" />
      <p className="selo">{primeiro ? tx.selo_primeiro : tx.selo_recompra}</p>
      <div className="preparada">
        <T t={tx.preparada_por} vars={vars} />
        {d.validade && <T t={tx.validade} vars={vars} />}
      </div>

      <T t={primeiro ? tx.titulo_primeiro : tx.titulo_recompra} vars={vars} className="titulo" />
      <T t={primeiro ? tx.condicoes_titulo_primeiro : tx.condicoes_titulo_recompra} vars={vars} className="condicoes-titulo" />
      <Condicoes dados={dados} />
      <T t={tx.frase_impacto} vars={vars} className="frase" />

      <div className="foto-principal">
        <img src={urlImagem(m.imagens.foto_principal)} alt="" />
      </div>
      <T t={tx.legenda_foto} vars={vars} className="legenda-foto" />

      <div className="polaroide-grande" style={{ backgroundImage: `url(${urlImagem(m.imagens.moldura_polaroide)})` }}>
        <img src={urlImagem(m.imagens.foto_polaroide)} alt="" />
        <p className="assinatura cursiva">{tx.assinatura}</p>
      </div>
      <img className="clipe" src={urlImagem(m.imagens.clipe)} alt="" />

      <p className="titulo-secao na-peca-titulo">{tx.na_peca_titulo}</p>
      <Chips dados={dados} />
      <p className="titulo-secao na-parceria-titulo">{tx.na_parceria_titulo}</p>
      <Cards dados={dados} />
    </div>
  );
}

function blocosOfertaCelular(dados: DadosImpressao): BlocoPdf[] {
  const { modelo: m, vars, documento: d } = dados;
  const tx = m.textos;
  const primeiro = d.primeiro_pedido;
  return [
    {
      chave: "of-cab",
      no: (
        <div>
          <div className="cab-cel">
            <img className="logo" src={urlImagem(m.imagens.logo)} alt="Miz" />
            <div className="cab-dir">
              <p className="maiusculas">
                <strong>{tx.cabecalho_titulo}</strong>
              </p>
              <T t={tx.cabecalho_loja} vars={vars} />
            </div>
          </div>
          <div className="linha-meta">
            <p>{primeiro ? tx.selo_primeiro : tx.selo_recompra}</p>
            <div className="direita">
              <T t={tx.preparada_por} vars={vars} />
              {d.validade && <T t={tx.validade} vars={vars} />}
            </div>
          </div>
          <T t={primeiro ? tx.titulo_primeiro : tx.titulo_recompra} vars={vars} className="titulo-oferta" />
        </div>
      ),
    },
    {
      chave: "of-foto",
      no: (
        <div>
          <div className="foto-cel">
            <img src={urlImagem(m.imagens.foto_principal)} alt="" />
          </div>
          <T t={tx.legenda_foto} vars={vars} className="legenda-foto" />
        </div>
      ),
    },
    {
      chave: "of-cond",
      no: (
        <div>
          <T t={primeiro ? tx.condicoes_titulo_primeiro : tx.condicoes_titulo_recompra} vars={vars} className="condicoes-titulo" />
          <Condicoes dados={dados} />
          <T t={tx.frase_impacto} vars={vars} className="frase" />
        </div>
      ),
    },
    {
      chave: "of-peca",
      no: (
        <div className="secao-cel">
          <p className="titulo-secao">{tx.na_peca_titulo}</p>
          <Chips dados={dados} />
        </div>
      ),
    },
    {
      chave: "of-parceria",
      no: (
        <div className="secao-cel">
          <p className="titulo-secao">{tx.na_parceria_titulo}</p>
          <Cards dados={dados} />
          <p className="assinatura cursiva">{tx.assinatura}</p>
        </div>
      ),
    },
  ];
}

function ContaLucro({ dados, formato }: Props) {
  const { modelo: m, vars, resultado: r } = dados;
  const tx = m.textos;
  return (
    <div className={formato === "a4" ? "conta-a4" : "conta-cel"}>
      <p className="conta-titulo">{tx.conta_titulo}</p>
      {r.lucroNaPeca && <T t={tx.lucro_titulo} vars={vars} className="lucro" />}
      <T t={notaGrades(r)} vars={vars} className="nota-grade" />
      <Polaroides fotos={dados.polaroides} moldura={urlImagem(m.imagens.moldura_polaroide)} />
      <div className="bandas">
        <div className="banda">
          <span className="banda-rotulo">
            Você
            <br />
            investe:
          </span>
          <span className="banda-valor">{formatarBRL(r.totalCentavos)}</span>
        </div>
        <div className="banda">
          <span className="banda-rotulo">
            Vira na
            <br />
            sua loja:
          </span>
          <span className="banda-valor">{formatarBRL(r.vendaEstimadaCentavos)}</span>
        </div>
      </div>
      <T t={tx.retorno} vars={vars} className="retorno" />
      <T t={tx.nota_estimativa} vars={vars} className="nota-estimativa" />
    </div>
  );
}

function blocosItens(prefixo: string, linhas: DadosImpressao["resultado"]["imediato"]["linhas"]): BlocoPdf[] {
  return linhas.map((l) => ({ chave: `${prefixo}-${l.pecaId}-${l.precoCentavos}`, no: <Item linha={l} /> }));
}

function blocosSimulacao({ dados, formato }: Props): BlocoPdf[] {
  const { modelo: m, vars, resultado: r } = dados;
  const tx = m.textos;
  const temImediato = r.imediato.itens.length > 0;
  return [
    ...(formato === "a4" ? [{ chave: "oferta", inteira: true, no: <OfertaA4 dados={dados} /> }] : blocosOfertaCelular(dados)),
    { chave: "conta", quebra: formato === "celular", no: <ContaLucro dados={dados} formato={formato} /> },
    {
      chave: "cab-pedido",
      junto: true,
      no: (
        <div className="linha-taupe">
          <div className="cab-pedido">
            <T t={tx.lema} vars={vars} className="lema" />
            <T t={tx.pedido_titulo} vars={vars} className="titulo-pedido" />
          </div>
        </div>
      ),
    },
    ...blocosItens("im", r.imediato.linhas),
    ...(temImediato
      ? [{ chave: "fech", no: <Fechamento bloco={r.imediato} r={r} rotulo={["Total do", "pedido"]} nota={tx.nota_legal} vars={vars} /> }]
      : []),
    ...blocosReservado({ r, vars, tituloModelo: tx.reservado_titulo, notaModelo: tx.reservado_nota }),
    ...(temImediato ? [] : [{ chave: "nota", no: <T t={tx.nota_legal} vars={vars} className="nota-legal" /> }]),
  ];
}

// ============================================================ Pedido confirmado

function blocosConfirmado({ dados }: Props): BlocoPdf[] {
  const { modelo: m, vars, resultado: r, documento: d, vendedora, condicoes } = dados;
  const tx = m.textos;
  const temImediato = r.imediato.itens.length > 0;
  const passos = r.reservado.grupos.length > 0 ? tx.passos : tx.passos_sem_reservado;
  const whats = vendedora.whatsapp?.replace(/\D/g, "");
  const linkWhats = whats
    ? `https://wa.me/${whats.length <= 11 ? `55${whats}` : whats}?text=${encodeURIComponent(`Tudo certo! Pedido ${d.numero}`)}`
    : null;

  return [
    {
      chave: "cab",
      no: (
        <div className="cab-conf">
          <div className="topo">
            <img className="logo" src={urlImagem(m.imagens.logo)} alt="Miz" />
            <div className="cab-dir">
              <p className="maiusculas">
                <strong>{tx.confirmado_cabecalho}</strong> · Nº {d.numero}
              </p>
              <T t={tx.cabecalho_loja} vars={vars} />
            </div>
          </div>
          <div className="linha-taupe" />
          <div className="meta">
            <p>{d.cnpj ? `CNPJ ${formatarCnpj(d.cnpj)}` : ""}</p>
            <p className="direita">
              Preparado por {vars.vendedora}
              {d.confirmado_em && (
                <>
                  <br />
                  Confirmado em {formatarDataHora(d.confirmado_em).split(" ")[0].replace(",", "")}
                </>
              )}
            </p>
          </div>
          <p className="selo-conf pilula">
            <Check />
            {tx.confirmado_selo}
          </p>
          <T t={tx.confirmado_titulo} vars={vars} className="titulo-conf" />
          <T t={tx.confirmado_subtitulo} vars={vars} className="sub-conf" />
        </div>
      ),
    },
    ...(temImediato
      ? [
          { chave: "im-tit", junto: true, no: <T t={tx.confirmado_imediato_titulo} vars={vars} className="titulo-secao-conf" /> },
          ...blocosItens("im", r.imediato.linhas),
          {
            chave: "im-fech",
            no: (
              <div>
                <Fechamento bloco={r.imediato} r={r} rotulo={["Total do", "envio"]} vars={vars} />
                <T t={tx.confirmado_imediato_nota} vars={vars} className="nota-despacho" />
              </div>
            ),
          },
        ]
      : []),
    ...blocosReservado({ r, vars, tituloModelo: tx.reservado_titulo, notaModelo: tx.reservado_nota, quebraPreferida: true }),
    {
      chave: "pagamentos",
      quebra: r.reservado.grupos.length === 0,
      no: (
        <div className="bloco-pagamentos">
          <T t={tx.pagamentos_titulo} vars={vars} className="titulo-secao-conf" />
          <div className="pagamentos">
            {temImediato && (
              <div className="pagamento agora">
                <span className="pag-rotulo">Agora · envio imediato</span>
                <span className="pag-parcela">
                  {r.nParcelas}x {formatarBRL(r.imediato.parcelaCentavos)}
                </span>
                <span className="pag-total">
                  Total {formatarBRL(r.imediato.totalCentavos)} · frete {textoFrete(r)}
                </span>
              </div>
            )}
            {r.reservado.grupos.map((g) => (
              <div key={g.previsao ?? "sem-data"} className="pagamento chegada">
                <span className="pag-rotulo">Na chegada · {formatarData(g.previsao, true)}</span>
                <span className="pag-parcela">
                  {r.nParcelas}x {formatarBRL(g.parcelaCentavos)}
                </span>
                <span className="pag-total">Total {formatarBRL(g.totalCentavos)} · você só paga na chegada</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      chave: "passos",
      no: (
        <div className="bloco-passos">
          <T t={tx.passos_titulo} vars={vars} className="titulo-secao-conf" />
          <div className="passos">
            {passos.map((p, i) => (
              <div key={i} className="passo">
                <span className="numero">{i + 1}</span>
                <T t={p} vars={vars} />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      chave: "completo",
      no: (
        <div className="bloco-completo">
          <div className="completo">
            <div>
              <p className="rot">{tx.completo_titulo}</p>
              <p className="val">{formatarBRL(r.totalCentavos)}</p>
              <p className="sub">
                {r.grades} grades · {r.pecas} peças · frete {textoFrete(r)} · de {condicoes.expedicao}
              </p>
            </div>
            <div className="direita">
              <p className="rot">Vira na sua loja</p>
              <p className="val">
                <strong>{formatarBRL(r.vendaEstimadaCentavos)}</strong>
              </p>
              <p className="sub">Etiqueta a {vars.markup}x o atacado</p>
            </div>
          </div>
          {linkWhats ? (
            <a className="botao-pdf" href={linkWhats}>
              {tx.botao}
            </a>
          ) : (
            <p className="botao-pdf">{tx.botao}</p>
          )}
        </div>
      ),
    },
  ];
}

// ============================================================ Documento

export function DocumentoPdf({ dados, formato, naTela }: Props & { naTela: boolean }) {
  const blocos = dados.documento.status === "confirmado" ? blocosConfirmado({ dados, formato }) : blocosSimulacao({ dados, formato });
  return (
    <div className={`pdf ${formato} ${dados.documento.status === "confirmado" ? "compacto" : ""} ${naTela ? "pdf-tela" : ""}`}>
      <Paginador blocos={blocos} rodape={<T t={dados.modelo.textos.rodape} vars={dados.vars} />} />
    </div>
  );
}
