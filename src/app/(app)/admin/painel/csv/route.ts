import { NextResponse, type NextRequest } from "next/server";
import { obterPerfil } from "@/lib/auth";
import { formatarCnpj } from "@/lib/cnpj";
import { formatarValor } from "@/lib/dinheiro";
import { formatarData, formatarDataHora, hojeSP } from "@/lib/datas";
import { carregarPainel, lerFiltros } from "@/lib/painel-dados";

const ROTULO_SITUACAO = { aberta: "Simulação em aberto", vencida: "Simulação vencida", confirmado: "Pedido confirmado" } as const;

/** Célula CSV (separador ";", padrão do Excel em português). */
function celula(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  const perfil = await obterPerfil();
  if (!perfil?.ativa || perfil.papel !== "admin") return NextResponse.json({ erro: "Não autorizado." }, { status: 403 });

  const filtros = lerFiltros(Object.fromEntries(request.nextUrl.searchParams));
  const { todos } = await carregarPainel(filtros);
  const lista = filtros.situacao ? todos.filter((d) => d.situacao === filtros.situacao) : todos;

  const cabecalho = [
    "Número", "Situação", "Vendedora", "Proprietária", "Loja", "Cidade/UF", "CNPJ", "Tipo", "Parcelas",
    "Envio imediato (R$)", "Reservado (R$)", "Total (R$)", "Criado em", "Validade", "Confirmado em",
  ];
  const linhas = lista.map((d) =>
    [
      d.numero,
      ROTULO_SITUACAO[d.situacao],
      d.vendedora,
      d.proprietaria,
      d.loja,
      d.cidade_uf,
      d.cnpj ? formatarCnpj(d.cnpj) : "",
      d.primeiro_pedido ? "1º pedido" : "Recompra",
      d.n_parcelas,
      formatarValor(d.total_imediato_centavos ?? 0),
      formatarValor(d.total_reservado_centavos ?? 0),
      formatarValor(d.total_centavos ?? 0),
      formatarDataHora(d.criado_em),
      d.status === "simulacao" ? formatarData(d.validade) : "",
      d.confirmado_em ? formatarDataHora(d.confirmado_em) : "",
    ]
      .map(celula)
      .join(";"),
  );

  // BOM: o Excel abre os acentos certos
  const csv = "﻿" + [cabecalho.join(";"), ...linhas].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="Miz_Painel_${filtros.de}_a_${filtros.ate}_${hojeSP()}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
