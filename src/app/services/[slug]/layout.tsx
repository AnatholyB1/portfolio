import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { services, getServiceBySlug } from "@/data/services";
import { translations, resolveLangFromAcceptLanguage, LANG_TAG } from "@/lib/translations";
import { buildFaqJsonLd, buildJsonLdScript } from "@/lib/serviceJsonLd";

// Per-slug metadata + FAQPage JSON-LD for /services/[slug] (Phase 6).
// This is a Server Component: generateMetadata and generateStaticParams are
// Server-Component-only exports in Next.js, and the JSON-LD <script> must be
// in the server-rendered HTML for crawlers. page.tsx stays 'use client' for
// useReveals() and reads copy from the language context, resolved only
// post-hydration.
//
// CR-01 (06-REVIEW.md): the server-rendered metadata/JSON-LD below used to be
// hardcoded to `translations.fr` regardless of visitor locale, which
// permanently mismatched the client-rendered page for en/th visitors
// (including Googlebot's default en-US render). It now resolves the locale
// server-side from the request's `Accept-Language` header via
// `resolveLangFromAcceptLanguage`, matching the same fr/th/en precedence
// LanguageContext's `detectBrowserLang()` uses client-side. This is a
// best-effort match (no cookie/URL-based locale yet), not a guarantee: a
// visitor whose stored `portfolio-lang` preference differs from their
// current browser's Accept-Language will still see a client-side switch
// after hydration.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sevalys.com";

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

export async function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const svc = getServiceBySlug(slug);
  if (!svc) return {};
  const lang = resolveLangFromAcceptLanguage((await headers()).get("accept-language"));
  const copy = translations[lang].services.pages.items[svc.index];

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: { canonical: `/services/${slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      type: "website",
      locale: LANG_TAG[lang].replace("-", "_"),
      siteName: "Sèvalys",
      url: `/services/${slug}`,
    },
  };
}

export default async function ServiceSlugLayout({ params, children }: Props) {
  const { slug } = await params;
  const svc = getServiceBySlug(slug);
  if (!svc) notFound();
  const lang = resolveLangFromAcceptLanguage((await headers()).get("accept-language"));
  const copy = translations[lang].services.pages.items[svc.index];

  const jsonLd = buildFaqJsonLd(copy.faq, `${SITE_URL}/services/${slug}`, LANG_TAG[lang]);

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
