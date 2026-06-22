import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import webpush from "web-push";

type SeasonEvent = "start" | "cancelled" | "scheduled_cancelled";

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
function fmtDate(d: string): string {
  const dt = new Date(d + "T12:00:00");
  return `${dt.getDate()} de ${MESES[dt.getMonth()]}`;
}
function todayMX(): string {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(new Date()); // YYYY-MM-DD
}

// Envía push (best-effort) a los miembros de una temporada según el evento.
// La notificación in-app la generan los RPCs; aquí solo entregamos el push.
// Para 'scheduled_cancelled' el cliente debe llamar ANTES de borrar la temporada.
export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { seasonId, event } = await req.json() as { seasonId: string; event: SeasonEvent };
  if (!seasonId || !event) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  type SeasonRow = { name: string; start_date: string; cancel_reason: string | null };
  const { data: season } = await admin
    .from("seasons")
    .select("name, start_date, cancel_reason")
    .eq("id", seasonId)
    .single() as unknown as { data: SeasonRow | null };

  if (!season) return NextResponse.json({ ok: true });

  let title: string;
  let body: string;
  if (event === "start") {
    title = "Nueva temporada";
    body = season.start_date > todayMX()
      ? `Se programó "${season.name}". Empieza el ${fmtDate(season.start_date)}.`
      : `¡Empezó la temporada "${season.name}"!`;
  } else if (event === "scheduled_cancelled") {
    title = "Temporada cancelada";
    body = `Se canceló la temporada programada "${season.name}".`;
  } else {
    title = "Temporada cancelada";
    const reason = season.cancel_reason?.trim() || "sin razón especificada";
    body = `Se terminó "${season.name}" antes de tiempo: ${reason}`;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;
  if (!publicKey || !privateKey || !email) return NextResponse.json({ ok: true });

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);

  // Miembros: para temporadas con snapshot usamos season_members; si ya se
  // borró (no debería en este flujo), no hay a quién enviar.
  type MemberRow = { user_id: string };
  const { data: members } = await admin
    .from("season_members")
    .select("user_id")
    .eq("season_id", seasonId) as unknown as { data: MemberRow[] | null };

  const memberIds = (members ?? []).map((m) => m.user_id).filter((id) => id !== user.id);
  if (!memberIds.length) return NextResponse.json({ ok: true });

  type SubRow = { endpoint: string; p256dh: string; auth: string };
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", memberIds) as unknown as { data: SubRow[] | null };

  if (!subs?.length) return NextResponse.json({ ok: true });

  const payload = JSON.stringify({ title, body, url: "/grupo" });
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
