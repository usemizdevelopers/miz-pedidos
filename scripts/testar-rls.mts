// Verifica as regras de acesso direto na API do Supabase (sem passar pela interface).
// Cria duas vendedoras temporárias, tenta burlar o RLS e apaga tudo no fim.
// Uso: npm run test:rls
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const admin = createClient(URL_SB, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let falhas = 0;
function verificar(descricao: string, passou: boolean, detalhe?: unknown) {
  console.log(`${passou ? "✓" : "✗"} ${descricao}`);
  if (!passou) {
    falhas++;
    if (detalhe) console.log("   ", detalhe);
  }
}

async function criarVendedoraTeste(rotulo: string) {
  const email = `rls-${rotulo}-${randomBytes(4).toString("hex")}@teste.miz.local`;
  const senha = randomBytes(12).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error) throw error;
  await admin.from("profiles").update({ ativa: true, nome: `Teste ${rotulo}` }).eq("id", data.user.id);
  const cliente = createClient(URL_SB, PUB, { auth: { persistSession: false } });
  const { error: e2 } = await cliente.auth.signInWithPassword({ email, password: senha });
  if (e2) throw e2;
  return { id: data.user.id, sb: cliente };
}

async function criarSimulacao(sb: SupabaseClient, vendedoraId: string) {
  const { data: cli, error: e1 } = await sb
    .from("clientes")
    .insert({ vendedora_id: vendedoraId, proprietaria: "Teste", loja: "Loja Teste", cidade_uf: "Itajaí/SC" })
    .select("id")
    .single();
  if (e1) throw e1;
  const { data: doc, error: e2 } = await sb
    .from("documentos")
    .insert({ vendedora_id: vendedoraId, cliente_id: cli.id, proprietaria: "Teste", loja: "Loja Teste", cidade_uf: "Itajaí/SC", primeiro_pedido: true, n_parcelas: 6 })
    .select("id")
    .single();
  if (e2) throw e2;
  return { clienteId: cli.id as string, docId: doc.id as string };
}

