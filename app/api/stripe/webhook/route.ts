import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { lookupPrice } from "@/lib/stripe/prices";

export const dynamic = "force-dynamic";

function makeAdmin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
type Admin = ReturnType<typeof makeAdmin>;

// Mapea el estado de Stripe a nuestro enum de subscriptions.status.
function mapStatus(s: Stripe.Subscription.Status): "active" | "past_due" | "canceled" {
  if (s === "active" || s === "trialing") return "active";
  if (s === "past_due" || s === "unpaid") return "past_due";
  return "canceled"; // canceled, incomplete, incomplete_expired, paused
}

// Reconstruye tier/intervalo/asientos desde los items de la suscripción.
function planFromSubscription(sub: Stripe.Subscription) {
  let tier: "pro" | "elite" | null = null;
  let interval: "month" | "year" = "month";
  let seats = 0;
  for (const item of sub.items.data) {
    const priceId = item.price.id;
    const info = lookupPrice(priceId);
    if (!info) continue;
    if (info.kind === "plan") { tier = info.tier; interval = info.interval; }
    else if (info.kind === "seat") { seats = item.quantity ?? 0; }
  }
  return { tier, interval, seats };
}

async function syncSubscription(admin: Admin, sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId = sub.metadata?.user_id ?? null;
  const { tier, interval, seats } = planFromSubscription(sub);
  const status = mapStatus(sub.status);
  // En la API nueva, current_period_end vive en cada item (con fallback al tope).
  const rawEnd =
    sub.items.data[0]?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  const periodEnd = rawEnd ? new Date(rawEnd * 1000).toISOString() : null;

  // Si la suscripción ya no está vigente o no reconocemos el plan → Free.
  const isActive = status === "active" || status === "past_due";
  const effectiveTier = isActive && tier ? tier : "free";

  const patch: Record<string, unknown> = {
    tier: effectiveTier,
    status,
    source: "stripe",
    extra_seats: effectiveTier === "free" ? 0 : seats,
    billing_interval: effectiveTier === "free" ? null : interval,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
    current_period_end: periodEnd,
    stripe_customer_id: customerId,
    stripe_subscription_id: effectiveTier === "free" ? null : sub.id,
    updated_at: new Date().toISOString(),
  };

  // Localiza la fila: por user_id (metadata) o por stripe_customer_id.
  if (userId) {
    await admin.from("subscriptions").update(patch as never).eq("user_id", userId);
  } else {
    await admin.from("subscriptions").update(patch as never).eq("stripe_customer_id", customerId);
  }
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "missing_signature_or_secret" }, { status: 400 });

  const stripe = getStripe();
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[stripe webhook] firma inválida:", (err as Error).message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const admin = makeAdmin();

  // Idempotencia: si el evento ya se procesó antes, no repetir.
  const { data: already } = await admin
    .from("stripe_events").select("id").eq("id", event.id).maybeSingle() as unknown as {
      data: { id: string } | null };
  if (already) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          // Asegura el user_id en la metadata de la suscripción (para sync futuros).
          if (!sub.metadata?.user_id && session.metadata?.user_id) {
            await stripe.subscriptions.update(subId, { metadata: { user_id: session.metadata.user_id } });
            sub.metadata = { ...sub.metadata, user_id: session.metadata.user_id };
          }
          await syncSubscription(admin, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(admin, event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // No registramos el evento: Stripe lo reintentará (el sync es idempotente).
    console.error("[stripe webhook] error procesando", event.type, (err as Error).message);
    return NextResponse.json({ error: "processing_error" }, { status: 500 });
  }

  // Registrar solo tras procesar con éxito.
  await admin.from("stripe_events").insert({ id: event.id, type: event.type } as never);
  return NextResponse.json({ received: true });
}
