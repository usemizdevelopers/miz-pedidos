import { createBrowserClient } from "@supabase/ssr";

/** Cliente no navegador, com a sessão do usuário (cookies). Tudo passa pelo RLS. */
export function criarClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
