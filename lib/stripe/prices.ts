// Mapa de Price IDs de Stripe (vienen de variables de entorno; no son secretos
// pero los mantenemos server-side). Soporta plan base y add-on de miembro extra,
// en intervalo mensual y anual, para Pro y Elite.

export type Interval = "month" | "year";
export type PaidTier = "pro" | "elite";

const PLAN: Record<PaidTier, Record<Interval, string | undefined>> = {
  pro:   { month: process.env.STRIPE_PRICE_PRO_MONTH,   year: process.env.STRIPE_PRICE_PRO_YEAR },
  elite: { month: process.env.STRIPE_PRICE_ELITE_MONTH, year: process.env.STRIPE_PRICE_ELITE_YEAR },
};

const SEAT: Record<PaidTier, Record<Interval, string | undefined>> = {
  pro:   { month: process.env.STRIPE_PRICE_PRO_SEAT_MONTH,   year: process.env.STRIPE_PRICE_PRO_SEAT_YEAR },
  elite: { month: process.env.STRIPE_PRICE_ELITE_SEAT_MONTH, year: process.env.STRIPE_PRICE_ELITE_SEAT_YEAR },
};

export function planPriceId(tier: PaidTier, interval: Interval): string | undefined {
  return PLAN[tier]?.[interval];
}

export function seatPriceId(tier: PaidTier, interval: Interval): string | undefined {
  return SEAT[tier]?.[interval];
}

// Búsqueda inversa: dado un price id, di a qué tier/intervalo y tipo corresponde.
// Lo usa el webhook para reconstruir el plan desde la suscripción de Stripe.
export function lookupPrice(
  priceId: string,
): { tier: PaidTier; interval: Interval; kind: "plan" | "seat" } | null {
  for (const tier of ["pro", "elite"] as PaidTier[]) {
    for (const interval of ["month", "year"] as Interval[]) {
      if (PLAN[tier][interval] === priceId) return { tier, interval, kind: "plan" };
      if (SEAT[tier][interval] === priceId) return { tier, interval, kind: "seat" };
    }
  }
  return null;
}
