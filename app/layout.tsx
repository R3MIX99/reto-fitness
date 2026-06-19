import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const clash = localFont({
  src: "./fonts/ClashGrotesk-Variable.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "200 700",
});

const satoshi = localFont({
  src: "./fonts/Satoshi-Variable.woff2",
  variable: "--font-body",
  display: "swap",
  weight: "300 900",
});

export const metadata: Metadata = {
  title: "Reto Fitness",
  description: "Compite con tus amigos para cumplir metas de gimnasio y dieta",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Reto Fitness",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-theme="dark" className={`${clash.variable} ${satoshi.variable}`}>
      <body className="font-body bg-[var(--color-bg)] text-[var(--color-fg)]">
        {children}
      </body>
    </html>
  );
}
