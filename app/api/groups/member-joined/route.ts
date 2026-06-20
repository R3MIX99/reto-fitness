import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import webpush from "web-push";

// eslint-disable-next-line -- supabase admin client needs loose generic
type AdminClient = ReturnType<typeof createAdminClient<object>>;

async function sendPush(admin: AdminClient, userId: string, title: string, body: string, url: string) {
  type SubRow = { endpoint: string; p256dh: string; auth: string };
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId) as unknown as { data: SubRow[] | null };

  if (!subs?.length) return;
  const payload = JSON.stringify({ title, body, url });
  await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    )
  );
}

async function insertNotif(
  admin: AdminClient,
  userId: string,
  type: string,
  title: string,
  body: string,
  metadata: Record<string, unknown>
) {
  await admin.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    read: false,
    metadata,
  } as never);
}

export async function POST(req: NextRequest) {
  // Identify the caller from the session cookie
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { group_id } = await req.json() as { group_id: string };
  if (!group_id) return NextResponse.json({ error: "group_id requerido" }, { status: 400 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as AdminClient;

  // Fetch group name + owner (service_role bypasses RLS)
  type GroupRow = { name: string; owner_id: string };
  const { data: group } = await admin
    .from("groups")
    .select("name, owner_id")
    .eq("id", group_id)
    .single() as unknown as { data: GroupRow | null };

  if (!group) return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });

  // Fetch joiner's real display name from profiles
  type ProfileRow = { full_name: string | null };
  const { data: joinerProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single() as unknown as { data: ProfileRow | null };

  const joinerName = joinerProfile?.full_name ?? (user.user_metadata as { full_name?: string } | undefined)?.full_name ?? "Alguien";
  const groupUrl = `/grupo?joined=${group_id}`;

  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL;
  const vapidOk = !!(publicKey && privateKey && vapidEmail);
  if (vapidOk) webpush.setVapidDetails(`mailto:${vapidEmail}`, publicKey!, privateKey!);

  // 1. Notify joiner: "you joined a group"
  await insertNotif(admin, user.id, "joined_group", "Te uniste a un grupo", `Ahora formas parte de "${group.name}".`, { group_id, url: groupUrl });
  if (vapidOk) await sendPush(admin, user.id, "Te uniste a un grupo", `Ahora formas parte de "${group.name}".`, groupUrl);

  // 2. Notify owner: "someone joined your group" (only if joiner ≠ owner)
  if (group.owner_id !== user.id) {
    await insertNotif(admin, group.owner_id, "new_member", "Nuevo jugador en tu grupo", `${joinerName} se unió a "${group.name}".`, { group_id, joiner_id: user.id, url: groupUrl });
    if (vapidOk) await sendPush(admin, group.owner_id, "Nuevo jugador en tu grupo", `${joinerName} se unió a "${group.name}".`, groupUrl);
  }

  return NextResponse.json({ ok: true });
}
