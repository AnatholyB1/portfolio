import type { NextConfig } from "next";

// Origines PostHog (seul tiers appelé par le navigateur : fetch + chargement différé de scripts).
// Inventaire : pas de Supabase/Stripe/Resend côté navigateur (serveur uniquement), polices
// auto-hébergées par next/font, images locales, JSON-LD inline, iframes d'aperçu PDF en blob:.
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
const posthogAssetsHost = posthogHost.replace(".i.posthog.com", "-assets.i.posthog.com");

// CSP déployée en Report-Only : Next injecte des scripts inline (hydratation, JSON-LD) sans
// nonce, donc script-src garde 'unsafe-inline'. On observe les violations en prod avant de
// passer en Content-Security-Policy (enforcing). frame-ancestors est déjà appliqué via
// X-Frame-Options.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${posthogAssetsHost}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${posthogHost} ${posthogAssetsHost}`,
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "media-src 'self' blob: data:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Rendu PDF côté serveur Node uniquement (phase 13)
  serverExternalPackages: ['@react-pdf/renderer'],
  // D-15 : zones privées jamais indexées (en plus de robots.txt).
  // Sources littérales, couvertes par un test contre PRIVATE_PREFIXES.
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    const privateRules = [
      "/espace-client/:path*",
      "/espace-client",
      "/admin/:path*",
      "/admin",
      "/connexion",
      "/desinscription",
      "/auth/:path*",
      "/avis/:path+",
    ].map((source) => ({ source, headers: noindex }));
    return [{ source: "/:path*", headers: securityHeaders }, ...privateRules];
  },
};

export default nextConfig;
