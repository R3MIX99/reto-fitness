import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { subscription, group_id } = body as {
    subscription: PushSubscriptionJSON;
    group_id: string;
  };

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Upsert by endpoint to avoid duplicates
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        group_id: group_id ?? null,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh ?? "",
        auth: subscription.keys?.auth ?? "",
      } as never,
      { onConflict: "endpoint" }
    ) as unknown as { error: unknown };

  if (error) {
    console.error("push_subscriptions upsert error:", error);
    return NextResponse.json({ error: "Error al guardar suscripción" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
