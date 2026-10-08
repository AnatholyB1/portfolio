import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sèvalys — Agence digitale · Sites, outils sur mesure & IA",
    short_name: "Sèvalys",
    description:
      "Agence digitale à Tours : sites et lead magnets qui convertissent, outils de gestion sur mesure, intégrations IA.",
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
