"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DocumentoPdf } from "@/components/pdf/documento-pdf";
import { IMAGENS, SECOES_TEXTO } from "@/lib/modelo/campos";
import type { Amostra } from "@/lib/modelo/amostra";
import { QTD_CARDS, QTD_CHIPS, QTD_CONDICOES, problemasDoModelo } from "@/lib/modelo/esquema";
import { urlImagem } from "@/lib/modelo/imagens";
import { MODELO_PADRAO } from "@/lib/modelo/padrao";
import type { CardTexto, ModeloPdf } from "@/lib/modelo/tipos";
import { VARIAVEIS_DISPONIVEIS } from "@/lib/modelo/variaveis";
import { reduzirImagem } from "@/lib/imagem";
import { criarClienteNavegador } from "@/lib/supabase/browser";
import { salvarModelo } from "./actions";

type Props = {
  modeloInicial: ModeloPdf;
  versaoCarregada: number | null;
  base: number | null;
  amostras: Record<"simulacao" | "confirmado", Amostra>;
};

export function EditorModelo({ modeloInicial, versaoCarregada, base, amostras }: Props) {
  const router = useRouter();
  const [modelo, setModelo] = useState<ModeloPdf>(modeloInicial);
  const [observacao, setObservacao] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [salvando, iniciar] = useTransition();

  const problemas = useMemo(() => problemasDoModelo(modelo), [modelo]);
  const comProblema = new Set(problemas.map((p) => p.campo));
  const alterado = useMemo(() => JSON.stringify(modelo) !== JSON.stringify(modeloInicial), [modelo, modeloInicial]);
  const proxima = (base ?? 0) + 1;

  const alterar = (f: (m: ModeloPdf) => void) =>
    setModelo((atual) => {
      const novo = structuredClone(atual);
      f(novo);
      return novo;
    });

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarModelo(modelo, observacao, base);
      if (r.erro) return setMsg({ tipo: "erro", texto: r.erro });
      setMsg({ tipo: "ok", texto: `Versão ${r.versao} salva. Os PDFs novos já usam esta versão.` });
      setObservacao("");
      router.push("/admin/modelo");
      router.refresh();
    });
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_470px]">
      <div className="space-y-4">
        {versaoCarregada !== null && versaoCarregada !== base && (
          <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
            Você abriu a versão {versaoCarregada}. Ao salvar, ela vira a versão {proxima} (a atual é a {base}).
          </p>
        )}

        <details className="cartao" open>
          <summary className="cursor-pointer font-semibold">Variáveis disponíveis</summary>
          <p className="mt-2 text-xs text-suave">
            Clique para copiar. Use <code>**texto**</code> para negrito e Enter para quebrar linha.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {VARIAVEIS_DISPONIVEIS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => void navigator.clipboard?.writeText(`{${v}}`)}
                className="rounded-full border border-linha px-2 py-0.5 font-mono text-xs text-taupe-escuro hover:bg-fundo"
              >
                {`{${v}}`}
              </button>
            ))}
          </div>
        </details>

        {SECOES_TEXTO.map((secao) => (
          <details key={secao.titulo} className="cartao">
            <summary className="cursor-pointer font-semibold">{secao.titulo}</summary>
            <div className="mt-4 space-y-3">
              {secao.campos.map((c) => (
                <CampoTextoModelo
                  key={c.chave}
                  rotulo={c.rotulo}
                  linhas={c.linhas}
                  valor={modelo.textos[c.chave]}
                  padrao={MODELO_PADRAO.textos[c.chave]}
                  erro={comProblema.has(`textos.${c.chave}`)}
                  aoMudar={(v) => alterar((m) => void (m.textos[c.chave] = v))}
                />
              ))}
            </div>
          </details>
        ))}

        <details className="cartao">
          <summary className="cursor-pointer font-semibold">Condições (os 3 chips da página 1)</summary>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {(["condicoes_primeiro", "condicoes_recompra"] as const).map((grupo) => (
              <div key={grupo} className="space-y-3">
                <p className="text-sm font-semibold text-taupe-escuro">{grupo === "condicoes_primeiro" ? "Primeiro pedido" : "Recompra"}</p>
                {Array.from({ length: QTD_CONDICOES }, (_, i) => (
                  <EditorCard
                    key={i}
                    card={modelo[grupo][i]}
                    erro={comProblema.has(`${grupo}.${i}.titulo`) || comProblema.has(`${grupo}.${i}.subtitulo`)}
                    aoMudar={(cartao) => alterar((m) => void (m[grupo][i] = cartao))}
                  />
                ))}
              </div>
            ))}
          </div>
        </details>

        <details className="cartao">
          <summary className="cursor-pointer font-semibold">Na peça e Na parceria</summary>
          <div className="mt-4 space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: QTD_CHIPS }, (_, i) => (
                <input
                  key={i}
                  value={modelo.chips_na_peca[i]}
                  maxLength={28}
                  onChange={(e) => alterar((m) => void (m.chips_na_peca[i] = e.target.value))}
                  className={`campo ${comProblema.has(`chips_na_peca.${i}`) ? "border-erro" : ""}`}
                  aria-label={`Chip ${i + 1}`}
                />
              ))}
            </div>
            {Array.from({ length: QTD_CARDS }, (_, i) => (
              <EditorCard
                key={i}
                card={modelo.cards_na_parceria[i]}
                erro={comProblema.has(`cards_na_parceria.${i}.titulo`) || comProblema.has(`cards_na_parceria.${i}.subtitulo`)}
                aoMudar={(cartao) => alterar((m) => void (m.cards_na_parceria[i] = cartao))}
              />
            ))}
          </div>
        </details>

        <details className="cartao">
          <summary className="cursor-pointer font-semibold">Pedido confirmado · próximos passos</summary>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {(["passos", "passos_sem_reservado"] as const).map((chave) => (
              <div key={chave} className="space-y-2">
                <p className="text-sm font-semibold text-taupe-escuro">{chave === "passos" ? "Com item reservado" : "Sem item reservado"}</p>
                {[0, 1, 2].map((i) => (
                  <textarea
                    key={i}
                    rows={2}
                    value={modelo.textos[chave][i]}
                    onChange={(e) => alterar((m) => void (m.textos[chave][i] = e.target.value))}
                    className={`campo ${comProblema.has(`textos.${chave}.${i}`) ? "border-erro" : ""}`}
                    aria-label={`Passo ${i + 1}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </details>

        <details className="cartao">
          <summary className="cursor-pointer font-semibold">Fotos e logo</summary>
          <div className="mt-4 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {IMAGENS.map((img) => (
                <CampoImagem
                  key={img.chave}
                  rotulo={img.rotulo}
                  valor={modelo.imagens[img.chave]}
                  padrao={MODELO_PADRAO.imagens[img.chave]}
                  aoMudar={(v) => alterar((m) => void (m.imagens[img.chave] = v))}
                />
              ))}
            </div>
            <div className="space-y-3 border-t border-linha pt-4">
              <p className="text-sm font-semibold text-taupe-escuro">Polaroides da página 2 (conta do lucro)</p>
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    checked={modelo.imagens.polaroides_modo === "automatico"}
                    onChange={() => alterar((m) => void (m.imagens.polaroides_modo = "automatico"))}
                    className="mt-1 accent-taupe"
                  />
                  <span>
                    <strong>Automático:</strong> fotos das 3 peças de maior valor de cada pedido (quando a peça não tem foto, entra a foto fixa
                    correspondente).
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="radio"
                    checked={modelo.imagens.polaroides_modo === "fixo"}
                    onChange={() => alterar((m) => void (m.imagens.polaroides_modo = "fixo"))}
                    className="mt-1 accent-taupe"
                  />
                  <span>
                    <strong>Fixo:</strong> sempre as 3 fotos abaixo.
                  </span>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <CampoImagem
                    key={i}
                    rotulo={`Foto fixa ${i + 1}`}
                    valor={modelo.imagens.polaroides_fixas[i]}
                    padrao={MODELO_PADRAO.imagens.polaroides_fixas[i]}
                    aoMudar={(v) => alterar((m) => void (m.imagens.polaroides_fixas[i] = v))}
                  />
                ))}
              </div>
            </div>
          </div>
        </details>

        <details className="cartao">
          <summary className="cursor-pointer font-semibold">Mensagens de WhatsApp</summary>
          <div className="mt-4 space-y-3">
            <CampoTextoModelo
              rotulo="Simulação"
              linhas={4}
              valor={modelo.mensagens.whatsapp_simulacao}
              padrao={MODELO_PADRAO.mensagens.whatsapp_simulacao}
              erro={comProblema.has("mensagens.whatsapp_simulacao")}
              aoMudar={(v) => alterar((m) => void (m.mensagens.whatsapp_simulacao = v))}
            />
            <CampoTextoModelo
              rotulo="Pedido confirmado"
              linhas={4}
              valor={modelo.mensagens.whatsapp_pedido}
              padrao={MODELO_PADRAO.mensagens.whatsapp_pedido}
              erro={comProblema.has("mensagens.whatsapp_pedido")}
              aoMudar={(v) => alterar((m) => void (m.mensagens.whatsapp_pedido = v))}
            />
            <p className="text-xs text-suave">
              Exemplo: {preencher(modelo.mensagens.whatsapp_simulacao, amostras.simulacao.vars)}
            </p>
          </div>
        </details>

        <div className="cartao sticky bottom-4 space-y-3 shadow-lg">
          {problemas.length > 0 && (
            <ul className="space-y-1 text-sm text-erro">
              {problemas.slice(0, 4).map((p, i) => (
                <li key={i}>
                  {p.problema} <span className="text-xs text-suave">({p.campo})</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="O que mudou? (opcional)"
              maxLength={140}
              className="campo min-w-48 flex-1"
            />
            <button type="button" className="botao" disabled={salvando || problemas.length > 0 || !alterado} onClick={salvar}>
              {salvando ? "Salvando…" : `Salvar como versão ${proxima}`}
            </button>
            {alterado && (
              <button type="button" className="text-sm text-suave underline-offset-4 hover:underline" onClick={() => setModelo(modeloInicial)}>
                Descartar alterações
              </button>
            )}
          </div>
          {msg && <p className={`text-sm ${msg.tipo === "erro" ? "text-erro" : "text-ok"}`}>{msg.texto}</p>}
          {!alterado && !msg && <p className="text-xs text-suave">Sem alterações.</p>}
        </div>
      </div>

      <Previa modelo={modelo} amostras={amostras} />
    </div>
  );
}

function preencher(texto: string, vars: Record<string, string>) {
  return texto.replace(/\{([a-z_]+)\}/g, (inteiro, nome: string) => vars[nome] ?? inteiro);
}

function CampoTextoModelo(props: { rotulo: string; valor: string; padrao: string; linhas?: number; erro: boolean; aoMudar: (v: string) => void }) {
  const id = useId();
  const classe = `campo ${props.erro ? "border-erro" : ""}`;
  return (
    <div>
      <div className="flex justify-between gap-2">
        <label htmlFor={id} className="rotulo">
          {props.rotulo}
        </label>
        {props.valor !== props.padrao && (
          <button type="button" className="mb-1 text-xs text-suave hover:underline" onClick={() => props.aoMudar(props.padrao)}>
            voltar ao original
          </button>
        )}
      </div>
      {props.linhas ? (
        <textarea id={id} rows={props.linhas} value={props.valor} onChange={(e) => props.aoMudar(e.target.value)} className={classe} />
      ) : (
        <input id={id} value={props.valor} onChange={(e) => props.aoMudar(e.target.value)} className={classe} />
      )}
    </div>
  );
}

function EditorCard({ card, erro, aoMudar }: { card: CardTexto; erro: boolean; aoMudar: (c: CardTexto) => void }) {
  return (
    <div className={`space-y-1.5 rounded-xl border p-3 ${erro ? "border-erro" : "border-linha"}`}>
      <input value={card.titulo} maxLength={40} onChange={(e) => aoMudar({ ...card, titulo: e.target.value })} className="campo" aria-label="Título" />
      <input value={card.subtitulo} maxLength={80} onChange={(e) => aoMudar({ ...card, subtitulo: e.target.value })} className="campo text-xs" aria-label="Subtítulo" />
    </div>
  );
}

function CampoImagem({ rotulo, valor, padrao, aoMudar }: { rotulo: string; valor: string; padrao: string; aoMudar: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function enviar(arquivo: File) {
    try {
      setStatus("Enviando…");
      const reduzida = await reduzirImagem(arquivo);
      const caminho = `modelo/${crypto.randomUUID()}.webp`;
      const { error } = await criarClienteNavegador().storage.from("midia").upload(caminho, reduzida, { contentType: "image/webp" });
      if (error) throw new Error("Falha no upload.");
      aoMudar(caminho);
      setStatus(null);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Falha no upload.");
    }
  }

  return (
    <div className="space-y-2">
      <span className="rotulo">{rotulo}</span>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urlImagem(valor)} alt="" className="h-20 w-16 rounded-lg border border-linha bg-fundo object-contain" />
        <div className="space-y-1 text-sm">
          <button type="button" className="botao-contorno" onClick={() => input.current?.click()}>
            Trocar
          </button>
          {valor !== padrao && (
            <button type="button" className="block text-xs text-suave hover:underline" onClick={() => aoMudar(padrao)}>
              voltar ao original
            </button>
          )}
          {status && <p className="text-xs text-suave">{status}</p>}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void enviar(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Pré-visualização ao vivo: o mesmo componente que gera o PDF, com o pedido de exemplo. */
function Previa({ modelo, amostras }: { modelo: ModeloPdf; amostras: Props["amostras"] }) {
  const [doc, setDoc] = useState<"simulacao" | "confirmado">("simulacao");
  const [formato, setFormato] = useState<"a4" | "celular">("a4");
  const [atrasado, setAtrasado] = useState(modelo);
  const [chave, setChave] = useState(0);

  // Espera a pessoa parar de digitar para repaginar
  useEffect(() => {
    const t = setTimeout(() => {
      setAtrasado(modelo);
      setChave((k) => k + 1);
    }, 400);
    return () => clearTimeout(t);
  }, [modelo]);

  const amostra = amostras[doc];
  const dados = {
    ...amostra,
    modelo: atrasado,
    versaoModelo: null,
    polaroides: atrasado.imagens.polaroides_fixas.map(urlImagem),
  };

  return (
    <aside className="space-y-3 xl:sticky xl:top-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {(["simulacao", "confirmado"] as const).map((d) => (
          <button key={d} type="button" onClick={() => setDoc(d)} className={doc === d ? "botao" : "botao-contorno"}>
            {d === "simulacao" ? "Simulação" : "Pedido confirmado"}
          </button>
        ))}
        {(["a4", "celular"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFormato(f)} className={formato === f ? "botao" : "botao-contorno"}>
            {f === "a4" ? "A4" : "Celular"}
          </button>
        ))}
      </div>
      <div className="max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl bg-[#e9e6e0] p-3">
        <div className="previa-pdf" style={{ zoom: formato === "a4" ? 0.55 : 1 }}>
          <DocumentoPdf key={`${doc}-${formato}-${chave}`} dados={dados} formato={formato} naTela={false} />
        </div>
      </div>
      <p className="text-xs text-suave">
        Exemplo: pedido da Dulcinéa com as condições atuais.
        {atrasado.imagens.polaroides_modo === "automatico" && " No modo automático, cada pedido usa as fotos das próprias peças."}
      </p>
    </aside>
  );
}
