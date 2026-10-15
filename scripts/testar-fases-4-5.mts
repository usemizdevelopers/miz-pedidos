// Teste de ponta a ponta das Fases 4 e 5 (precisa do `npm run dev` rodando):
// editor do modelo com versões, imutabilidade dos documentos já gerados, restauração,
// WhatsApp, painel e CSV. Cria usuárias temporárias e apaga tudo no fim.
// Uso: npm run test:fases45 [-- pasta-para-prints]
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Page } from "playwright";

config({ path: ".env.local", quiet: true });

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const PRINTS = process.argv[2] ?? "prints";
mkdirSync(PRINTS, { recursive: true });
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
const validade = (() => {
  const d = new Date(`${hoje}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 10);
  return d.toISOString().slice(0, 10);
})();

async function usuario(papel: "admin" | "vendedora", nome: string) {
  const email = `f45-${papel}-${randomBytes(3).toString("hex")}@teste.miz.local`;
  const senha = randomBytes(12).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error) throw error;
  await admin.from("profiles").update({ ativa: true, papel, nome }).eq("id", data.user.id);
  const sb = createClient(URL_SB, PUB, { auth: { persistSession: false } });
  await sb.auth.signInWithPassword({ email, password: senha });
  return { id: data.user.id, email, senha, sb };
}

async function entrar(page: Page, email: string, senha: string) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

const { data: versaoInicial } = await admin.from("modelo_pdf_versoes").select("versao").order("versao", { ascending: false }).limit(1).single();
const V = versaoInicial!.versao as number;
const { data: numeracaoAntes } = await admin.from("numeracao_pedidos").select("*");
const criados: string[] = [];
const browser = await chromium.launch();

try {
  const adm = await usuario("admin", "Admin Teste");
  criados.push(adm.id);
  const vend = await usuario("vendedora", "Vendedora Teste");
  criados.push(vend.id);

  const { data: cores } = await admin.from("peca_cores").select("id, peca_id, pecas!inner(referencia)").in("pecas.referencia", ["BL0001", "RE0002"]);
  const itens = (cores ?? []).map((c, i) => ({ peca_id: c.peca_id, cor_id: c.id, n_grades: 1, ordem: i }));
  const doc = { proprietaria: "Dulcinéa", loja: "Pura Tentação", cidade_uf: "Campestre/MG", cnpj: null, primeiro_pedido: true, validade, n_parcelas: 6 };
  const salvar = async () => {
    const { data, error } = await vend.sb.rpc("salvar_simulacao", { p_id: null, p_doc: doc, p_itens: itens });
    if (error) throw error;
    return data as string;
  };
  const versaoDe = async (id: string) =>
    (await admin.from("documentos").select("modelo_pdf_versoes(versao)").eq("id", id).single()).data?.modelo_pdf_versoes as unknown as { versao: number };

  // ---------------------------------------------------------- Fase 4: editor
  const s1 = await salvar();
  verificar(`simulação antiga usa a versão atual (v${V})`, (await versaoDe(s1)).versao === V);

  const pAdm = await (await browser.newContext({ viewport: { width: 1500, height: 1000 } })).newPage();
  await entrar(pAdm, adm.email, adm.senha);
  const errosConsole: string[] = [];
  pAdm.on("console", (m) => m.type() === "error" && errosConsole.push(m.text()));
  pAdm.on("pageerror", (e) => errosConsole.push(e.message));
  await pAdm.goto(`${BASE}/admin/modelo`);
  await pAdm.getByText("Simulação · conta do lucro e pedido").click();
  await pAdm.getByLabel("Lema", { exact: true }).fill("TESTE DO EDITOR");
  await pAdm
    .locator(".previa-pdf")
    .getByText("TESTE DO EDITOR")
    .first()
    .waitFor({ state: "attached", timeout: 10_000 })
    .catch(async (e) => {
      await pAdm.screenshot({ path: `${PRINTS}/erro-previa.png`, fullPage: true });
      console.log("Erros no navegador:", errosConsole.slice(0, 5));
      throw e;
    });
  verificar("pré-visualização ao vivo mostra o texto novo", true);

  await pAdm.getByLabel("Título da conta").fill("CONTA {lojaa}");
  await pAdm
    .getByText("Variável {lojaa} não existe.")
    .waitFor({ timeout: 10_000 })
    .catch(async (e) => {
      await pAdm.screenshot({ path: `${PRINTS}/erro-variavel.png`, fullPage: true });
      throw e;
    });
  verificar("editor aponta variável inexistente e bloqueia salvar", await pAdm.getByRole("button", { name: /Salvar como versão/ }).isDisabled());
  await pAdm.getByLabel("Título da conta").fill("A conta do lucro");

  await pAdm.getByPlaceholder("O que mudou? (opcional)").fill("Teste automático");
  await pAdm.screenshot({ path: `${PRINTS}/5-editor.png`, fullPage: false });
  await pAdm.getByRole("button", { name: `Salvar como versão ${V + 1}` }).click();
  await pAdm
    .getByRole("cell").filter({ hasText: new RegExp(`^v${V + 1}\s*atual$`) })
    .waitFor({ timeout: 15_000 })
    .catch(async (e) => {
      await pAdm.screenshot({ path: `${PRINTS}/erro-salvar.png`, fullPage: true });
      throw e;
    });
  verificar(`salvar cria a versão ${V + 1}`, true);

  const s2 = await salvar();
  verificar(`simulação nova usa a versão ${V + 1}`, (await versaoDe(s2)).versao === V + 1);
  verificar(`simulação antiga continua na versão ${V}`, (await versaoDe(s1)).versao === V);

  const pVend = await (await browser.newContext()).newPage();
  await entrar(pVend, vend.email, vend.senha);
  const htmlDe = async (id: string) => (await pVend.request.get(`${BASE}/impressao/${id}?formato=a4`)).text();
  verificar("PDF da simulação nova traz o texto novo", (await htmlDe(s2)).includes("TESTE DO EDITOR"));
  const antigo = await htmlDe(s1);
  verificar("PDF já gerado NÃO muda (texto antigo, sem o novo)", antigo.includes("Use mais de você. Use Miz.") && !antigo.includes("TESTE DO EDITOR"));

  // Editar a simulação antiga carimba a versão vigente (é um documento novo de fato)
  const { error: eEd } = await vend.sb.rpc("salvar_simulacao", { p_id: s1, p_doc: doc, p_itens: itens });
  verificar("editar a simulação antiga passa a usar a versão vigente", !eEd && (await versaoDe(s1)).versao === V + 1);

  // Restaurar a versão V → vira V+2
  pAdm.on("dialog", (d) => void d.accept());
  await pAdm.getByRole("row", { name: new RegExp(`^v${V}\\b`) }).getByRole("button", { name: "Restaurar" }).click();
  await pAdm.getByRole("cell").filter({ hasText: new RegExp(`^v${V + 2}\s*atual$`) }).waitFor({ timeout: 15_000 });
  const s3 = await salvar();
  verificar(`restaurar a v${V} cria a v${V + 2} e o texto original volta`, (await versaoDe(s3)).versao === V + 2 && !(await htmlDe(s3)).includes("TESTE DO EDITOR"));

  await pVend.goto(`${BASE}/admin/modelo`);
  verificar("vendedora não acessa o editor", !pVend.url().includes("/admin"));

  // ---------------------------------------------------------- Fase 5: WhatsApp
  await pVend.goto(`${BASE}/simulacoes/${s3}`);
  const msg = await pVend.locator("aside").getByText(/montei o mix da Pura Tentação/).textContent();
  verificar("mensagem de WhatsApp da simulação preenchida", Boolean(msg?.includes("Você investe R$ 1.489,65") && msg.includes("vira R$ 3.277,23")), msg);
  await pVend.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  await pVend.getByRole("button", { name: "Copiar mensagem" }).click();
  await pVend.getByRole("button", { name: "Copiado ✓" }).waitFor();
  const colado = await pVend.evaluate(() => navigator.clipboard.readText());
  verificar("botão copia a mensagem", colado === msg, colado);

  const { data: numero, error: eConv } = await vend.sb.rpc("converter_em_pedido", { p_id: s3, p_cnpj: "11.222.333/0001-81" });
  if (eConv) throw eConv;
  await pVend.goto(`${BASE}/simulacoes/${s3}`);
  const msgPedido = await pVend.locator("aside").getByText(/segue seu pedido/).textContent();
  verificar("mensagem de WhatsApp do pedido", Boolean(msgPedido?.includes(`nº ${numero}`) && msgPedido.includes("6x de R$ 124,98")), msgPedido);
  await pVend.screenshot({ path: `${PRINTS}/6-whatsapp.png`, fullPage: true });

  // ---------------------------------------------------------- Fase 5: painel
  await pAdm.goto(`${BASE}/admin/painel?vendedora=${vend.id}&de=${hoje}&ate=${hoje}`);
  const kpis = await pAdm.locator(".cartao").allTextContents();
  const tem = (t: string) => kpis.some((k) => k.includes(t));
  verificar("painel: 3 simulações geradas", tem("Simulações geradas3"), kpis.slice(0, 5));
  verificar("painel: 1 pedido confirmado, conversão 33,3%", tem("Pedidos confirmados1") && tem("Conversão 33,3%"));
  verificar("painel: valor confirmado e ticket médio R$ 1.489,65", tem("Valor confirmadoR$ 1.489,65") && tem("Ticket médio R$ 1.489,65"));
  await pAdm.screenshot({ path: `${PRINTS}/7-painel.png`, fullPage: true });

  const csv = await (await pAdm.request.get(`${BASE}/admin/painel/csv?vendedora=${vend.id}&de=${hoje}&ate=${hoje}`)).text();
  const linhas = csv.trim().split("\r\n");
  verificar("CSV: cabeçalho + 3 documentos", linhas.length === 4, linhas.length);
  verificar(
    "CSV: separador ; e valores em reais",
    linhas[0].replace(/^﻿/, "").startsWith("Número;Situação;") && csv.includes(`${numero};Pedido confirmado;Vendedora Teste`) && csv.includes(";1.489,65;"),
    linhas.slice(0, 2),
  );
  const bytes = await (await pAdm.request.get(`${BASE}/admin/painel/csv?vendedora=${vend.id}&de=${hoje}&ate=${hoje}`)).body();
  verificar("CSV começa com BOM (acentos certos no Excel)", bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf);
  const csvSoPedidos = await (await pAdm.request.get(`${BASE}/admin/painel/csv?vendedora=${vend.id}&de=${hoje}&ate=${hoje}&situacao=confirmado`)).text();
  verificar("CSV filtrado por situação", csvSoPedidos.trim().split("\r\n").length === 2);

  const csvVend = await pVend.request.get(`${BASE}/admin/painel/csv`);
  verificar("vendedora NÃO baixa o CSV do painel", csvVend.status() === 403, csvVend.status());
} finally {
  await browser.close();
  for (const id of criados) await admin.from("documentos").delete().eq("vendedora_id", id);
  await admin.from("modelo_pdf_versoes").delete().gt("versao", V);
  for (const id of criados) await admin.auth.admin.deleteUser(id);
  await admin.from("numeracao_pedidos").delete().gte("ano", 0);
  if (numeracaoAntes?.length) await admin.from("numeracao_pedidos").insert(numeracaoAntes);
}

console.log(falhas === 0 ? "\nFases 4 e 5 ok." : `\n${falhas} verificação(ões) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
