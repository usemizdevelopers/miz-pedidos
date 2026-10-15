import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a secret key: ignora o RLS. Usar só para o que o RLS não cobre
 * (gestão de usuários no Auth), sempre depois de exigirAdmin().
 */
export function criarClienteAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
