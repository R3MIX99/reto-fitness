import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// Singleton: un solo cliente de navegador en toda la app. Crear múltiples
// instancias provoca carreras al refrescar el token (un request falla con
// "TypeError" y al reintentar funciona). Memoizarlo lo evita.
let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (browserClient) return browserClient;
  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return browserClient;
}
