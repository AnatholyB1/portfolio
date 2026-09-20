import type { Metadata } from "next";
import { translations } from "@/lib/translations";
import { buildFaqJsonLd, buildJsonLdScript } from "@/lib/serviceJsonLd";

// Metadata + FAQPage JSON-LD for /simulateur (Phase 7, SIMU-08).
// This is a Server Component: the JSON-LD <script> must be in the
// server-rendered HTML for crawlers. The sibling page.tsx carries a
// client-only directive for useReveals() and reads copy from the language
// context, resolved only post-hydration — so the server-rendered/crawled
// version of this page is always the hardcoded French source below,
// matching the precedent already established on the root layout.tsx and on
// every /services/[slug] page. Calling useLanguage() here would throw:
// Server Components render outside the client provider tree that
// LanguageContext relies on.
// Unlike /services/[slug], /simulateur has no dynamic segment: this file
// exports a plain metadata constant instead of an async per-params builder,
// needs no static-params generator and never has to reach for a 404 helper.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sevalys.com";

export const metadata: Metadata = {
  title: translations.fr.simulateur.metaTitle,
  description: translations.fr.simulateur.metaDescription,
  alternates: { canonical: "/simulateur" },
  // Deliberately the opposite of src/app/calculateur-roi/layout.tsx's
  // noindex: SIMU-08 requires /simulateur to be crawlable and citable.
  robots: { index: true, follow: true },
  openGraph: {
    title: translations.fr.simulateur.metaTitle,
    description: translations.fr.simulateur.metaDescription,
    type: "website",
    locale: "fr_FR",
    siteName: "Sèvalys",
    url: "/simulateur",
  },
};

export default function SimulateurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = buildFaqJsonLd(
    translations.fr.simulateur.faq,
    `${SITE_URL}/simulateur`
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildJsonLdScript(jsonLd) }}
      />
      {children}
    </>
  );
}
