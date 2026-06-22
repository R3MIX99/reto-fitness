import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import webpush from "web-push";

// Envía push a todos los miembros de la temporada avisando que se terminó
// anticipadamente. La notificación in-app + el cambio de estado ya los hace
// el RPC cancel_season; aquí solo entregamos el push.
export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { seasonId } = await req.json() as { seasonId: string };
  if (!seasonId) return NextResponse.json({ error: "Falta seasonId" }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  type SeasonRow = { name: string; cancel_reason: string | null; status: string };
  const { data: season } = await admin
    .from("seasons")
    .select("name, cancel_reason, status")
    .eq("id", seasonId)
    .single() as unknown as { data: SeasonRow | null };

  if (!season || season.status !== "cancelled") {
    return NextResponse.json({ ok: true }); // nada que enviar
  }

  const reason = season.cancel_reason?.trim() || "sin razón especificada";

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;
  if (!publicKey || !privateKey || !email) return NextResponse.json({ ok: true });

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);

  type MemberRow = { user_id: string };
  const { data: members } = await admin
    .from("season_members")
    .select("user_id")
    .eq("season_id", seasonId) as unknown as { data: MemberRow[] | null };

  const memberIds = (members ?? []).map((m) => m.user_id);
  if (!memberIds.length) return NextResponse.json({ ok: true });

  type SubRow = { user_id: string; endpoint: string; p256dh: string; auth: string };
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", memberIds) as unknown as { data: SubRow[] | null };

  if (!subs?.length) return NextResponse.json({ ok: true });

  const payload = JSON.stringify({
    title: "Temporada cancelada",
    body: `Se terminó "${season.name}" antes de tiempo: ${reason}`,
    url: "/grupo",
  });

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
