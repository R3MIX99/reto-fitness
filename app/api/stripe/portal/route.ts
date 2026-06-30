import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getStripe } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.olympodynami.com";

export async function POST() {
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: sub } = await admin
    .from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).single() as unknown as {
      data: { stripe_customer_id: string | null } | null };

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: "no_customer" }, { status: 400 });
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${APP_URL}/perfil`,
  });

  return NextResponse.json({ url: session.url });
}
