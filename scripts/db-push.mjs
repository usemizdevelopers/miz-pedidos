// Aplica as migrações de supabase/migrations no banco apontado por SUPABASE_DB_URL (.env.local).
import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("Preencha SUPABASE_DB_URL no .env.local (Supabase > Connect > Session pooler).");
  process.exit(1);
}

const extras = process.argv.slice(2);
const r = spawnSync("npx", ["supabase", "db", "push", "--db-url", url, "--yes", ...extras], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(r.status ?? 1);
