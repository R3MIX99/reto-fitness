import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import webpush from "web-push";

export async function POST(req: NextRequest) {
  // Identify the caller (the person who just joined)
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

  // Use service role to bypass RLS for all lookups
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get group info (name + owner)
  type GroupRow = { name: string; owner_id: string };
  const { data: group } = await admin
    .from("groups")
    .select("name, owner_id")
    .eq("id", group_id)
    .single() as unknown as { data: GroupRow | null };

  if (!group) return NextResponse.json({ error: "Grupo no encontrado" }, { status: 404 });

  // Don't notify if the joiner IS the owner
  if (group.owner_id === user.id) return NextResponse.json({ ok: true, skipped: true });

  // Get joiner's display name from profiles table
  type ProfileRow = { full_name: string | null };
  const { data: joinerProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single() as unknown as { data: ProfileRow | null };

  const joinerName = joinerProfile?.full_name ?? user.user_metadata?.full_name ?? "Alguien";

  // Insert in-app notification for the owner
  await admin.from("notifications").insert({
    user_id: group.owner_id,
    type: "new_member",
    title: "Nuevo miembro en tu grupo",
    body: `${joinerName} se unió a "${group.name}".`,
    read: false,
    metadata: { group_id, joiner_id: user.id, url: `/grupo?joined=${group_id}` },
  });

  // Send push notification to owner's devices
  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email      = process.env.VAPID_EMAIL;

  if (publicKey && privateKey && email) {
    webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);

    type SubRow = { endpoint: string; p256dh: string; auth: string };
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", group.owner_id) as unknown as { data: SubRow[] | null };

    if (subs?.length) {
      const payload = JSON.stringify({
        title: "Nuevo miembro en tu grupo",
        body: `${joinerName} se unió a "${group.name}".`,
        url: `/grupo?joined=${group_id}`,
      });
      await Promise.allSettled(
        subs.map((s) =>
          webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload
          )
        )
      );
    }
  }

  return NextResponse.json({ ok: true });
}
