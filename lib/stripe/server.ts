import Stripe from "stripe";

// Cliente Stripe del servidor. La clave vive solo en el entorno (Vercel/.env.local).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
