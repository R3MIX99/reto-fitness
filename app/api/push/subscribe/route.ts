import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { subscription, group_id } = body as {
    subscription: PushSubscriptionJSON;
    group_id?: string | null;
  };

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
  }

  // Verify session
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (!user) {
    console.error("[push/subscribe] auth error:", authError);
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("[push/subscribe] SUPABASE_SERVICE_ROLE_KEY not set");
    return NextResponse.json({ error: "Service key no configurada" }, { status: 500 });
  }

  // Use service_role to bypass RLS for the upsert
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const { error } = await admin
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
    console.error("[push/subscribe] upsert error:", JSON.stringify(error));
    return NextResponse.json({ error: "Error al guardar suscripción", detail: JSON.stringify(error) }, { status: 500 });
  }

  console.log("[push/subscribe] saved for user:", user.id);
  return NextResponse.json({ ok: true });
}
