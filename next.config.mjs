// @ts-check
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  // Página de respaldo cuando el usuario navega sin conexión.
  fallbacks: {
    document: "/offline",
  },
  // Los entries con el mismo cacheName que los de fábrica los sustituyen. Solo
  // se les agrega networkTimeoutSeconds: con señal mala, "red primero" esperaba
  // hasta que el navegador se rindiera; ahora a los 3 s sirve la copia guardada.
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    disableDevLogs: true,
    importScripts: ["/sw-custom.js"],
    runtimeCaching: [
      {
        urlPattern: ({ request, url: { pathname }, sameOrigin }) =>
          request.headers.get("RSC") === "1" &&
          request.headers.get("Next-Router-Prefetch") === "1" &&
          sameOrigin &&
          !pathname.startsWith("/api/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-rsc-prefetch",
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        urlPattern: ({ request, url: { pathname }, sameOrigin }) =>
          request.headers.get("RSC") === "1" && sameOrigin && !pathname.startsWith("/api/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-rsc",
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
      {
        urlPattern: ({ url: { pathname }, sameOrigin }) =>
          sameOrigin && !pathname.startsWith("/api/"),
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 },
        },
      },
    ],
  },
});

const securityHeaders = [
  // Impide que el navegador adivine el MIME-type del contenido
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No envía el path completo en el Referer al navegar a otros orígenes
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Cámara y micrófono solo para este origen (grabación de evidencia/audio); geolocalización deshabilitada
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  // CSP: unsafe-inline/eval son necesarios para Next.js, pero se restringe
  // de dónde se pueden cargar imágenes, conectar y embeber frames.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://accounts.google.com",
      "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://*.googleusercontent.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com",
      "font-src 'self'",
      "frame-src https://accounts.google.com",
      "object-src 'none'",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
};

export default withPWA(nextConfig);
