import Link from "next/link";
import { Mrs_Saint_Delafield } from "next/font/google";
import { exigirAdmin } from "@/lib/auth";
import { carregarCondicoes } from "@/lib/documentos";
import { formatarDataHora } from "@/lib/datas";
import { montarAmostras } from "@/lib/modelo/amostra";
import { completarModelo } from "@/lib/modelo/carregar";
import { MODELO_PADRAO } from "@/lib/modelo/padrao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormAcao } from "@/components/form-acao";
import { EditorModelo } from "./editor-modelo";
import { restaurarVersao } from "./actions";
import "@/components/pdf/pdf.css";

const cursiva = Mrs_Saint_Delafield({ variable: "--font-cursiva", subsets: ["latin"], weight: "400" });

type Versao = { id: string; versao: number; observacao: string | null; criado_em: string; criado_por: string | null; blocos: object; mensagens: object };

export default async function ModeloPage({ searchParams }: PageProps<"/admin/modelo">) {
  const admin = await exigirAdmin();
  const { versao: versaoParam } = await searchParams;
  const supabase = await criarClienteServidor();

  const [{ data: versoes }, { data: usos }, { data: perfis }, condicoes] = await Promise.all([
    supabase.from("modelo_pdf_versoes").select("*").order("versao", { ascending: false }),
    supabase.from("documentos").select("modelo_versao_id, status"),
    supabase.from("profiles").select("id, nome, email"),
    carregarCondicoes(),
  ]);
  const lista = (versoes ?? []) as Versao[];
  const atual = lista[0] ?? null;
  const pedida = versaoParam ? lista.find((v) => v.versao === Number(versaoParam)) : null;
  const carregada = pedida ?? atual;
  const modelo = carregada ? completarModelo(carregada.blocos, carregada.mensagens) : MODELO_PADRAO;

  const nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome || p.email]));
  const contagem = new Map<string, { simulacoes: number; pedidos: number }>();
  for (const u of usos ?? []) {
    if (!u.modelo_versao_id) continue;
    const c = contagem.get(u.modelo_versao_id) ?? { simulacoes: 0, pedidos: 0 };
    if (u.status === "confirmado") c.pedidos++;
    else c.simulacoes++;
    contagem.set(u.modelo_versao_id, c);
  }

  return (
    <div className={`space-y-8 ${cursiva.variable}`}>
      <div>
        <h1 className="text-2xl font-semibold">Modelo do PDF</h1>
        <p className="mt-1 text-sm text-suave">
          Versão em uso: <strong>{atual ? `v${atual.versao}` : "padrão do sistema"}</strong>. Cada vez que você salva, nasce uma versão nova: os PDFs novos
          passam a usá-la e os documentos já gerados continuam com a versão deles.
        </p>
      </div>

      <EditorModelo
        key={carregada?.id ?? "padrao"}
        modeloInicial={modelo}
        versaoCarregada={carregada?.versao ?? null}
        base={atual?.versao ?? null}
        amostras={montarAmostras(condicoes, admin.nome || "Rafael")}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Histórico de versões</h2>
        <div className="cartao overflow-x-auto p-0">
          <table className="tabela">
            <thead>
              <tr>
                <th>Versão</th>
                <th>Quando</th>
                <th>Quem</th>
                <th>O que mudou</th>
                <th>Em uso</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => {
                const c = contagem.get(v.id);
                return (
                  <tr key={v.id} className={carregada?.id === v.id ? "bg-fundo" : ""}>
                    <td className="whitespace-nowrap font-semibold">
                      v{v.versao}
                      {v.versao === atual?.versao && <span className="ml-2 rounded-full bg-ok/15 px-2 py-0.5 text-xs text-ok">atual</span>}
                    </td>
                    <td className="whitespace-nowrap">{formatarDataHora(v.criado_em)}</td>
                    <td className="whitespace-nowrap">{v.criado_por ? (nomes.get(v.criado_por) ?? "—") : "Sistema"}</td>
                    <td className="text-suave">{v.observacao ?? "—"}</td>
                    <td className="whitespace-nowrap text-suave">
                      {c ? `${c.simulacoes} simulação(ões) · ${c.pedidos} pedido(s)` : "—"}
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        {carregada?.id !== v.id && (
                          <Link href={`/admin/modelo?versao=${v.versao}`} className="text-sm text-taupe-escuro underline-offset-4 hover:underline">
                            Abrir no editor
                          </Link>
                        )}
                        {v.versao !== atual?.versao && (
                          <FormAcao
                            action={restaurarVersao.bind(null, v.versao, atual?.versao ?? null)}
                            botao="Restaurar"
                            botaoClasse="text-sm text-taupe-escuro underline-offset-4 hover:underline"
                            confirmar={`Restaurar a versão ${v.versao}? Ela vira a versão ${(atual?.versao ?? 0) + 1} e passa a valer para os PDFs novos.`}
                          >
                            {null}
                          </FormAcao>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
