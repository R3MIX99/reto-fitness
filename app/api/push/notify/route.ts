import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email      = process.env.VAPID_EMAIL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!publicKey || !privateKey || !email) {
    return NextResponse.json({ error: "VAPID no configurado" }, { status: 500 });
  }
  if (!serviceKey) {
    return NextResponse.json({ error: "Service key no configurada" }, { status: 500 });
  }

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);

  const body = await req.json();
  const { user_id, type, title, notif_body, url, metadata } = body as {
    user_id: string;
    type: string;
    title: string;
    notif_body?: string;
    url?: string;
    metadata?: Record<string, unknown>;
  };

  if (!user_id || !title) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  // Use service role to bypass RLS — this runs server-side only
  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. Insert in-app notification — store url inside metadata so taps navigate correctly
  await supabase.from("notifications").insert({
    user_id,
    type,
    title,
    body: notif_body ?? null,
    read: false,
    metadata: { ...(metadata ?? {}), url: url ?? null },
  });

  // 2. Fetch push subscriptions for this user
  type SubRow = { endpoint: string; p256dh: string; auth: string };
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user_id) as unknown as { data: SubRow[] | null };

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const payload = JSON.stringify({ title, body: notif_body ?? "", url: url ?? "/" });

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent });
}
