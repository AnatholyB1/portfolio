import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sevalys.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Tout le monde, y compris les crawlers d'IA (GPTBot, ClaudeBot,
        // PerplexityBot, Google-Extended…) — on VEUT être référencé par les IA.
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
