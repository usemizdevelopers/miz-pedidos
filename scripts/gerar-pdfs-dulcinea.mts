// Gera os 4 PDFs do caso Dulcinéa (simulação e pedido confirmado, A4 e celular) pela rota real do app.
// Precisa do `npm run dev` rodando. Cria uma vendedora temporária "Rafael" e apaga tudo no fim.
// Uso: npm run pdfs:dulcinea [-- pasta-de-saida]
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

config({ path: ".env.local", quiet: true });

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const SAIDA = process.argv[2] ?? "pdfs";
mkdirSync(SAIDA, { recursive: true });

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const admin = createClient(URL_SB, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const validade = (() => {
  const d = new Date(`${hoje}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 10);
  return d.toISOString().slice(0, 10);
})();

const email = `rafael-pdf-${randomBytes(3).toString("hex")}@teste.miz.local`;
const senha = randomBytes(12).toString("base64url");
const { data: criado, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
if (error) throw error;
await admin.from("profiles").update({ ativa: true, nome: "Rafael", whatsapp: "(47) 99999-0000" }).eq("id", criado.user.id);
const { data: numeracaoAntes } = await admin.from("numeracao_pedidos").select("*");

let falhas = 0;
const browser = await chromium.launch();
try {
  const contexto = await browser.newContext();
  const page = await contexto.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${BASE}/simulacoes`);

  // Itens: uma grade por cor das 8 peças do caso, na ordem do PDF de referência
  const ordem = ["BL0001", "BL0006", "CT0001", "BL0003", "BL0004", "RE0001", "VD002", "RE0002"];
  const { data: cores } = await admin.from("peca_cores").select("id, peca_id, ordem, pecas!inner(referencia)").in("pecas.referencia", ordem);
  const ref = (c: { pecas: unknown }) => (c.pecas as { referencia: string }).referencia;
  const itens = (cores ?? [])
    .sort((a, b) => ordem.indexOf(ref(a)) - ordem.indexOf(ref(b)) || a.ordem - b.ordem)
    .map((c, i) => ({ peca_id: c.peca_id, cor_id: c.id, n_grades: 1, ordem: i }));

  // Salva como a vendedora (RPC com a sessão dela, via fetch da própria página)
  const sb = createClient(URL_SB, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  await sb.auth.signInWithPassword({ email, password: senha });
  const { data: id, error: e1 } = await sb.rpc("salvar_simulacao", {
    p_id: null,
    p_doc: { proprietaria: "Dulcinéa", loja: "Pura Tentação", cidade_uf: "Campestre / MG", cnpj: null, primeiro_pedido: true, validade, n_parcelas: 6 },
    p_itens: itens,
  });
  if (e1) throw e1;

  /** Regras do layout, medidas no próprio documento paginado. */
  async function verificar(docId: string, formato: "a4" | "celular") {
    await page.goto(`${BASE}/impressao/${docId}?formato=${formato}`);
    await page.waitForFunction(() => window.__paginado === true, null, { timeout: 30_000 });
    const r = await page.evaluate(() => {
      const folhas = [...document.querySelectorAll<HTMLElement>("#documento .folha")].map((f) => {
        const c = f.querySelector<HTMLElement>(".conteudo")!;
        const cs = getComputedStyle(c);
        const capacidade = c.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        const blocos = [...c.children] as HTMLElement[];
        const usado = blocos.length ? blocos.at(-1)!.offsetTop + blocos.at(-1)!.offsetHeight - blocos[0].offsetTop : 0;
        return { inteira: f.classList.contains("folha-inteira"), ocupacao: usado / capacidade, estouro: usado > capacidade + 1 };
      });
      let menorFonte = 999;
      for (const el of document.querySelectorAll<HTMLElement>("#documento *")) {
        const temTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
        if (temTexto) menorFonte = Math.min(menorFonte, parseFloat(getComputedStyle(el).fontSize));
      }
      return { folhas, menorFonte };
    });
    const vazias = r.folhas.filter((f, i) => i < r.folhas.length - 1 && !f.inteira && f.ocupacao < 0.5);
    const estouros = r.folhas.filter((f) => f.estouro);
    const ocup = r.folhas.map((f) => (f.inteira ? "inteira" : `${Math.round(f.ocupacao * 100)}%`)).join(", ");
    const ok = vazias.length === 0 && estouros.length === 0 && (formato === "a4" || r.menorFonte >= 9);
    if (!ok) falhas++;
    console.log(`  ${ok ? "✓" : "✗"} ${formato}: ${r.folhas.length} páginas (${ocup}) · menor fonte ${r.menorFonte.toFixed(1)}px${vazias.length ? " · PÁGINA MEIO VAZIA" : ""}${estouros.length ? " · CONTEÚDO CORTADO" : ""}`);
  }

  async function baixar(docId: string, formato: "a4" | "celular", sufixo = "") {
    const r = await page.request.get(`${BASE}/simulacoes/${docId}/pdf?formato=${formato}`, { timeout: 90_000 });
    if (!r.ok()) throw new Error(`PDF ${formato}: HTTP ${r.status()} ${await r.text()}`);
    const nome = (/filename="([^"]+)"/.exec(r.headers()["content-disposition"] ?? "")?.[1] ?? `${docId}-${formato}.pdf`).replace(".pdf", `${sufixo}.pdf`);
    writeFileSync(join(SAIDA, nome), await r.body());
    console.log(`✓ ${nome}`);
    await verificar(docId, formato);
  }

  await baixar(id, "a4");
  await baixar(id, "celular");

  const { error: e2 } = await sb.rpc("converter_em_pedido", { p_id: id, p_cnpj: "11.222.333/0001-81" });
  if (e2) throw e2;
  await baixar(id, "a4");
  await baixar(id, "celular");

  // Exemplo extra: reservado em duas datas (muda a previsão de uma cor só durante o teste)
  const { data: preto } = await admin
    .from("peca_cores")
    .select("id, previsao, pecas!inner(referencia)")
    .eq("pecas.referencia", "RE0002")
    .eq("nome", "Preto")
    .single();
  await admin.from("peca_cores").update({ previsao: "2026-11-05" }).eq("id", preto!.id);
  try {
    const { data: id2, error: e3 } = await sb.rpc("salvar_simulacao", {
      p_id: null,
      p_doc: { proprietaria: "Dulcinéa", loja: "Pura Tentação", cidade_uf: "Campestre / MG", cnpj: null, primeiro_pedido: true, validade, n_parcelas: 6 },
      p_itens: itens,
    });
    if (e3) throw e3;
    await baixar(id2, "a4", "_reservado-2-datas");
  } finally {
    await admin.from("peca_cores").update({ previsao: preto!.previsao }).eq("id", preto!.id);
  }
} finally {
  await browser.close();
  await admin.from("documentos").delete().eq("vendedora_id", criado.user.id);
  await admin.auth.admin.deleteUser(criado.user.id);
  await admin.from("numeracao_pedidos").delete().gte("ano", 0);
  if (numeracaoAntes?.length) await admin.from("numeracao_pedidos").insert(numeracaoAntes);
}
console.log(falhas ? `\n${falhas} verificação(ões) de layout falharam.` : `\nLayout ok. PDFs em ${SAIDA}`);
process.exit(falhas ? 1 : 0);
