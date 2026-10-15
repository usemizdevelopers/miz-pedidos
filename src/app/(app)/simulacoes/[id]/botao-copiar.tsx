"use client";

import { useState } from "react";

/** Copia a mensagem pronta para colar no WhatsApp. */
export function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Sem permissão de área de transferência: copia pelo jeito antigo
      const area = document.createElement("textarea");
      area.value = texto;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <div className="space-y-2">
      <p className="whitespace-pre-line rounded-xl bg-fundo p-3 text-sm text-texto">{texto}</p>
      <button type="button" onClick={copiar} className="botao w-full">
        {copiado ? "Copiado ✓" : "Copiar mensagem"}
      </button>
    </div>
  );
}
