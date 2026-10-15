import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { carregarCatalogoVenda, carregarCondicoes, parametrosBase } from "@/lib/documentos";
import { hojeSP } from "@/lib/datas";
import { FormSimulacao } from "../form-simulacao";

export default async function NovaSimulacaoPage() {
  await exigirUsuario();
  const [catalogo, condicoes] = await Promise.all([carregarCatalogoVenda(), carregarCondicoes()]);
  const parametros = parametrosBase(condicoes);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/simulacoes" className="text-sm text-suave hover:underline">
          ← Simulações e pedidos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Nova simulação</h1>
      </div>
      <FormSimulacao
        catalogo={catalogo}
        parametros={parametros}
        parcelasMax={{ primeiro: condicoes.primeiro_parcelas_max, recompra: condicoes.recompra_parcelas_max }}
        hoje={hojeSP()}
      />
    </div>
  );
}
