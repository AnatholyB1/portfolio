import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BRICON ANATHOLY — Agence digitale",
    short_name: "BRICON",
    description:
      "Sites web, outils de gestion et agents IA pour PME locales. Basé à Tours, France.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0B0C",
    theme_color: "#C4F542",
    categories: ["business", "productivity", "technology"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
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
