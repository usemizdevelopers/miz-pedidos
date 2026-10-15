import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarBRL } from "@/lib/dinheiro";
import { estaVencida, formatarData, hojeSP } from "@/lib/datas";
import { dividirArredondado } from "@/lib/calculo";
import type { Documento } from "@/lib/documentos";
import { SeloStatus } from "./selo-status";

type Linha = Pick<
  Documento,
  "id" | "status" | "numero" | "proprietaria" | "loja" | "cidade_uf" | "validade" | "n_parcelas" | "total_centavos" | "total_imediato_centavos" | "criado_em" | "vendedora_id"
>;

export default async function SimulacoesPage() {
  const perfil = await exigirUsuario();
  const supabase = await criarClienteServidor();
  const [{ data }, { data: perfis }] = await Promise.all([
    supabase
      .from("documentos")
      .select("id, status, numero, proprietaria, loja, cidade_uf, validade, n_parcelas, total_centavos, total_imediato_centavos, criado_em, vendedora_id")
      .order("criado_em", { ascending: false })
      .limit(300),
    perfil.papel === "admin" ? supabase.from("profiles").select("id, nome, email") : Promise.resolve({ data: [] }),
  ]);
  const docs = (data ?? []) as Linha[];
  const nomes = new Map((perfis ?? []).map((p: { id: string; nome: string; email: string }) => [p.id, p.nome || p.email]));
  const hoje = hojeSP();
  const ehAdmin = perfil.papel === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Simulações e pedidos</h1>
        <Link href="/simulacoes/nova" className="botao">
          Nova simulação
        </Link>
      </div>

      <div className="cartao overflow-x-auto p-0">
        <table className="tabela">
          <thead>
            <tr>
              <th>Status</th>
              <th>Loja</th>
              <th>Cidade/UF</th>
              <th className="text-right">Total</th>
              <th className="text-right">Envio imediato</th>
              <th>Validade</th>
              {ehAdmin && <th>Vendedora</th>}
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id} className="hover:bg-fundo">
                <td className="whitespace-nowrap">
                  <SeloStatus status={d.status} numero={d.numero} vencida={d.status === "simulacao" && estaVencida(d.validade, hoje)} />
                </td>
                <td>
                  <Link href={`/simulacoes/${d.id}`} className="font-semibold text-taupe-escuro hover:underline">
                    {d.loja}
                  </Link>
                  <span className="block text-xs text-suave">{d.proprietaria}</span>
                </td>
                <td className="whitespace-nowrap">{d.cidade_uf}</td>
                <td className="whitespace-nowrap text-right">{formatarBRL(d.total_centavos ?? 0)}</td>
                <td className="whitespace-nowrap text-right">
                  {d.n_parcelas}x {formatarBRL(dividirArredondado(d.total_imediato_centavos ?? 0, d.n_parcelas))}
                </td>
                <td className="whitespace-nowrap">{d.status === "simulacao" ? formatarData(d.validade) : "—"}</td>
                {ehAdmin && <td className="whitespace-nowrap">{nomes.get(d.vendedora_id) ?? "—"}</td>}
                <td className="whitespace-nowrap text-suave">{formatarData(d.criado_em.slice(0, 10))}</td>
              </tr>
            ))}
            {docs.length === 0 && (
              <tr>
                <td colSpan={ehAdmin ? 8 : 7} className="py-10 text-center text-suave">
                  Nenhuma simulação ainda. Clique em &quot;Nova simulação&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
