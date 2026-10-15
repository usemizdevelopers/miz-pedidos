"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { criarClienteNavegador } from "@/lib/supabase/browser";
import { reduzirImagem } from "@/lib/imagem";
import { registrarFoto } from "../actions";

const LIMITE_ORIGINAL = 40 * 1024 * 1024;

/** Envia a foto direto do navegador para o Storage (sem passar pelo servidor do Next). */
export function UploadFoto({ pecaId }: { pecaId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tipo: "ok" | "erro" | "enviando"; texto: string } | null>(null);

  async function enviar(arquivo: File) {
    if (!arquivo.type.startsWith("image/")) return setStatus({ tipo: "erro", texto: "Escolha um arquivo de imagem." });
    if (arquivo.size > LIMITE_ORIGINAL) return setStatus({ tipo: "erro", texto: "Imagem acima de 40 MB." });

    try {
      setStatus({ tipo: "enviando", texto: "Reduzindo a imagem…" });
      const reduzida = await reduzirImagem(arquivo);

      setStatus({ tipo: "enviando", texto: "Enviando…" });
      const caminho = `pecas/${pecaId}/${crypto.randomUUID()}.webp`;
      const { error } = await criarClienteNavegador()
        .storage.from("midia")
        .upload(caminho, reduzida, { contentType: "image/webp", upsert: false });
      if (error) throw new Error("Falha no upload da imagem.");

      const r = await registrarFoto(pecaId, caminho);
      if (r.erro) throw new Error(r.erro);

      setStatus({ tipo: "ok", texto: `Foto enviada (${Math.round(reduzida.size / 1024)} KB).` });
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (e) {
      setStatus({ tipo: "erro", texto: e instanceof Error ? e.message : "Não foi possível enviar a foto." });
    }
  }

  return (
    <div className="cartao space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={status?.tipo === "enviando"}
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) void enviar(arquivo);
        }}
        className="block text-sm"
      />
      <p className="text-xs text-suave">A foto é reduzida para até 2400 px (WebP) antes do envio. Pode usar o arquivo original do estúdio.</p>
      {status && (
        <p role={status.tipo === "erro" ? "alert" : undefined} className={`text-sm ${status.tipo === "erro" ? "text-erro" : status.tipo === "ok" ? "text-ok" : "text-suave"}`}>
          {status.texto}
        </p>
      )}
    </div>
  );
}
