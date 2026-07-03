// Datos de presentación de planes (precios MXN, perks). Deben coincidir con los
// productos creados en Stripe. Compartido por la página /membresia y el
// UpgradeDrawer. NO contiene price IDs (esos viven server-side en prices.ts).

export type PaidTier = "pro" | "elite";
export type Interval = "month" | "year";

export const PRICING: Record<PaidTier, {
  month: number; year: number; seatMonth: number; seatYear: number;
  included: number; groups: number; perks: string[];
}> = {
  pro: {
    month: 99, year: 990, seatMonth: 19, seatYear: 190, included: 10, groups: 5,
    perks: ["5 grupos propios", "10 miembros por grupo", "Retos grupales", "Metas con módulos"],
  },
  elite: {
    month: 199, year: 1990, seatMonth: 15, seatYear: 150, included: 30, groups: 20,
    perks: ["20 grupos propios", "30 miembros por grupo", "Liga entre grupos", "Títulos personalizados", "Recuerdos del Wrapped"],
  },
};

export function money(n: number): string {
  return `$${n.toLocaleString("es-MX")}`;
}
