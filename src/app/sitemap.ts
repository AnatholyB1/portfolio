import type { MetadataRoute } from "next";
import { services } from "@/data/services";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sevalys.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const serviceEntries: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${SITE_URL}/services/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/services`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    ...serviceEntries,
    { url: `${SITE_URL}/simulateur`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/calculateur-roi`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE_URL}/demo`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
