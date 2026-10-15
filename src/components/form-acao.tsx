"use client";

import { useActionState, useEffect, useRef, startTransition } from "react";
import type { EstadoForm } from "@/lib/tipos";

type Props = {
  action: (estado: EstadoForm, dados: FormData) => Promise<EstadoForm>;
  children: React.ReactNode;
  botao?: string;
  botaoClasse?: string;
  className?: string;
  /** Limpa os campos depois de salvar com sucesso (formulários de criação). */
  limparAoSalvar?: boolean;
  /** Pergunta antes de enviar (ações destrutivas). */
  confirmar?: string;
};

/**
 * Formulário ligado a uma server action. Não usa o reset automático do React:
 * em caso de erro, o que a pessoa digitou continua no formulário.
 */
export function FormAcao({
  action,
  children,
  botao = "Salvar",
  botaoClasse = "botao",
  className,
  limparAoSalvar,
  confirmar,
}: Props) {
  const [estado, executar, pendente] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (limparAoSalvar && estado.ok) formRef.current?.reset();
  }, [estado, limparAoSalvar]);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmar && !window.confirm(confirmar)) return;
        const dados = new FormData(e.currentTarget);
        startTransition(() => executar(dados));
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={botaoClasse} disabled={pendente}>
          {pendente ? "Salvando…" : botao}
        </button>
        {estado.erro && (
          <p role="alert" className="text-sm text-erro">
            {estado.erro}
          </p>
        )}
        {estado.ok && !pendente && <p className="text-sm text-ok">{estado.ok}</p>}
      </div>
    </form>
  );
}
