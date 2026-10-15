import { criarClienteServidor } from "@/lib/supabase/server";
import { FormAcao } from "@/components/form-acao";
import { formatarValor } from "@/lib/dinheiro";
import type { CondicoesComerciais } from "@/lib/tipos";
import { salvarCondicoes } from "./actions";

function Campo({
  nome,
  rotulo,
  valor,
  tipo = "text",
  dica,
}: {
  nome: string;
  rotulo: string;
  valor: string | number;
  tipo?: string;
  dica?: string;
}) {
  return (
    <div>
      <label className="rotulo" htmlFor={nome}>
        {rotulo}
      </label>
      <input id={nome} name={nome} type={tipo} required defaultValue={valor} className="campo" />
      {dica && <p className="mt-1 text-xs text-suave">{dica}</p>}
    </div>
  );
}

export default async function CondicoesPage() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("condicoes_comerciais").select("*").eq("id", 1).single();
  const c = data as CondicoesComerciais | null;

  if (!c) return <p className="text-erro">Condições comerciais não encontradas. Rode as migrações.</p>;

  const decimal = (v: number) => String(v).replace(".", ",");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Condições comerciais</h1>
        <p className="mt-1 text-sm text-suave">
          Valem para simulações novas. Pedidos confirmados guardam as condições do momento da confirmação.
        </p>
      </div>
      <FormAcao action={salvarCondicoes} botao="Salvar condições" className="space-y-6">
        <section className="cartao space-y-4">
          <h2 className="font-semibold">Primeiro pedido</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="primeiro_pedido_minimo" rotulo="Pedido mínimo" valor={c.primeiro_pedido_minimo} />
            <Campo nome="primeiro_parcelas_max" rotulo="Parcelas máximas sem juros" valor={c.primeiro_parcelas_max} tipo="number" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="primeiro_frete_gratis" defaultChecked={c.primeiro_frete_gratis} className="size-4 accent-taupe" />
            Frete por conta da Miz no primeiro pedido
          </label>
        </section>

        <section className="cartao space-y-4">
          <h2 className="font-semibold">Recompra</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="recompra_pedido_minimo" rotulo="Pedido mínimo" valor={c.recompra_pedido_minimo} />
            <Campo nome="recompra_parcelas_max" rotulo="Parcelas máximas sem juros" valor={c.recompra_parcelas_max} tipo="number" />
            <Campo
              nome="recompra_frete_gratis_minimo"
              rotulo="Frete grátis a partir de (R$)"
              valor={formatarValor(c.recompra_frete_gratis_minimo_centavos)}
              dica="Sobre o total do pedido, incluindo itens reservados. Abaixo disso, frete a cotar."
            />
          </div>
        </section>

        <section className="cartao space-y-4">
          <h2 className="font-semibold">Geral</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="markup" rotulo="Markup padrão" valor={decimal(c.markup)} dica="Etiqueta sugerida = preço de atacado × markup." />
            <Campo
              nome="fator_conservador"
              rotulo="Fator do cenário conservador"
              valor={decimal(c.fator_conservador)}
              dica="0,94 = 80% vendido na etiqueta + 20% com 30% off."
            />
            <Campo nome="despacho_horas" rotulo="Despacho após pagamento (horas)" valor={c.despacho_horas} tipo="number" />
            <Campo nome="expedicao" rotulo="Expedição" valor={c.expedicao} />
            <div className="sm:col-span-2">
              <Campo nome="outras_formas_pagamento" rotulo="Outras formas de pagamento" valor={c.outras_formas_pagamento} />
            </div>
          </div>
        </section>
      </FormAcao>
    </div>
  );
}
