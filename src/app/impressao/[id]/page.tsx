import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/auth";
import { carregarImpressao, type Formato } from "@/lib/impressao";
import { DocumentoPdf } from "@/components/pdf/documento-pdf";

const PAGINA: Record<Formato, string> = {
  a4: "210mm 297mm",
  celular: "390px 845px",
};

/** Documento pronto para o Chromium imprimir (e pré-visualização na tela com ?tela=1). */
export default async function ImpressaoPage({ params, searchParams }: PageProps<"/impressao/[id]">) {
  await exigirUsuario();
  const { id } = await params;
  const { formato: f, tela } = await searchParams;
  const formato: Formato = f === "celular" ? "celular" : "a4";

  const dados = await carregarImpressao(id);
  if (!dados) notFound();

  return (
    <>
      <style>{`@page { size: ${PAGINA[formato]}; margin: 0; } html, body { background: #f7f6f3; }`}</style>
      <DocumentoPdf dados={dados} formato={formato} naTela={tela === "1"} />
    </>
  );
}
