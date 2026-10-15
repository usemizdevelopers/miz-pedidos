import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { formatarCnpj } from "@/lib/cnpj";
import { estaVencida, formatarData, formatarDataHora, hojeSP } from "@/lib/datas";
import { carregarImpressao } from "@/lib/impressao";
import { aplicarVariaveis } from "@/lib/modelo/variaveis";
import { FormAcao } from "@/components/form-acao";
import { SeloStatus } from "../selo-status";
import { ResumoDocumento } from "./resumo-documento";
import { BotaoCopiar } from "./botao-copiar";
import { converterEmPedido, duplicarDocumento, excluirSimulacao } from "../actions";

export default async function DocumentoPage({ params, searchParams }: PageProps<"/simulacoes/[id]">) {
  const perfil = await exigirUsuario();
  const { id } = await params;
  const { confirmado, precos } = await searchParams;

  // Mesmo carregamento do PDF: condições da época e versão do modelo gravadas no documento
  const dados = await carregarImpressao(id);
  if (!dados) notFound();
  const { documento: d, resultado, modelo, vars } = dados;
  const vendedora = dados.vendedora.nome;
  const temItens = resultado.imediato.itens.length + resultado.reservado.itens.length > 0;
  const mensagem = aplicarVariaveis(d.status === "confirmado" ? modelo.mensagens.whatsapp_pedido : modelo.mensagens.whatsapp_simulacao, vars);

  const ehDona = d.vendedora_id === perfil.id;
  const simulacao = d.status === "simulacao";
  const vencida = simulacao && estaVencida(d.validade, hojeSP());

  return (
    <div className="space-y-6">
      <Link href="/simulacoes" className="text-sm text-suave hover:underline">
        ← Simulações e pedidos
      </Link>

      {confirmado && (
        <p className="rounded-lg bg-ok/15 px-4 py-3 text-sm text-ok">
          Pedido <strong>{d.numero}</strong> confirmado. Preços e condições ficaram congelados.
          {precos && " Atenção: o catálogo tinha preços diferentes da simulação e o pedido usou os preços atuais."}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="cartao space-y-8">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-linha pb-5">
            <div className="space-y-1">
              <SeloStatus status={d.status} numero={d.numero} vencida={vencida} />
              <h1 className="pt-2 text-2xl font-semibold">{d.loja}</h1>
              <p className="text-suave">
                {d.proprietaria} · {d.cidade_uf}
                {d.cnpj && ` · CNPJ ${formatarCnpj(d.cnpj)}`}
              </p>
            </div>
            <dl className="space-y-0.5 text-right text-sm text-suave">
              <div>{d.primeiro_pedido ? "Primeiro pedido" : "Recompra"}</div>
              <div>Preparada por {vendedora || "—"}</div>
              {simulacao ? (
                <div className={vencida ? "font-semibold text-erro" : ""}>Válida até {formatarData(d.validade)}</div>
              ) : (
                d.confirmado_em && <div>Confirmado em {formatarDataHora(d.confirmado_em)}</div>
              )}
            </dl>
          </header>

          {!temItens ? <p className="text-suave">Nenhum item.</p> : <ResumoDocumento r={resultado} />}
        </article>

        <aside className="space-y-4 lg:sticky lg:top-4">
          {simulacao && ehDona && (
            <div className="cartao space-y-3">
              <h2 className="font-semibold">Converter em pedido</h2>
              {vencida ? (
                <p className="text-sm text-erro">
                  Simulação vencida{d.validade ? ` em ${formatarData(d.validade)}` : ""}. Edite e atualize a validade para converter.
                </p>
              ) : (
                <FormAcao
                  action={converterEmPedido.bind(null, d.id)}
                  botao="Confirmar pedido"
                  botaoClasse="botao w-full"
                  className="space-y-3"
                  confirmar="Confirmar o pedido? Depois disso preços e itens não podem mais ser alterados."
                >
                  <label className="block">
                    <span className="rotulo">CNPJ da loja</span>
                    <input name="cnpj" required defaultValue={formatarCnpj(d.cnpj)} placeholder="00.000.000/0000-00" className="campo" />
                  </label>
                  <p className="text-xs text-suave">Os preços do catálogo de agora ficam congelados no pedido.</p>
                </FormAcao>
              )}
            </div>
          )}

          {temItens && (
            <div className="cartao space-y-3">
              <h2 className="font-semibold">PDF</h2>
              <a href={`/simulacoes/${d.id}/pdf?formato=a4`} className="botao w-full">
                Baixar PDF A4
              </a>
              <a href={`/simulacoes/${d.id}/pdf?formato=celular`} className="botao-contorno w-full">
                Baixar PDF celular
              </a>
              <p className="text-center text-xs text-suave">
                Pré-visualizar:{" "}
                <a href={`/impressao/${d.id}?formato=a4&tela=1`} target="_blank" className="underline">
                  A4
                </a>{" "}
                ·{" "}
                <a href={`/impressao/${d.id}?formato=celular&tela=1`} target="_blank" className="underline">
                  celular
                </a>
              </p>
            </div>
          )}

          {temItens && (
            <div className="cartao space-y-3">
              <h2 className="font-semibold">Mensagem de WhatsApp</h2>
              <BotaoCopiar texto={mensagem} />
            </div>
          )}

          <div className="cartao space-y-3">
            <h2 className="font-semibold">Ações</h2>
            {simulacao && ehDona && (
              <Link href={`/simulacoes/${d.id}/editar`} className="botao-contorno w-full">
                Editar
              </Link>
            )}
            <FormAcao action={duplicarDocumento.bind(null, d.id)} botao="Duplicar" botaoClasse="botao-contorno w-full">
              {null}
            </FormAcao>
            {simulacao && ehDona && (
              <FormAcao
                action={excluirSimulacao.bind(null, d.id)}
                botao="Excluir simulação"
                botaoClasse="w-full text-sm text-erro hover:underline"
                confirmar="Excluir esta simulação?"
              >
                {null}
              </FormAcao>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
