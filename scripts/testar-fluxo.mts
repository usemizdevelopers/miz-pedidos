// Teste de integração da Fase 2 no banco real: caso Dulcinéa de ponta a ponta.
// Cria vendedoras temporárias, salva/edita/converte/duplica, e apaga tudo no fim
// (inclusive devolve a numeração de pedidos ao estado anterior).
// Uso: npm run test:fluxo
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const admin = createClient(URL_SB, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

let falhas = 0;
function verificar(descricao: string, passou: boolean, detalhe?: unknown) {
  console.log(`${passou ? "✓" : "✗"} ${descricao}`);
  if (!passou) {
    falhas++;
    if (detalhe !== undefined) console.log("   ", detalhe);
  }
}

const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const daqui = (dias: number) => {
  const d = new Date(`${hoje}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

async function vendedora(rotulo: string) {
  const email = `fluxo-${rotulo}-${randomBytes(4).toString("hex")}@teste.miz.local`;
  const senha = randomBytes(12).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error) throw error;
  await admin.from("profiles").update({ ativa: true, nome: `Fluxo ${rotulo}` }).eq("id", data.user.id);
  const sb = createClient(URL_SB, PUB, { auth: { persistSession: false } });
  await sb.auth.signInWithPassword({ email, password: senha });
  return { id: data.user.id, sb };
}

const criados: string[] = [];
const { data: numeracaoAntes } = await admin.from("numeracao_pedidos").select("*");

try {
  const a = await vendedora("a");
  criados.push(a.id);
  const b = await vendedora("b");
  criados.push(b.id);

  // Itens: uma grade por cor de cada peça do catálogo inicial
  const { data: cores } = await admin
    .from("peca_cores")
    .select("id, peca_id, ordem, pecas!inner(referencia)")
    .in("pecas.referencia", ["BL0001", "BL0006", "CT0001", "BL0003", "BL0004", "RE0001", "VD002", "RE0002"]);
  const referencia = (c: { pecas: unknown }) => (c.pecas as { referencia: string }).referencia;
  const itens = (cores ?? []).map((c, i) => ({ peca_id: c.peca_id, cor_id: c.id, n_grades: 1, ordem: i }));
  const itensProgramados = (cores ?? [])
    .filter((c) => referencia(c) === "RE0002")
    .map((c, i) => ({ peca_id: c.peca_id, cor_id: c.id, n_grades: 1, ordem: i }));
  verificar("26 cores no caso Dulcinéa", itens.length === 26, itens.length);

  const doc = {
    proprietaria: "Dulcinéa",
    loja: "Pura Tentação",
    cidade_uf: "Campestre/MG",
    cnpj: null,
    primeiro_pedido: true,
    validade: daqui(10),
    n_parcelas: 6,
  };

  // --- Salvar
  const { data: id, error: e1 } = await a.sb.rpc("salvar_simulacao", { p_id: null, p_doc: doc, p_itens: itens });
  verificar("salva a simulação da Dulcinéa", !e1 && Boolean(id), e1);

  const { data: salvo } = await a.sb.from("documentos").select("*").eq("id", id).single();
  verificar("envio imediato R$ 7.348,90", salvo?.total_imediato_centavos === 734890, salvo?.total_imediato_centavos);
  verificar("reservado R$ 739,80", salvo?.total_reservado_centavos === 73980, salvo?.total_reservado_centavos);
  verificar("total R$ 8.088,70", salvo?.total_centavos === 808870, salvo?.total_centavos);
  verificar("condições congeladas na simulação (markup 2,2)", Number(salvo?.condicoes_snapshot?.markup) === 2.2);

  const { data: itensSalvos } = await a.sb.from("documento_itens").select("disponibilidade, previsao, preco_centavos, peca_referencia").eq("documento_id", id);
  const programados = (itensSalvos ?? []).filter((i) => i.disponibilidade === "programada");
  verificar(
    "Regata Basic vai sozinha para o reservado, com previsão 20/10/2026",
    programados.length === 4 && programados.every((i) => i.peca_referencia === "RE0002" && i.previsao === "2026-10-20"),
    programados,
  );

  // --- Regras de validação
  const sete = await a.sb.rpc("salvar_simulacao", { p_id: null, p_doc: { ...doc, n_parcelas: 7 }, p_itens: itens });
  verificar("recusa 7x (máximo 6x)", sete.error?.message?.includes("6x") === true, sete.error?.message);

  const vencidaAoSalvar = await a.sb.rpc("salvar_simulacao", { p_id: null, p_doc: { ...doc, validade: daqui(-1) }, p_itens: itens });
  verificar("recusa salvar com validade no passado", Boolean(vencidaAoSalvar.error), vencidaAoSalvar.error?.message);

  const semItens = await a.sb.rpc("salvar_simulacao", { p_id: null, p_doc: doc, p_itens: [] });
  verificar("recusa simulação sem itens", Boolean(semItens.error));

  const corErrada = await a.sb.rpc("salvar_simulacao", {
    p_id: null,
    p_doc: doc,
    p_itens: [{ ...itens[0], peca_id: itens.find((i) => i.peca_id !== itens[0].peca_id)!.peca_id }],
  });
  verificar("recusa cor que não é da peça", corErrada.error?.message === "Cor não pertence à peça.", corErrada.error?.message);

  // --- Preço adulterado pela API é ignorado (o banco usa o catálogo)
  const item0 = (await a.sb.from("documento_itens").select("id, preco_centavos").eq("documento_id", id).limit(1).single()).data!;
  await a.sb.from("documento_itens").update({ preco_centavos: 1 }).eq("id", item0.id);
  const depoisAdulterar = (await a.sb.from("documento_itens").select("preco_centavos").eq("id", item0.id).single()).data!;
  verificar("preço adulterado pela API é ignorado", depoisAdulterar.preco_centavos === item0.preco_centavos, depoisAdulterar);

  // --- Só programados / só pronta entrega
  const soProg = await a.sb.rpc("salvar_simulacao", {
    p_id: null,
    p_doc: doc,
    p_itens: itensProgramados,
  });
  const { data: docSoProg } = await a.sb.from("documentos").select("total_imediato_centavos, total_reservado_centavos").eq("id", soProg.data).single();
  verificar("pedido só com programados: imediato 0, reservado R$ 739,80", docSoProg?.total_imediato_centavos === 0 && docSoProg?.total_reservado_centavos === 73980, docSoProg);
  await a.sb.from("documentos").delete().eq("id", soProg.data);

  // --- Converter
  const semCnpj = await a.sb.rpc("converter_em_pedido", { p_id: id, p_cnpj: "11.222.333/0001-82" });
  verificar("conversão recusa CNPJ inválido", Boolean(semCnpj.error), semCnpj.error?.message);

  const outra = await b.sb.rpc("converter_em_pedido", { p_id: id, p_cnpj: "11.222.333/0001-81" });
  verificar("outra vendedora NÃO converte a simulação", Boolean(outra.error), outra.error?.message);

  // Simulação vencida (forçada pelo admin) não converte
  await admin.from("documentos").update({ validade: daqui(-1) }).eq("id", id);
  const vencida = await a.sb.rpc("converter_em_pedido", { p_id: id, p_cnpj: "11.222.333/0001-81" });
  verificar("simulação VENCIDA não converte", vencida.error?.message?.includes("vencida") === true, vencida.error?.message);
  await admin.from("documentos").update({ validade: daqui(10) }).eq("id", id);

  const { data: numero, error: eConv } = await a.sb.rpc("converter_em_pedido", { p_id: id, p_cnpj: "12.ABC.345/01DE-35" });
  verificar("converte com CNPJ alfanumérico válido", !eConv && /^\d{4}-\d{4}$/.test(String(numero)), eConv ?? numero);
  verificar(`número no formato ${hoje.slice(0, 4)}-NNNN`, String(numero).startsWith(`${hoje.slice(0, 4)}-`), numero);

  const { data: conf } = await a.sb.from("documentos").select("status, cnpj, total_centavos, confirmado_em").eq("id", id).single();
  verificar("status confirmado, CNPJ gravado normalizado", conf?.status === "confirmado" && conf?.cnpj === "12ABC34501DE35", conf);
  verificar("total confirmado continua R$ 8.088,70", conf?.total_centavos === 808870, conf?.total_centavos);

  // --- Pedido confirmado é imutável
  const editar = await a.sb.rpc("salvar_simulacao", { p_id: id, p_doc: doc, p_itens: itens });
  verificar("pedido confirmado não pode ser editado", Boolean(editar.error), editar.error?.message);
  const excluir = await a.sb.from("documentos").delete().eq("id", id).select();
  verificar("pedido confirmado não pode ser excluído", (excluir.data?.length ?? 0) === 0);
  const mudarItem = await a.sb.from("documento_itens").update({ n_grades: 9 }).eq("documento_id", id).select();
  verificar("itens do pedido confirmado não mudam", (mudarItem.data?.length ?? 0) === 0);
  const reconv = await a.sb.rpc("converter_em_pedido", { p_id: id, p_cnpj: "11.222.333/0001-81" });
  verificar("não converte duas vezes", Boolean(reconv.error));

  // Mesmo que o admin mude o preço no catálogo, o pedido não muda
  const { data: mia } = await admin.from("pecas").select("id, preco_centavos").eq("referencia", "BL0001").single();
  await admin.from("pecas").update({ preco_centavos: 9999 }).eq("id", mia!.id);
  const { data: congelado } = await a.sb.from("documento_itens").select("preco_centavos").eq("documento_id", id).eq("peca_id", mia!.id).limit(1).single();
  verificar("mudança de preço no catálogo não altera o pedido", congelado?.preco_centavos === 4999, congelado);
  await admin.from("pecas").update({ preco_centavos: mia!.preco_centavos }).eq("id", mia!.id);

  // --- Duplicar
  const { data: copia, error: eDup } = await a.sb.rpc("duplicar_documento", { p_id: id });
  const { data: docCopia } = await a.sb.from("documentos").select("status, validade, total_centavos, numero").eq("id", copia).single();
  verificar(
    "duplicar pedido gera simulação nova, sem validade e sem número",
    !eDup && docCopia?.status === "simulacao" && docCopia.validade === null && docCopia.numero === null && docCopia.total_centavos === 808870,
    eDup ?? docCopia,
  );
  const dupOutra = await b.sb.rpc("duplicar_documento", { p_id: id });
  verificar("outra vendedora NÃO duplica", Boolean(dupOutra.error));
} finally {
  for (const id of criados) {
    await admin.from("documentos").delete().eq("vendedora_id", id);
    await admin.auth.admin.deleteUser(id);
  }
  // Devolve a numeração (o teste não pode "gastar" o 2026-0001)
  await admin.from("numeracao_pedidos").delete().gte("ano", 0);
  if (numeracaoAntes?.length) await admin.from("numeracao_pedidos").insert(numeracaoAntes);
}

console.log(falhas === 0 ? "\nFluxo ok: todas as verificações passaram." : `\n${falhas} verificação(ões) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
