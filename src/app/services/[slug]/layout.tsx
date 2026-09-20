import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { services, getServiceBySlug } from "@/data/services";
import { translations } from "@/lib/translations";
import { buildFaqJsonLd, buildJsonLdScript } from "@/lib/serviceJsonLd";

// Per-slug metadata + FAQPage JSON-LD for /services/[slug] (Phase 6).
// This is a Server Component: generateMetadata and generateStaticParams are
// Server-Component-only exports in Next.js, and the JSON-LD <script> must be
// in the server-rendered HTML for crawlers. page.tsx stays 'use client' for
// useReveals() and reads copy from the language context, resolved only
// post-hydration — so the server-rendered/crawled version of every page is
// always the hardcoded French source below (the i18n system is client-only,
// post-hydration; see src/app/layout.tsx's precedent of hardcoding its
// global FAQPage JSON-LD).

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
  const copy = translations.fr.services.pages.items[svc.index];

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
    alternates: { canonical: `/services/${slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: copy.metaTitle,
      description: copy.metaDescription,
      type: "website",
      locale: "fr_FR",
      siteName: "Sèvalys",
      url: `/services/${slug}`,
    },
  };
}

export default async function ServiceSlugLayout({ params, children }: Props) {
  const { slug } = await params;
  const svc = getServiceBySlug(slug);
  if (!svc) notFound();
  const copy = translations.fr.services.pages.items[svc.index];

  const jsonLd = buildFaqJsonLd(copy.faq, `${SITE_URL}/services/${slug}`);

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
