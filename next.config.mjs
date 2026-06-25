// @ts-check
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    importScripts: ["/sw-custom.js"],
  },
});

const securityHeaders = [
  // Impide que el navegador adivine el MIME-type del contenido
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No envía el path completo en el Referer al navegar a otros orígenes
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deshabilita micrófono y geolocalización; cámara solo para este origen
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
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
