import { exigirAdmin } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormAcao } from "@/components/form-acao";
import type { Perfil } from "@/lib/tipos";
import { alternarAtiva, criarVendedora, redefinirSenha, salvarVendedora } from "./actions";

export default async function VendedorasPage() {
  const eu = await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("profiles").select("*").order("papel").order("nome");
  const perfis = (data ?? []) as Perfil[];

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-semibold">Equipe</h1>

      <div className="space-y-3">
        {perfis.map((p) => (
          <div key={p.id} className={`cartao space-y-3 ${p.ativa ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{p.email}</span>
              <span className="rounded-full border border-linha px-2 py-0.5 text-xs">{p.papel === "admin" ? "Admin" : "Vendedora"}</span>
              {!p.ativa && <span className="rounded-full bg-erro/10 px-2 py-0.5 text-xs text-erro">Inativa</span>}
            </div>
            <FormAcao action={salvarVendedora.bind(null, p.id)} botaoClasse="botao-contorno" className="flex flex-wrap items-end gap-3">
              <div className="min-w-48 flex-1">
                <label className="rotulo">Nome</label>
                <input name="nome" required defaultValue={p.nome} className="campo" />
              </div>
              <div className="min-w-40">
                <label className="rotulo">WhatsApp</label>
                <input name="whatsapp" defaultValue={p.whatsapp ?? ""} placeholder="(47) 99999-9999" className="campo" />
              </div>
            </FormAcao>
            {p.id !== eu.id && (
              <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-linha pt-3">
                <FormAcao
                  action={alternarAtiva.bind(null, p.id, !p.ativa)}
                  botao={p.ativa ? "Desativar acesso" : "Reativar acesso"}
                  botaoClasse="text-sm text-taupe-escuro underline-offset-4 hover:underline"
                  confirmar={p.ativa ? `Desativar ${p.nome || p.email}?` : undefined}
                >
                  {null}
                </FormAcao>
                <FormAcao
                  action={redefinirSenha.bind(null, p.id)}
                  botao="Gerar nova senha"
                  botaoClasse="text-sm text-taupe-escuro underline-offset-4 hover:underline"
                  confirmar={`Gerar nova senha para ${p.nome || p.email}? A atual deixa de funcionar.`}
                >
                  {null}
                </FormAcao>
              </div>
            )}
          </div>
        ))}
      </div>

      <FormAcao action={criarVendedora} botao="Cadastrar vendedora" className="cartao space-y-4 border-dashed" limparAoSalvar>
        <h2 className="font-semibold">Nova vendedora</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="rotulo">Nome</label>
            <input name="nome" required className="campo" />
          </div>
          <div>
            <label className="rotulo">E-mail</label>
            <input name="email" type="email" required className="campo" />
          </div>
          <div>
            <label className="rotulo">WhatsApp</label>
            <input name="whatsapp" placeholder="(47) 99999-9999" className="campo" />
          </div>
        </div>
        <p className="text-xs text-suave">Uma senha temporária aparece aqui depois de salvar. Repasse para a vendedora trocar em &quot;Minha conta&quot;.</p>
      </FormAcao>
    </div>
  );
}
