import { type NextRequest, NextResponse } from "next/server";

// PROMPT 1 & 2 — Este middleware protegerá rutas con Supabase Auth.
// Por ahora permite todo el tráfico hasta configurar Supabase.
export async function middleware(request: NextRequest) {
  // TODO (PROMPT 1): Instanciar cliente Supabase SSR y verificar sesión.
  // Si no hay sesión y la ruta es privada, redirigir a /login.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