const criados: string[] = [];
try {
  const a = await criarVendedoraTeste("a");
  criados.push(a.id);
  const b = await criarVendedoraTeste("b");
  criados.push(b.id);

  // --- Catálogo e condições: só leitura
  const pecas = await a.sb.from("pecas").select("id, referencia");
  verificar("vendedora lê o catálogo", !pecas.error && (pecas.data?.length ?? 0) > 0, pecas.error);

  const insPeca = await a.sb.from("pecas").insert({ referencia: "HACK1", nome: "x", preco_centavos: 1, grade_tipo_id: crypto.randomUUID() });
  verificar("vendedora NÃO cria peça", Boolean(insPeca.error));

  const updPreco = await a.sb.from("pecas").update({ preco_centavos: 1 }).neq("id", crypto.randomUUID()).select();
  verificar("vendedora NÃO altera preço", (updPreco.data?.length ?? 0) === 0, updPreco.data);

  const updCond = await a.sb.from("condicoes_comerciais").update({ markup: 5 }).eq("id", 1).select();
  verificar("vendedora NÃO altera condições", (updCond.data?.length ?? 0) === 0, updCond.data);

  const insModelo = await a.sb.from("modelo_pdf_versoes").insert({ versao: 999, blocos: [] });
  verificar("vendedora NÃO cria versão do modelo do PDF", Boolean(insModelo.error));

  const updGrade = await a.sb.from("grade_tipos").update({ pecas_por_grade: 99 }).neq("id", crypto.randomUUID()).select();
  verificar("vendedora NÃO altera grades", (updGrade.data?.length ?? 0) === 0, updGrade.data);

  // --- Cor indisponível escondida
  const { data: umaCor } = await admin.from("peca_cores").select("id, disponibilidade").limit(1).single();
  await admin.from("peca_cores").update({ disponibilidade: "indisponivel" }).eq("id", umaCor!.id);
  const corVista = await a.sb.from("peca_cores").select("id").eq("id", umaCor!.id);
  verificar("cor indisponível não aparece para a vendedora", (corVista.data?.length ?? 0) === 0, corVista.data);
  await admin.from("peca_cores").update({ disponibilidade: umaCor!.disponibilidade }).eq("id", umaCor!.id);

  // --- Perfis
  const promover = await a.sb.from("profiles").update({ papel: "admin" }).eq("id", a.id).select();
  verificar("vendedora NÃO se promove a admin", (promover.data?.length ?? 0) === 0, promover.data);

  const perfisVistos = await a.sb.from("profiles").select("id");
  verificar("vendedora vê só o próprio perfil", perfisVistos.data?.length === 1 && perfisVistos.data[0].id === a.id, perfisVistos.data);

  // --- Documentos de outra vendedora
  const simA = await criarSimulacao(a.sb, a.id);
  verificar("vendedora cria a própria simulação", Boolean(simA.docId));

  const docsB = await b.sb.from("documentos").select("id").eq("id", simA.docId);
  verificar("outra vendedora NÃO vê a simulação", (docsB.data?.length ?? 0) === 0, docsB.data);

  const cliB = await b.sb.from("clientes").select("id").eq("id", simA.clienteId);
  verificar("outra vendedora NÃO vê o cliente", (cliB.data?.length ?? 0) === 0, cliB.data);

  const updB = await b.sb.from("documentos").update({ n_parcelas: 1 }).eq("id", simA.docId).select();
  verificar("outra vendedora NÃO edita a simulação", (updB.data?.length ?? 0) === 0, updB.data);

  const delB = await b.sb.from("documentos").delete().eq("id", simA.docId).select();
  verificar("outra vendedora NÃO exclui a simulação", (delB.data?.length ?? 0) === 0, delB.data);

  const roubo = await b.sb.from("documentos").insert({ vendedora_id: a.id, cliente_id: simA.clienteId, proprietaria: "X", loja: "X", cidade_uf: "X", primeiro_pedido: true, n_parcelas: 1 });
  verificar("vendedora NÃO cria documento em nome de outra", Boolean(roubo.error));

  // --- Confirmação só pela função do banco
  const confirmarDireto = await a.sb.from("documentos").update({ status: "confirmado" }).eq("id", simA.docId).select();
  verificar("vendedora NÃO confirma pedido direto pela API", (confirmarDireto.data?.length ?? 0) === 0, confirmarDireto.error ?? confirmarDireto.data);

  const insConfirmado = await a.sb
    .from("documentos")
    .insert({ vendedora_id: a.id, cliente_id: simA.clienteId, proprietaria: "X", loja: "X", cidade_uf: "X", primeiro_pedido: true, n_parcelas: 1, status: "confirmado" });
  verificar("vendedora NÃO cria pedido já confirmado", Boolean(insConfirmado.error));

  // --- Vendedora desativada perde acesso na hora
  await admin.from("profiles").update({ ativa: false }).eq("id", a.id);
  const aposDesativar = await a.sb.from("documentos").select("id");
  verificar("vendedora desativada não vê mais nada", (aposDesativar.data?.length ?? 0) === 0, aposDesativar.data);

  // --- Anônimo
  const anon = createClient(URL_SB, PUB, { auth: { persistSession: false } });
  const anonPecas = await anon.from("pecas").select("id");
  verificar("visitante sem login NÃO lê o catálogo", (anonPecas.data?.length ?? 0) === 0);
} finally {
  for (const id of criados) {
    await admin.from("documentos").delete().eq("vendedora_id", id);
    await admin.from("clientes").delete().eq("vendedora_id", id);
    await admin.auth.admin.deleteUser(id);
  }
}

console.log(falhas === 0 ? "\nRLS ok: todas as verificações passaram." : `\n${falhas} verificação(ões) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
