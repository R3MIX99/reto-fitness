import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import webpush from "web-push";

type LeagueEvent = "invited" | "accepted" | "rejected";

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { leagueId, event } = await req.json() as { leagueId: string; event: LeagueEvent };
  if (!leagueId || !event) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Datos de la liga
  type LeagueRow = { name: string; created_by: string; owner_group_id: string };
  const { data: league } = await admin
    .from("group_leagues")
    .select("name, created_by, owner_group_id")
    .eq("id", leagueId)
    .single() as unknown as { data: LeagueRow | null };
  if (!league) return NextResponse.json({ ok: true });

  // Nombre del grupo dueño (creador de la liga)
  const { data: ownerGroup } = await admin
    .from("groups").select("name").eq("id", league.owner_group_id).single() as unknown as { data: { name: string } | null };
  const ownerGroupName = ownerGroup?.name ?? "un grupo";

  // Nombre de quien ejecuta la acción
  const { data: actor } = await admin
    .from("profiles").select("full_name").eq("id", user.id).single() as unknown as { data: { full_name: string | null } | null };
  const actorName = actor?.full_name ?? "Alguien";

  let targetUser: string;
  let title: string;
  let body: string;

  if (event === "invited") {
    // Notificar al dueño del grupo rival (el que recibió la invitación)
    // Buscar el grupo pendiente en league_participants
    type LPRow = { group_id: string };
    const { data: pending } = await admin
      .from("league_participants")
      .select("group_id")
      .eq("league_id", leagueId)
      .eq("status", "pending")
      .single() as unknown as { data: LPRow | null };
    if (!pending) return NextResponse.json({ ok: true });

    const { data: rivalGroup } = await admin
      .from("groups").select("owner_id").eq("id", pending.group_id).single() as unknown as { data: { owner_id: string } | null };
    if (!rivalGroup) return NextResponse.json({ ok: true });

    targetUser = rivalGroup.owner_id;
    title = "Invitación a liga";
    body = `"${ownerGroupName}" te invita a competir en la liga "${league.name}". Acepta o rechaza en la app.`;
  } else {
    // Notificar al creador de la liga (evento accepted/rejected)
    targetUser = league.created_by;
    if (event === "accepted") {
      title = "Invitación aceptada";
      body = `${actorName} aceptó unirse a "${league.name}". ¡La liga está en marcha!`;
    } else {
      title = "Invitación rechazada";
      body = `${actorName} rechazó unirse a "${league.name}".`;
    }
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;
  if (!publicKey || !privateKey || !email) return NextResponse.json({ ok: true });

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);

  type SubRow = { endpoint: string; p256dh: string; auth: string };
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", targetUser) as unknown as { data: SubRow[] | null };

  if (!subs?.length) return NextResponse.json({ ok: true });

  const payload = JSON.stringify({ title, body, url: "/liga" });
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
