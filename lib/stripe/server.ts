import Stripe from "stripe";

// Cliente Stripe del servidor, perezoso: se instancia en la primera petición,
// NO al cargar el módulo. Así el build de Next no falla cuando STRIPE_SECRET_KEY
// aún no está en el entorno (la clave vive solo en Vercel/.env.local).
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY no está configurada");
    _stripe = new Stripe(key);
  }
  return _stripe;
}
