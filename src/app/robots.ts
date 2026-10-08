import type { MetadataRoute } from "next";
import { PRIVATE_PREFIXES, PRIVATE_SUBPATH_PREFIXES } from "@/lib/privateRoutes";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sevalys.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Tout le monde, y compris les crawlers d'IA (GPTBot, ClaudeBot,
        // PerplexityBot, Google-Extended…) — on VEUT être référencé par les IA.
        // Les zones privées (portail, admin, connexion, auth) sont exclues (D-15).
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", ...PRIVATE_PREFIXES, ...PRIVATE_SUBPATH_PREFIXES],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
