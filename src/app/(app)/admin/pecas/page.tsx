import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarBRL } from "@/lib/dinheiro";
import type { Peca } from "@/lib/tipos";

type LinhaPeca = Peca & {
  grade_tipos: { nome: string; pecas_por_grade: number } | null;
  peca_cores: { nome: string; hex: string; disponibilidade: string; ordem: number }[];
};

export default async function PecasPage() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("pecas")
    .select("*, grade_tipos(nome, pecas_por_grade), peca_cores(nome, hex, disponibilidade, ordem)")
    .order("referencia");
  const pecas = (data ?? []) as LinhaPeca[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Peças</h1>
        <Link href="/admin/pecas/nova" className="botao">
          Nova peça
        </Link>
      </div>

      <div className="cartao overflow-x-auto p-0">
        <table className="tabela">
          <thead>
            <tr>
              <th>Ref.</th>
              <th>Peça</th>
              <th className="text-right">Preço/peça</th>
              <th>Grade</th>
              <th>Cores</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pecas.map((p) => (
              <tr key={p.id} className="hover:bg-fundo">
                <td className="font-mono text-xs">{p.referencia}</td>
                <td>
                  <Link href={`/admin/pecas/${p.id}`} className="font-semibold text-taupe-escuro hover:underline">
                    {p.nome}
                  </Link>
                </td>
                <td className="text-right whitespace-nowrap">{formatarBRL(p.preco_centavos)}</td>
                <td className="whitespace-nowrap">{p.grade_tipos?.nome}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {[...p.peca_cores]
                      .sort((a, b) => a.ordem - b.ordem)
                      .map((c) => (
                        <span
                          key={c.nome}
                          title={`${c.nome} · ${c.disponibilidade}`}
                          className={`inline-block size-4 rounded-full border border-linha ${c.disponibilidade === "indisponivel" ? "opacity-30" : ""} ${c.disponibilidade === "programada" ? "ring-2 ring-amber-400/60" : ""}`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                  </div>
                </td>
                <td>{p.ativa ? <span className="text-ok">Ativa</span> : <span className="text-suave">Inativa</span>}</td>
              </tr>
            ))}
            {pecas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-suave">
                  Nenhuma peça cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-suave">Contorno âmbar = cor programada · apagada = indisponível.</p>
    </div>
  );
}
