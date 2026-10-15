import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { carregarCatalogoVenda, carregarCondicoes, carregarDocumento, parametrosBase } from "@/lib/documentos";
import { hojeSP } from "@/lib/datas";
import { FormSimulacao } from "../../form-simulacao";

export default async function EditarSimulacaoPage({ params, searchParams }: PageProps<"/simulacoes/[id]/editar">) {
  const perfil = await exigirUsuario();
  const { id } = await params;
  const { duplicada } = await searchParams;

  const carregado = await carregarDocumento(id);
  if (!carregado) notFound();
  const { documento, itens } = carregado;
  if (documento.status !== "simulacao" || documento.vendedora_id !== perfil.id) redirect(`/simulacoes/${id}`);

  const [catalogo, condicoes] = await Promise.all([carregarCatalogoVenda(), carregarCondicoes()]);
  const parametros = parametrosBase(condicoes);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/simulacoes/${id}`} className="text-sm text-suave hover:underline">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          Editar simulação · {documento.loja}
        </h1>
        {duplicada && (
          <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
            Cópia criada com os preços e a disponibilidade atuais do catálogo. Defina a validade e salve.
          </p>
        )}
      </div>
      <FormSimulacao
        catalogo={catalogo}
        parametros={parametros}
        parcelasMax={{ primeiro: condicoes.primeiro_parcelas_max, recompra: condicoes.recompra_parcelas_max }}
        hoje={hojeSP()}
        inicial={{
          id,
          proprietaria: documento.proprietaria,
          loja: documento.loja,
          cidade_uf: documento.cidade_uf,
          cnpj: documento.cnpj,
          primeiro_pedido: documento.primeiro_pedido,
          validade: documento.validade,
          n_parcelas: documento.n_parcelas,
          itens: itens.map((i) => ({ peca_id: i.peca_id, cor_id: i.cor_id, n_grades: i.n_grades })),
        }}
      />
    </div>
  );
}
