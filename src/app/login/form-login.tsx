"use client";

import { useActionState } from "react";
import { entrar } from "./actions";

export function FormLogin() {
  const [estado, executar, pendente] = useActionState(entrar, {});

  return (
    <form action={executar} className="cartao space-y-4">
      <div>
        <label className="rotulo" htmlFor="email">
          E-mail
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="campo" />
      </div>
      <div>
        <label className="rotulo" htmlFor="senha">
          Senha
        </label>
        <input id="senha" name="senha" type="password" required autoComplete="current-password" className="campo" />
      </div>
      {estado.erro && (
        <p role="alert" className="text-sm text-erro">
          {estado.erro}
        </p>
      )}
      <button type="submit" className="botao w-full" disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
