// Teste de ponta a ponta na interface (precisa do `npm run dev` rodando).
// Uma vendedora temporária monta o pedido da Dulcinéa pelo formulário, salva e converte.
// Uso: npm run test:tela [-- pasta-para-prints]
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

config({ path: ".env.local", quiet: true });

const BASE = process.env.APP_URL ?? "http://localhost:3000";
const PRINTS = process.argv[2] ?? "prints";
mkdirSync(PRINTS, { recursive: true });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

const email = `tela-${randomBytes(4).toString("hex")}@teste.miz.local`;
const senha = randomBytes(12).toString("base64url");
const { data: criado, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true });
if (error) throw error;
await admin.from("profiles").update({ ativa: true, nome: "Vendedora Teste" }).eq("id", criado.user.id);
const { data: numeracaoAntes } = await admin.from("numeracao_pedidos").select("*");

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  await page.goto(`${BASE}/login`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${BASE}/simulacoes`);
  verificar("vendedora entra e cai em Simulações", true);

  await page.getByRole("link", { name: "Nova simulação" }).click();
  await page.waitForURL(`${BASE}/simulacoes/nova`);

  const inicio = Date.now();
  await page.getByLabel("Nome da proprietária").fill("Dulcinéa");
  await page.getByLabel("Nome da loja").fill("Pura Tentação");
  await page.getByLabel("Cidade/UF").fill("Campestre/MG");
  await page.getByLabel("Validade da proposta").fill(validade);
  // Só as 8 peças do caso (o catálogo pode ter outras)
  const PECAS = [
    "Blusa Mia",
    "Blusa Mia Tule",
    "Camiseta Oversize Liz",
    "Blusa Renda Maria",
    "Blusa Barrada Olívia",
    "Regata Chloé",
    "Vestido Detalhe Ribana Chloé",
    "Regata Canelada Basic",
  ];
  for (const nome of PECAS) {
    await page
      .locator("div.cartao")
      .filter({ has: page.getByText(nome, { exact: true }) })
      .getByRole("button", { name: "1 grade em cada cor" })
      .click();
  }
  const nPecas = PECAS.length;

  const resumo = page.locator("aside");
  await resumo
    .getByText("6x R$ 1.224,82")
    .waitFor({ timeout: 10000 })
    .catch(async () => void (await page.screenshot({ path: `${PRINTS}/erro-resumo.png`, fullPage: true })));
  verificar("resumo ao vivo: envio imediato 6x R$ 1.224,82", await resumo.getByText("6x R$ 1.224,82").isVisible());
  verificar("resumo ao vivo: reservado 6x R$ 123,30", await resumo.getByText("6x R$ 123,30").isVisible());
  verificar("resumo ao vivo: vira na loja R$ 17.795,14", await resumo.getByText("R$ 17.795,14").isVisible());
  await page.screenshot({ path: `${PRINTS}/1-formulario.png`, fullPage: true });

  await page.getByRole("button", { name: "Gerar simulação" }).click();
  await page.waitForURL(/\/simulacoes\/[0-9a-f-]{36}$/);
  const segundos = Math.round((Date.now() - inicio) / 1000);
  verificar(`simulação com ${nPecas} peças gerada (${segundos}s de preenchimento automatizado)`, nPecas === 8, nPecas);

  const corpo = page.locator("article");
  for (const texto of ["6x R$ 1.224,82", "6x R$ 123,30", "R$ 8.088,70", "R$ 17.795,14", "R$ 7.348,90", "R$ 739,80", "20/10/2026", "Você só paga na chegada"]) {
    verificar(`documento mostra "${texto}"`, (await corpo.getByText(texto, { exact: false }).count()) > 0);
  }
  verificar('documento mostra "Na 3ª peça vendida"', (await corpo.getByText("Na 3ª peça vendida", { exact: false }).count()) > 0);
  await page.screenshot({ path: `${PRINTS}/2-simulacao.png`, fullPage: true });

  page.on("dialog", (d) => void d.accept());
  await page.getByLabel("CNPJ da loja").fill("11.222.333/0001-81");
  await page.getByRole("button", { name: "Confirmar pedido" }).click();
  await page.waitForURL(/confirmado=1/);
  const selo = await page.locator("article").getByText(/^Pedido \d{4}-\d{4}$/).textContent();
  verificar(`pedido confirmado: ${selo}`, Boolean(selo));
  verificar("pedido confirmado não mostra Editar", (await page.getByRole("link", { name: "Editar" }).count()) === 0);
  await page.screenshot({ path: `${PRINTS}/3-pedido-confirmado.png`, fullPage: true });

  await page.goto(`${BASE}/simulacoes`);
  await page.screenshot({ path: `${PRINTS}/4-lista.png`, fullPage: true });

  await page.goto(`${BASE}/admin/pecas`);
  verificar("vendedora não acessa o admin", !page.url().includes("/admin"), page.url());
} finally {
  await browser.close();
  await admin.from("documentos").delete().eq("vendedora_id", criado.user.id);
  await admin.auth.admin.deleteUser(criado.user.id);
  await admin.from("numeracao_pedidos").delete().gte("ano", 0);
  if (numeracaoAntes?.length) await admin.from("numeracao_pedidos").insert(numeracaoAntes);
}

console.log(falhas === 0 ? `\nTela ok. Prints em ${PRINTS}/` : `\n${falhas} verificação(ões) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
