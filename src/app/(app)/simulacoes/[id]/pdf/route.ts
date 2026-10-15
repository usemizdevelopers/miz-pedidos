import { NextResponse, type NextRequest } from "next/server";
import { obterPerfil } from "@/lib/auth";
import { carregarDocumento } from "@/lib/documentos";
import { nomeArquivo, type Formato } from "@/lib/impressao";
import { gerarPdf } from "@/lib/pdf/gerar";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest, ctx: RouteContext<"/simulacoes/[id]/pdf">) {
  const perfil = await obterPerfil();
  if (!perfil?.ativa) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const formato: Formato = request.nextUrl.searchParams.get("formato") === "celular" ? "celular" : "a4";
  const carregado = await carregarDocumento(id); // RLS: só o que a pessoa pode ver
  if (!carregado) return NextResponse.json({ erro: "Documento não encontrado." }, { status: 404 });

  const { pdf } = await gerarPdf({
    origem: request.nextUrl.origin,
    documentoId: id,
    formato,
    cookies: request.cookies.getAll(),
  });

  const nome = nomeArquivo(carregado.documento, formato);
  const disposicao = request.nextUrl.searchParams.get("ver") === "1" ? "inline" : "attachment";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposicao}; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
