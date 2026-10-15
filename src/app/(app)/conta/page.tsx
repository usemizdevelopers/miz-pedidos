import { exigirUsuario } from "@/lib/auth";
import { FormAcao } from "@/components/form-acao";
import { trocarSenha } from "./actions";

export default async function ContaPage() {
  const perfil = await exigirUsuario();

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Minha conta</h1>
      <div className="cartao space-y-1 text-sm">
        <p>
          <span className="text-suave">Nome:</span> {perfil.nome || "—"}
        </p>
        <p>
          <span className="text-suave">E-mail:</span> {perfil.email}
        </p>
        <p>
          <span className="text-suave">WhatsApp:</span> {perfil.whatsapp || "—"}
        </p>
      </div>
      <FormAcao action={trocarSenha} botao="Trocar senha" className="cartao space-y-4" limparAoSalvar>
        <h2 className="font-semibold">Trocar senha</h2>
        <div>
          <label className="rotulo" htmlFor="senha">
            Nova senha
          </label>
          <input id="senha" name="senha" type="password" minLength={8} required className="campo" autoComplete="new-password" />
        </div>
        <div>
          <label className="rotulo" htmlFor="confirmacao">
            Repita a nova senha
          </label>
          <input id="confirmacao" name="confirmacao" type="password" minLength={8} required className="campo" autoComplete="new-password" />
        </div>
      </FormAcao>
    </div>
  );
}
