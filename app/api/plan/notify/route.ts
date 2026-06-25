import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import webpush from "web-push";

// Push al usuario cuando su plan cambia (solo lo dispara el super-admin).
export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Solo el super-admin puede notificar cambios de plan
  const { data: me } = await admin
    .from("profiles").select("is_super_admin").eq("id", user.id).single() as unknown as { data: { is_super_admin: boolean } | null };
  if (!me?.is_super_admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { userId, tier } = await req.json() as { userId: string; tier: "free" | "pro" | "elite" };
  if (!userId || !tier) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

  const label = tier === "elite" ? "Elite" : tier === "pro" ? "Pro" : "Free";
  const title = tier === "free" ? "Tu plan cambió" : "¡Plan mejorado!";
  const body = tier === "free"
    ? "Tu plan ahora es Free. Revisa tus grupos."
    : `Ahora tienes el plan ${label}. ¡Disfruta las nuevas funciones!`;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;
  if (!publicKey || !privateKey || !email) return NextResponse.json({ ok: true });

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);

  type SubRow = { endpoint: string; p256dh: string; auth: string };
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId) as unknown as { data: SubRow[] | null };

  if (!subs?.length) return NextResponse.json({ ok: true });

  const payload = JSON.stringify({ title, body, url: "/perfil" });
  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    )
  );

  return NextResponse.json({ ok: true });
}
