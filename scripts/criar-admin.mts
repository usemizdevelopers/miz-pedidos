// Cria (ou promove) o primeiro admin e imprime uma senha temporária.
// Uso: npm run admin:criar [-- email@exemplo.com]
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;
const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();

if (!url || !secret || !email) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY ou ADMIN_EMAIL no .env.local.");
  process.exit(1);
}

const sb = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const senha = randomBytes(9).toString("base64url");

async function acharUsuario(alvo: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === alvo);
    if (u || data.users.length < 200) return u;
  }
}

let usuario = await acharUsuario(email);
if (usuario) {
  const { error } = await sb.auth.admin.updateUserById(usuario.id, { password: senha, ban_duration: "none" });
  if (error) throw error;
  console.log(`Usuário já existia: senha redefinida.`);
} else {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: "Admin Miz" },
  });
  if (error) throw error;
  usuario = data.user;
  console.log(`Usuário criado.`);
}

const { error: erroPerfil } = await sb
  .from("profiles")
  .update({ papel: "admin", ativa: true })
  .eq("id", usuario!.id);
if (erroPerfil) {
  console.error("Não consegui promover o perfil. As migrações já foram aplicadas? (npm run db:push)");
  throw erroPerfil;
}

console.log(`\nAdmin pronto: ${email}\nSenha temporária: ${senha}\nTroque em "Minha conta" depois do primeiro login.\n`);
