import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sèvalys — Agence IA · Agents vocaux & automatisations",
    short_name: "Sèvalys",
    description:
      "Agence IA à Tours : agents vocaux téléphoniques 24/7, automatisations métier et sites qui convertissent. Optimisation business par l'IA.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0B0C",
    theme_color: "#0A0B0C",
    lang: "fr-FR",
    dir: "ltr",
    categories: ["business", "productivity", "technology"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
