import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function UnirseRedirect({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const code = searchParams.code ?? "";
  const dest = `/grupo/unirse${code ? `?code=${code}` : ""}`;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // No autenticado → login con destino final ya resuelto
    redirect(`/login?next=${encodeURIComponent(dest)}`);
  }

  // Verificar si ya completó el onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarded) {
    // Onboarding primero; al terminar va directo al join del grupo
    redirect(`/onboarding?next=${encodeURIComponent(dest)}`);
  }

  // Usuario listo → página de unirse al grupo
  redirect(dest);
}
