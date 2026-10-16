import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as never)
          );
        },
      },
    }
  );

  // Refresca la sesión (mantiene el token activo) y valida el JWT. Con llaves
  // de firma asimétricas se verifica la firma localmente (sin ir a Supabase en
  // cada navegación, que bloqueaba la pantalla con poca señal); con llaves
  // legacy, getClaims cae a getUser. Aquí solo decide redirecciones: los datos
  // siguen protegidos por RLS y las rutas de API validan con getUser().
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;

  const path = request.nextUrl.pathname;

  // Usuario autenticado visitando landing o login → dashboard
  if (user && (path === "/" || path.startsWith("/login"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Rutas públicas que no requieren sesión
  // /unirse lo manejamos en el server component para poder chequear onboarding
  const publicPaths = ["/login", "/auth/callback", "/privacidad", "/terminos", "/copiar-codigo"];
  const isPublic =
    path === "/" ||
    publicPaths.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    // Preserva la ruta destino (p. ej. /grupo/unirse?code=XXX) para volver
    // ahí después de iniciar sesión con Google.
    const nextPath = path + request.nextUrl.search;
    url.pathname = "/login";
    url.search = "";
    if (nextPath && nextPath !== "/" && !nextPath.startsWith("/login")) {
      url.searchParams.set("next", nextPath);
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
