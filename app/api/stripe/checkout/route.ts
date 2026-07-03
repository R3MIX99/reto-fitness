import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { planPriceId, seatPriceId, type PaidTier, type Interval } from "@/lib/stripe/prices";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.olympodynami.com";

export async function POST(req: Request) {
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let body: { tier?: PaidTier; interval?: Interval; seats?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Body inválido" }, { status: 400 }); }

  const tier = body.tier;
  const interval = body.interval ?? "month";
  const seats = Math.max(0, Math.floor(body.seats ?? 0));
  if (tier !== "pro" && tier !== "elite") return NextResponse.json({ error: "Tier inválido" }, { status: 400 });

  const planPrice = planPriceId(tier, interval);
  if (!planPrice) return NextResponse.json({ error: "price_not_configured", detail: `${tier}/${interval}` }, { status: 500 });

  const stripe = getStripe();
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Reutiliza el customer de Stripe si ya existe; si no, lo crea y lo guarda.
  const { data: sub } = await admin
    .from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).single() as unknown as {
      data: { stripe_customer_id: string | null } | null };
  let customerId = sub?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("subscriptions").update({ stripe_customer_id: customerId } as never).eq("user_id", user.id);
  }

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price: planPrice, quantity: 1 }];
  if (seats > 0) {
    const seatPrice = seatPriceId(tier, interval);
    if (seatPrice) line_items.push({ price: seatPrice, quantity: seats });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items,
    allow_promotion_codes: true,
    success_url: `${APP_URL}/membresia?checkout=success`,
    cancel_url: `${APP_URL}/membresia?checkout=cancel`,
    subscription_data: { metadata: { user_id: user.id, tier, interval } },
    metadata: { user_id: user.id, tier, interval, seats: String(seats) },
  });

  return NextResponse.json({ url: session.url });
}
